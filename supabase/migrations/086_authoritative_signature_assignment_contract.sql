begin;

do $migration_guard$
begin
  if not exists (select 1 from private.widgetflow_schema_migrations where id = '085_template_workflow_notifications') then
    raise exception 'WidgetFlow migration 085_template_workflow_notifications must be applied first';
  end if;
  if exists (select 1 from private.widgetflow_schema_migrations where id = '086_authoritative_signature_assignment_contract') then
    raise exception 'WidgetFlow migration 086_authoritative_signature_assignment_contract has already been applied';
  end if;
end
$migration_guard$;

/* Workflow configuration is separate from report_values, which is reserved
 * for business values materialised from the immutable template snapshot. */
create table public.report_signature_configurations (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  signature_field_key text not null,
  signature_role text not null,
  required_role_key text,
  assignment_policy text not null default 'fixed',
  is_override boolean not null default true,
  created_at timestamptz not null default pg_catalog.statement_timestamp(),
  updated_at timestamptz not null default pg_catalog.statement_timestamp(),
  constraint report_signature_configurations_field_key_not_blank_chk check (pg_catalog.btrim(signature_field_key) <> ''),
  constraint report_signature_configurations_role_chk check (lower(pg_catalog.btrim(signature_role)) in ('sender', 'receiver')),
  constraint report_signature_configurations_policy_chk check (assignment_policy in ('fixed', 'default_override_allowed', 'report_creator_required')),
  constraint report_signature_configurations_required_role_not_blank_chk check (required_role_key is null or pg_catalog.btrim(required_role_key) <> ''),
  constraint report_signature_configurations_report_field_uid unique (report_id, signature_field_key)
);

create index report_signature_configurations_report_idx on public.report_signature_configurations (report_id, updated_at desc);
alter table public.report_signature_configurations enable row level security;
revoke all on table public.report_signature_configurations from anon, authenticated;
grant select on table public.report_signature_configurations to authenticated;

create policy report_signature_configurations_read_visible_report
on public.report_signature_configurations
for select to authenticated
using (private.current_user_can_read_report(report_id));

/* Immutable template default plus an optional report-owned override. */
create or replace function private.report_effective_signature_configuration(
  p_report_id uuid,
  p_signature_field_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  report_row public.reports%rowtype;
  version_row public.template_versions%rowtype;
  field_row record;
  override_row public.report_signature_configurations%rowtype;
  raw_required_role text;
  normalized_required_role text;
  override_found boolean := false;
begin
  if p_report_id is null or nullif(pg_catalog.btrim(p_signature_field_key), '') is null then return null; end if;
  select * into report_row from public.reports where id = p_report_id;
  if not found then return null; end if;
  select * into version_row from public.template_versions where id = report_row.template_version_id and template_id = report_row.template_id;
  if not found or version_row.schema_snapshot is null then return null; end if;

  with recursive snapshot_nodes(value) as (
    select version_row.schema_snapshot
    union all
    select child.value
    from snapshot_nodes node
    cross join lateral (
      select a.value from jsonb_array_elements(case when jsonb_typeof(node.value) = 'array' then node.value else '[]'::jsonb end) a(value)
      union all
      select o.value from jsonb_each(case when jsonb_typeof(node.value) = 'object' then node.value else '{}'::jsonb end) o(key,value)
    ) child
  )
  select
    coalesce(nullif(pg_catalog.btrim(value ->> 'field_key'), ''), nullif(pg_catalog.btrim(value ->> 'key'), ''), nullif(pg_catalog.btrim(value #>> '{configuration,field_key}'), ''), nullif(pg_catalog.btrim(value #>> '{configuration,key}'), '')) as field_key,
    lower(coalesce(value ->> 'type', value ->> 'field_type', value #>> '{configuration,type}', value #>> '{configuration,field_type}', '')) as field_type,
    lower(coalesce(value #>> '{signatureConfig,signatureRole}', value ->> 'signatureRole', value #>> '{configuration,signatureConfig,signatureRole}', value #>> '{configuration,signatureRole}', '')) as signature_role,
    nullif(pg_catalog.btrim(coalesce(value #>> '{signatureConfig,requiredRole}', value ->> 'requiredRole', value #>> '{configuration,signatureConfig,requiredRole}', value #>> '{configuration,requiredRole}', '')), '') as required_role,
    case lower(coalesce(value #>> '{signatureConfig,assignmentPolicy}', value ->> 'assignmentPolicy', value #>> '{configuration,signatureConfig,assignmentPolicy}', value #>> '{configuration,assignmentPolicy}', 'fixed'))
      when 'fixed' then 'fixed'
      when 'default_override_allowed' then 'default_override_allowed'
      when 'report_creator_required' then 'report_creator_required'
      else 'fixed'
    end as assignment_policy
  into field_row
  from snapshot_nodes
  where jsonb_typeof(value) = 'object'
    and coalesce(nullif(pg_catalog.btrim(value ->> 'field_key'), ''), nullif(pg_catalog.btrim(value ->> 'key'), ''), nullif(pg_catalog.btrim(value #>> '{configuration,field_key}'), ''), nullif(pg_catalog.btrim(value #>> '{configuration,key}'), '')) = pg_catalog.btrim(p_signature_field_key)
  limit 1;

  if not found or field_row.field_type <> 'signature' then return null; end if;
  raw_required_role := field_row.required_role;
  if raw_required_role is not null then
    select ro.key into normalized_required_role
    from public.roles ro
    where ro.is_active and (ro.key = raw_required_role or lower(ro.name) = lower(raw_required_role) or ro.id::text = raw_required_role)
    order by case when ro.key = raw_required_role then 0 else 1 end, ro.key limit 1;
    normalized_required_role := coalesce(normalized_required_role, raw_required_role);
  end if;

  select * into override_row from public.report_signature_configurations where report_id = p_report_id and signature_field_key = pg_catalog.btrim(p_signature_field_key);
  override_found := found;
  return jsonb_build_object(
    'reportId', p_report_id,
    'signatureFieldKey', pg_catalog.btrim(p_signature_field_key),
    'signatureRole', lower(coalesce(case when override_found then override_row.signature_role end, field_row.signature_role)),
    'requiredRoleKey', case when override_found then override_row.required_role_key else normalized_required_role end,
    'assignmentPolicy', coalesce(case when override_found then override_row.assignment_policy end, field_row.assignment_policy, 'fixed'),
    'inherited', not override_found,
    'isOverride', override_found
  );
end
$function$;

revoke all on function private.report_effective_signature_configuration(uuid,text) from public, anon, authenticated, service_role;

create or replace function private.signature_user_has_required_role(p_user_id uuid, p_required_role_key text)
returns boolean
language sql
security definer
set search_path = ''
as $function$
  select exists (
    select 1 from public.profiles p join public.roles ro on ro.id = p.role_id
    where p.id = p_user_id and p.status = 'Active' and ro.is_active and ro.key = p_required_role_key
  )
$function$;

revoke all on function private.signature_user_has_required_role(uuid,text) from public, anon, authenticated, service_role;

create or replace function private.validate_sender_signature_roles(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  report_row public.reports%rowtype;
  version_row public.template_versions%rowtype;
  actor_role_key text;
  field_row record;
  required_role_key text;
  cursor_key text := '';
begin
  select role_key into actor_role_key from private.report_actor();
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
    select
      coalesce(nullif(pg_catalog.btrim(value ->> 'field_key'), ''), nullif(pg_catalog.btrim(value ->> 'key'), ''), nullif(pg_catalog.btrim(value #>> '{configuration,field_key}'), ''), nullif(pg_catalog.btrim(value #>> '{configuration,key}'), '')) as field_key,
      nullif(pg_catalog.btrim(coalesce(value #>> '{signatureConfig,requiredRole}', value ->> 'requiredRole', value #>> '{configuration,signatureConfig,requiredRole}', value #>> '{configuration,requiredRole}', '')), '') as required_role
    into field_row
    from snapshot_nodes
    where jsonb_typeof(value) = 'object'
      and lower(coalesce(value ->> 'type', value ->> 'field_type', value #>> '{configuration,type}', value #>> '{configuration,field_type}', '')) = 'signature'
      and lower(coalesce(value #>> '{signatureConfig,signatureRole}', value ->> 'signatureRole', value #>> '{configuration,signatureConfig,signatureRole}', value #>> '{configuration,signatureRole}', '')) = 'sender'
      and coalesce(nullif(pg_catalog.btrim(value ->> 'field_key'), ''), nullif(pg_catalog.btrim(value ->> 'key'), ''), nullif(pg_catalog.btrim(value #>> '{configuration,field_key}'), ''), nullif(pg_catalog.btrim(value #>> '{configuration,key}'), '')) > cursor_key
    order by field_key limit 1;
    exit when not found;
    cursor_key := field_row.field_key;
    if field_row.required_role is not null then
      select ro.key into required_role_key
      from public.roles ro
      where ro.is_active and (ro.key = field_row.required_role or lower(ro.name) = lower(field_row.required_role) or ro.id::text = field_row.required_role)
      order by case when ro.key = field_row.required_role then 0 else 1 end, ro.key limit 1;
      if required_role_key is null or actor_role_key <> required_role_key then
        raise exception 'SIGNATURE_REQUIRED_ROLE_MISMATCH:%', field_row.field_key;
      end if;
    end if;
  end loop;
end
$function$;

revoke all on function private.validate_sender_signature_roles(uuid) from public, anon, authenticated, service_role;

create or replace function public.set_report_signature_configuration(
  p_report_id uuid,
  p_signature_field_key text,
  p_signature_role text,
  p_required_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  report_row public.reports%rowtype;
  effective jsonb;
  canonical_role text;
  input_required_role text;
  canonical_required_role text;
begin
  if not private.current_user_is_active()
     or not private.current_user_has_permission('reports.view_own')
     or not private.current_user_has_permission('reports.edit_draft') then
    raise exception 'FORBIDDEN';
  end if;

  select * into report_row from public.reports where id = p_report_id for update;
  if not found or report_row.created_by_user_id <> auth.uid()
     or report_row.status <> 'draft'
     or report_row.current_send_cycle_id is not null
     or report_row.locked_at is not null
     or report_row.sent_at is not null then
    raise exception 'REPORT_SIGNATURE_CONFIGURATION_NOT_EDITABLE';
  end if;

  effective := private.report_effective_signature_configuration(p_report_id, p_signature_field_key);
  if effective is null then raise exception 'SIGNATURE_FIELD_NOT_FOUND:%', p_signature_field_key; end if;
  canonical_role := lower(pg_catalog.btrim(coalesce(p_signature_role, effective ->> 'signatureRole')));
  if canonical_role not in ('sender', 'receiver') or canonical_role <> lower(effective ->> 'signatureRole') then
    raise exception 'SIGNATURE_ROLE_IMMUTABLE';
  end if;
  if effective ->> 'assignmentPolicy' = 'fixed' then raise exception 'SIGNATURE_CONFIGURATION_FIXED'; end if;

  input_required_role := nullif(pg_catalog.btrim(p_required_role), '');
  if input_required_role is not null then
    select ro.key into canonical_required_role
    from public.roles ro
    where ro.is_active and (ro.key = input_required_role or lower(ro.name) = lower(input_required_role) or ro.id::text = input_required_role)
    order by case when ro.key = input_required_role then 0 else 1 end, ro.key limit 1;
    if canonical_required_role is null then raise exception 'SIGNATURE_REQUIRED_ROLE_NOT_FOUND'; end if;
  end if;

  insert into public.report_signature_configurations(
    report_id, signature_field_key, signature_role, required_role_key,
    assignment_policy, is_override, updated_at
  ) values (
    p_report_id, pg_catalog.btrim(p_signature_field_key), canonical_role,
    canonical_required_role, effective ->> 'assignmentPolicy', true, statement_timestamp()
  )
  on conflict (report_id, signature_field_key) do update set
    signature_role = excluded.signature_role,
    required_role_key = excluded.required_role_key,
    assignment_policy = excluded.assignment_policy,
    is_override = true,
    updated_at = statement_timestamp();

  return private.report_effective_signature_configuration(p_report_id, p_signature_field_key);
end
$function$;

create or replace function public.reset_report_signature_configuration(
  p_report_id uuid,
  p_signature_field_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  report_row public.reports%rowtype;
begin
  if not private.current_user_is_active()
     or not private.current_user_has_permission('reports.view_own')
     or not private.current_user_has_permission('reports.edit_draft') then
    raise exception 'FORBIDDEN';
  end if;
  select * into report_row from public.reports where id = p_report_id for update;
  if not found or report_row.created_by_user_id <> auth.uid()
     or report_row.status <> 'draft'
     or report_row.current_send_cycle_id is not null
     or report_row.locked_at is not null
     or report_row.sent_at is not null then
    raise exception 'REPORT_SIGNATURE_CONFIGURATION_NOT_EDITABLE';
  end if;
  if private.report_effective_signature_configuration(p_report_id, p_signature_field_key) is null then
    raise exception 'SIGNATURE_FIELD_NOT_FOUND:%', p_signature_field_key;
  end if;
  delete from public.report_signature_configurations
  where report_id = p_report_id and signature_field_key = pg_catalog.btrim(p_signature_field_key);
  return private.report_effective_signature_configuration(p_report_id, p_signature_field_key);
end
$function$;

revoke all on function public.set_report_signature_configuration(uuid,text,text,text) from public, anon;
revoke all on function public.reset_report_signature_configuration(uuid,text) from public, anon;
grant execute on function public.set_report_signature_configuration(uuid,text,text,text) to authenticated;
grant execute on function public.reset_report_signature_configuration(uuid,text) to authenticated;

/* Keep the canonical lifecycle body intact behind a narrow validation wrapper. */
alter function public.complete_report(uuid,text,jsonb) set schema private;
alter function private.complete_report(uuid,text,jsonb) rename to complete_report_085_legacy;

create or replace function public.complete_report(
  p_report_id uuid,
  p_title text default null,
  p_values jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  report_row public.reports%rowtype;
  version_row public.template_versions%rowtype;
  field_row record;
  effective jsonb;
  cursor_key text := '';
begin
  if not private.current_user_is_active()
     or not private.current_user_has_permission('reports.view_own')
     or not private.current_user_has_permission('reports.complete') then
    raise exception 'FORBIDDEN';
  end if;
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
    effective := private.report_effective_signature_configuration(p_report_id, field_row.field_key);
    if effective is null or nullif(pg_catalog.btrim(effective ->> 'requiredRoleKey'), '') is null
       or not exists (select 1 from public.roles ro where ro.key = effective ->> 'requiredRoleKey' and ro.is_active) then
      raise exception 'SIGNATURE_CONFIGURATION_REQUIRED:%', field_row.field_key;
    end if;
  end loop;

  return private.complete_report_085_legacy(p_report_id, p_title, p_values);
end
$function$;

revoke all on function private.complete_report_085_legacy(uuid,text,jsonb) from public, anon, authenticated;
revoke all on function public.complete_report(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.complete_report(uuid,text,jsonb) to authenticated;

alter function public.send_report(uuid,uuid[],text,jsonb) set schema private;
alter function private.send_report(uuid,uuid[],text,jsonb) rename to send_report_085_legacy;

create or replace function public.send_report(
  p_report_id uuid,
  p_recipient_user_ids uuid[],
  p_note text default null,
  p_signature_mappings jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  mapping_row jsonb;
  effective jsonb;
  recipient_id uuid;
  field_key text;
  required_role_key text;
begin
  if not private.current_user_is_active()
     or not private.current_user_has_permission('reports.view_own')
     or not private.current_user_has_permission('reports.send') then
    raise exception 'FORBIDDEN';
  end if;
  perform private.validate_sender_signature_roles(p_report_id);
  if p_signature_mappings is not null and jsonb_typeof(p_signature_mappings) = 'array' then
    for mapping_row in select value from jsonb_array_elements(p_signature_mappings) loop
      if jsonb_typeof(mapping_row) = 'object'
         and btrim(coalesce(mapping_row ->> 'recipientUserId', '')) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         and nullif(btrim(mapping_row ->> 'signatureFieldKey'), '') is not null then
        recipient_id := btrim(mapping_row ->> 'recipientUserId')::uuid;
        field_key := btrim(mapping_row ->> 'signatureFieldKey');
        effective := private.report_effective_signature_configuration(p_report_id, field_key);
        if effective is not null and lower(effective ->> 'signatureRole') = 'receiver' then
          required_role_key := nullif(btrim(effective ->> 'requiredRoleKey'), '');
          if required_role_key is not null and not private.signature_user_has_required_role(recipient_id, required_role_key) then
            raise exception 'SIGNATURE_REQUIRED_ROLE_MISMATCH:%', field_key;
          end if;
        end if;
      end if;
    end loop;
  end if;
  return private.send_report_085_legacy(p_report_id, p_recipient_user_ids, p_note, p_signature_mappings);
end
$function$;

revoke all on function private.send_report_085_legacy(uuid,uuid[],text,jsonb) from public, anon, authenticated;
revoke all on function public.send_report(uuid,uuid[],text,jsonb) from public, anon, authenticated;
grant execute on function public.send_report(uuid,uuid[],text,jsonb) to authenticated;

alter function public.sign_report(uuid,uuid,jsonb) set schema private;
alter function private.sign_report(uuid,uuid,jsonb) rename to sign_report_085_legacy;

create or replace function public.sign_report(
  p_report_id uuid,
  p_assignment_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  mapping_row public.report_signature_assignments%rowtype;
  effective jsonb;
  required_role_key text;
  result jsonb;
begin
  if not private.current_user_is_active() then
    raise exception 'FORBIDDEN';
  end if;
  select m.* into mapping_row
  from public.report_signature_assignments m
  where m.report_id = p_report_id
    and m.report_assignment_id = p_assignment_id
    and m.recipient_user_id = auth.uid();

  if found then
    effective := private.report_effective_signature_configuration(p_report_id, mapping_row.signature_field_key);
    required_role_key := nullif(btrim(effective ->> 'requiredRoleKey'), '');
    if required_role_key is not null and not private.signature_user_has_required_role(auth.uid(), required_role_key) then
      raise exception 'SIGNATURE_REQUIRED_ROLE_MISMATCH:%', mapping_row.signature_field_key;
    end if;
  end if;

  result := private.sign_report_085_legacy(p_report_id, p_assignment_id, p_payload);

  /* Business identity is the mapped field key.  No synthetic component id is
   * written when the immutable snapshot has no canonical component identity. */
  update public.report_signature_events e
  set component_key = latest.signature_field_key
  from (
    select ev.id, map.signature_field_key
    from public.report_signature_events ev
    join public.report_signature_assignments map
      on map.report_id = ev.report_id
     and map.send_cycle_id = ev.send_cycle_id
     and map.report_assignment_id = ev.report_assignment_id
    where ev.report_id = p_report_id
      and ev.report_assignment_id = p_assignment_id
      and ev.event_type = 'signed'
      and ev.component_key is null
    order by ev.occurred_at desc, ev.id desc
    limit 1
  ) latest
  where e.id = latest.id;
  return result;
end
$function$;

revoke all on function private.sign_report_085_legacy(uuid,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.sign_report(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.sign_report(uuid,uuid,jsonb) to authenticated;

insert into private.widgetflow_schema_migrations (id, description)
values (
  '086_authoritative_signature_assignment_contract',
  'Immutable template defaults, report signature overrides, effective policy enforcement, and mapped component identity'
);

commit;
