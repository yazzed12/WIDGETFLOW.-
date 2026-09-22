begin;

do $guard$
begin
  if not exists (select 1 from private.widgetflow_schema_migrations where id = '086_authoritative_signature_assignment_contract') then
    raise exception 'WidgetFlow migration 086_authoritative_signature_assignment_contract must be applied first';
  end if;
  if exists (select 1 from private.widgetflow_schema_migrations where id = '087_signature_role_directory_and_effective_role_hardening') then
    raise exception 'WidgetFlow migration 087_signature_role_directory_and_effective_role_hardening has already been applied';
  end if;
end
$guard$;

create or replace function public.list_signature_role_directory()
returns table(role_key text, role_name text, role_type text)
language sql stable security definer set search_path = ''
as $function$
  select r.key, r.name, r.role_type
  from public.roles r
  where private.current_user_is_active()
    and (private.current_user_has_permission('reports.edit_draft') or private.current_user_has_permission('templates.create'))
    and r.is_active
    and r.role_type in ('System', 'Custom')
    and not coalesce(r.is_protected, false)
  order by r.name, r.key
$function$;

revoke all on function public.list_signature_role_directory() from public, anon;
grant execute on function public.list_signature_role_directory() to authenticated;

create or replace function private.validate_sender_signature_roles(p_report_id uuid)
returns void language plpgsql security definer set search_path = ''
as $function$
declare
  report_row public.reports%rowtype;
  version_row public.template_versions%rowtype;
  field_row record;
  effective jsonb;
  required_role_key text;
  cursor_key text := '';
begin
  select * into report_row from public.reports where id = p_report_id;
  if not found then return; end if;
  select * into version_row from public.template_versions where id = report_row.template_version_id and template_id = report_row.template_id;
  if not found or version_row.schema_snapshot is null then return; end if;
  loop
    with recursive snapshot_nodes(value) as (
      select version_row.schema_snapshot
      union all
      select child.value from snapshot_nodes node cross join lateral (
        select a.value from jsonb_array_elements(case when jsonb_typeof(node.value) = 'array' then node.value else '[]'::jsonb end) a(value)
        union all select o.value from jsonb_each(case when jsonb_typeof(node.value) = 'object' then node.value else '{}'::jsonb end) o(key,value)
      ) child
    )
    select coalesce(nullif(pg_catalog.btrim(value ->> 'field_key'), ''), nullif(pg_catalog.btrim(value ->> 'key'), ''), nullif(pg_catalog.btrim(value #>> '{configuration,field_key}'), ''), nullif(pg_catalog.btrim(value #>> '{configuration,key}'), '')) as field_key
    into field_row
    from snapshot_nodes
    where jsonb_typeof(value) = 'object'
      and lower(coalesce(value ->> 'type', value ->> 'field_type', value #>> '{configuration,type}', value #>> '{configuration,field_type}', '')) = 'signature'
      and lower(coalesce(value #>> '{signatureConfig,signatureRole}', value ->> 'signatureRole', value #>> '{configuration,signatureConfig,signatureRole}', value #>> '{configuration,signatureRole}', '')) = 'sender'
      and coalesce(nullif(pg_catalog.btrim(value ->> 'field_key'), ''), nullif(pg_catalog.btrim(value ->> 'key'), ''), nullif(pg_catalog.btrim(value #>> '{configuration,field_key}'), ''), nullif(pg_catalog.btrim(value #>> '{configuration,key}'), '')) > cursor_key
    order by field_key limit 1;
    exit when not found;
    cursor_key := field_row.field_key;
    effective := private.report_effective_signature_configuration(p_report_id, field_row.field_key);
    required_role_key := nullif(pg_catalog.btrim(effective ->> 'requiredRoleKey'), '');
    if required_role_key is not null and not private.signature_user_has_required_role(auth.uid(), required_role_key) then
      raise exception 'SIGNATURE_REQUIRED_ROLE_MISMATCH:%', field_row.field_key;
    end if;
  end loop;
end
$function$;

create or replace function public.complete_report(
  p_report_id uuid,
  p_title text default null,
  p_values jsonb default null
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  report_row public.reports%rowtype;
  version_row public.template_versions%rowtype;
  field_row record;
  configuration_row public.report_signature_configurations%rowtype;
  configuration_found boolean;
  effective jsonb;
  cursor_key text := '';
begin
  if not private.current_user_is_active()
     or not private.current_user_has_permission('reports.view_own')
     or not private.current_user_has_permission('reports.complete') then raise exception 'FORBIDDEN'; end if;
  select * into report_row from public.reports where id = p_report_id for update;
  if not found then raise exception 'REPORT_NOT_COMPLETABLE'; end if;
  select * into version_row from public.template_versions where id = report_row.template_version_id and template_id = report_row.template_id;
  if not found then raise exception 'REPORT_TEMPLATE_VERSION_MISSING'; end if;
  loop
    with recursive snapshot_nodes(value) as (
      select version_row.schema_snapshot
      union all
      select child.value from snapshot_nodes node cross join lateral (
        select a.value from jsonb_array_elements(case when jsonb_typeof(node.value) = 'array' then node.value else '[]'::jsonb end) a(value)
        union all select o.value from jsonb_each(case when jsonb_typeof(node.value) = 'object' then node.value else '{}'::jsonb end) o(key,value)
      ) child
    )
    select coalesce(nullif(pg_catalog.btrim(value ->> 'field_key'), ''), nullif(pg_catalog.btrim(value ->> 'key'), ''), nullif(pg_catalog.btrim(value #>> '{configuration,field_key}'), ''), nullif(pg_catalog.btrim(value #>> '{configuration,key}'), '')) as field_key
    into field_row
    from snapshot_nodes
    where jsonb_typeof(value) = 'object'
      and lower(coalesce(value ->> 'type', value ->> 'field_type', value #>> '{configuration,type}', value #>> '{configuration,field_type}', '')) = 'signature'
      and lower(coalesce(value #>> '{signatureConfig,assignmentPolicy}', value ->> 'assignmentPolicy', value #>> '{configuration,signatureConfig,assignmentPolicy}', value #>> '{configuration,assignmentPolicy}', 'fixed')) = 'report_creator_required'
      and coalesce(nullif(pg_catalog.btrim(value ->> 'field_key'), ''), nullif(pg_catalog.btrim(value ->> 'key'), ''), nullif(pg_catalog.btrim(value #>> '{configuration,field_key}'), ''), nullif(pg_catalog.btrim(value #>> '{configuration,key}'), '')) > cursor_key
    order by field_key limit 1;
    exit when not found;
    cursor_key := field_row.field_key;
    select * into configuration_row from public.report_signature_configurations where report_id = p_report_id and signature_field_key = field_row.field_key;
    configuration_found := found;
    effective := private.report_effective_signature_configuration(p_report_id, field_row.field_key);
    if not configuration_found or configuration_row.is_override is not true
       or effective is null
       or nullif(pg_catalog.btrim(effective ->> 'requiredRoleKey'), '') is null
       or not exists (select 1 from public.roles ro where ro.key = effective ->> 'requiredRoleKey' and ro.is_active) then
      raise exception 'SIGNATURE_CONFIGURATION_REQUIRED:%', field_row.field_key;
    end if;
  end loop;
  return private.complete_report_085_legacy(p_report_id, p_title, p_values);
end
$function$;

revoke all on function private.validate_sender_signature_roles(uuid) from public, anon, authenticated, service_role;
revoke all on function public.complete_report(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.complete_report(uuid,text,jsonb) to authenticated;

insert into private.widgetflow_schema_migrations (id, description)
values ('087_signature_role_directory_and_effective_role_hardening', 'Authorized signature role directory and effective-role enforcement corrections');

commit;
