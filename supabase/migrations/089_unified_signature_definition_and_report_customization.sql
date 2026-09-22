begin;

do $migration_guard$
begin
  if not exists (select 1 from private.widgetflow_schema_migrations where id = '088_optional_signature_customization_semantics') then
    raise exception 'WidgetFlow migration 088_optional_signature_customization_semantics must be applied first';
  end if;
  if exists (select 1 from private.widgetflow_schema_migrations where id = '089_unified_signature_definition_and_report_customization') then
    raise exception 'WidgetFlow migration 089_unified_signature_definition_and_report_customization has already been applied';
  end if;
end
$migration_guard$;

alter table public.report_signature_configurations
  add column if not exists display_label_override text;

alter table public.report_signature_configurations
  add constraint report_signature_configurations_display_label_not_blank_chk
  check (display_label_override is null or pg_catalog.btrim(display_label_override) <> '');

/* The sole backend source of signature meaning. It reads immutable snapshots
 * compatibly and overlays only report-owned configuration by field key. */
create or replace function private.report_effective_signature_definitions(p_report_id uuid)
returns table(
  signature_field_key text,
  display_label text,
  signature_role text,
  required_role_key text,
  assignment_policy text,
  is_required boolean,
  is_override boolean
)
language sql stable security definer set search_path = ''
as $function$
  with recursive report_version as (
    select tv.schema_snapshot
    from public.reports r join public.template_versions tv on tv.id=r.template_version_id and tv.template_id=r.template_id
    where r.id=p_report_id
  ), recursive_nodes(value) as (
    select schema_snapshot from report_version
    union all
    select child.value from recursive_nodes node cross join lateral (
      select a.value from jsonb_array_elements(case when jsonb_typeof(node.value)='array' then node.value else '[]'::jsonb end) a(value)
      union all select o.value from jsonb_each(case when jsonb_typeof(node.value)='object' then node.value else '{}'::jsonb end) o(key,value)
    ) child
  ), raw_fields as (
    select distinct on (field_key)
      field_key,
      coalesce(nullif(pg_catalog.btrim(value #>> '{signatureConfig,label}'),''),nullif(pg_catalog.btrim(value ->> 'label'),''),nullif(pg_catalog.btrim(value #>> '{configuration,label}'),''),'Signature') as template_label,
      case lower(coalesce(value #>> '{signatureConfig,signatureRole}',value ->> 'signatureRole',value #>> '{configuration,signatureConfig,signatureRole}',value #>> '{configuration,signatureRole}','receiver')) when 'sender' then 'sender' else 'receiver' end as template_role,
      nullif(pg_catalog.btrim(coalesce(value #>> '{signatureConfig,requiredRole}',value ->> 'requiredRole',value #>> '{configuration,signatureConfig,requiredRole}',value #>> '{configuration,requiredRole}','')),'') as raw_required_role,
      lower(coalesce(value ->> 'required', value ->> 'is_required', value #>> '{configuration,required}', value #>> '{configuration,is_required}', 'false')) = 'true' as template_required,
      case lower(coalesce(value #>> '{signatureConfig,assignmentPolicy}',value ->> 'assignmentPolicy',value #>> '{configuration,signatureConfig,assignmentPolicy}',value #>> '{configuration,assignmentPolicy}','fixed')) when 'default_override_allowed' then 'default_override_allowed' when 'report_creator_required' then 'report_creator_required' else 'fixed' end as template_policy
    from recursive_nodes
    cross join lateral (select coalesce(nullif(pg_catalog.btrim(value ->> 'field_key'),''),nullif(pg_catalog.btrim(value ->> 'key'),''),nullif(pg_catalog.btrim(value #>> '{configuration,field_key}'),''),nullif(pg_catalog.btrim(value #>> '{configuration,key}'),'')) as field_key) identity
    where jsonb_typeof(value)='object'
      and lower(coalesce(value ->> 'type',value ->> 'field_type',value #>> '{configuration,type}',value #>> '{configuration,field_type}',''))='signature'
      and field_key is not null
    order by field_key
  )
  select raw.field_key,
    coalesce(override.display_label_override,raw.template_label),
    coalesce(override.signature_role,raw.template_role),
    case when override.id is not null then override.required_role_key
         else coalesce(canonical.key, raw.raw_required_role) end,
    coalesce(override.assignment_policy,raw.template_policy),
    raw.template_required,
    override.id is not null
  from raw_fields raw
  left join public.report_signature_configurations override on override.report_id=p_report_id and override.signature_field_key=raw.field_key
  left join lateral (select ro.key from public.roles ro where ro.is_active and (ro.key=raw.raw_required_role or lower(ro.name)=lower(raw.raw_required_role) or ro.id::text=raw.raw_required_role) order by case when ro.key=raw.raw_required_role then 0 else 1 end limit 1) canonical on true
$function$;

revoke all on function private.report_effective_signature_definitions(uuid) from public, anon, authenticated, service_role;

/* Keep the established single-field helper as a projection of the one
 * canonical set.  Existing callers therefore cannot independently re-parse
 * a snapshot after 089. */
create or replace function private.report_effective_signature_configuration(
  p_report_id uuid,
  p_signature_field_key text
)
returns jsonb
language sql stable security definer set search_path = ''
as $function$
  select jsonb_build_object(
    'reportId', p_report_id,
    'signatureFieldKey', d.signature_field_key,
    'displayLabel', d.display_label,
    'signatureRole', d.signature_role,
    'requiredRoleKey', d.required_role_key,
    'assignmentPolicy', d.assignment_policy,
    'required', d.is_required,
    'inherited', not d.is_override,
    'isOverride', d.is_override
  )
  from private.report_effective_signature_definitions(p_report_id) d
  where d.signature_field_key = pg_catalog.btrim(p_signature_field_key)
$function$;

revoke all on function private.report_effective_signature_configuration(uuid,text) from public, anon, authenticated, service_role;

create or replace function private.validate_sender_signature_roles(p_report_id uuid)
returns void language plpgsql security definer set search_path = ''
as $function$
declare definition record;
begin
  for definition in select * from private.report_effective_signature_definitions(p_report_id) where signature_role='sender' loop
    if definition.required_role_key is not null and not private.signature_user_has_required_role(auth.uid(),definition.required_role_key) then
      raise exception 'SIGNATURE_REQUIRED_ROLE_MISMATCH:%', definition.signature_field_key;
    end if;
  end loop;
end
$function$;

revoke all on function private.validate_sender_signature_roles(uuid) from public, anon, authenticated, service_role;

/* Five-argument overload preserves the 086 public contract for historical callers,
 * while allowing a draft report to persist label, context, and role together. */
create or replace function public.set_report_signature_configuration(
  p_report_id uuid,
  p_signature_field_key text,
  p_signature_role text,
  p_required_role text,
  p_display_label text
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  report_row public.reports%rowtype;
  effective jsonb;
  canonical_context text;
  canonical_required_role text;
  input_required_role text;
  normalized_label text;
begin
  if not private.current_user_is_active()
     or not private.current_user_has_permission('reports.view_own')
     or not private.current_user_has_permission('reports.edit_draft') then raise exception 'FORBIDDEN'; end if;
  select * into report_row from public.reports where id = p_report_id for update;
  if not found or report_row.created_by_user_id <> auth.uid() or report_row.status <> 'draft'
     or report_row.current_send_cycle_id is not null or report_row.locked_at is not null or report_row.sent_at is not null then
    raise exception 'REPORT_SIGNATURE_CONFIGURATION_NOT_EDITABLE';
  end if;
  effective := private.report_effective_signature_configuration(p_report_id, p_signature_field_key);
  if effective is null then raise exception 'SIGNATURE_FIELD_NOT_FOUND:%', p_signature_field_key; end if;
  if effective ->> 'assignmentPolicy' = 'fixed' then raise exception 'SIGNATURE_CONFIGURATION_FIXED'; end if;
  canonical_context := lower(pg_catalog.btrim(coalesce(p_signature_role, effective ->> 'signatureRole')));
  if canonical_context not in ('sender','receiver') then raise exception 'SIGNATURE_ROLE_INVALID'; end if;
  input_required_role := nullif(pg_catalog.btrim(p_required_role), '');
  if input_required_role is not null then
    select ro.key into canonical_required_role from public.roles ro
    where ro.is_active and (ro.key = input_required_role or lower(ro.name) = lower(input_required_role) or ro.id::text = input_required_role)
    order by case when ro.key = input_required_role then 0 else 1 end, ro.key limit 1;
    if canonical_required_role is null then raise exception 'SIGNATURE_REQUIRED_ROLE_NOT_FOUND'; end if;
  end if;
  normalized_label := nullif(pg_catalog.btrim(p_display_label), '');
  insert into public.report_signature_configurations(report_id,signature_field_key,signature_role,required_role_key,display_label_override,assignment_policy,is_override,updated_at)
  values(p_report_id,pg_catalog.btrim(p_signature_field_key),canonical_context,canonical_required_role,normalized_label,effective ->> 'assignmentPolicy',true,statement_timestamp())
  on conflict (report_id,signature_field_key) do update set signature_role=excluded.signature_role,required_role_key=excluded.required_role_key,display_label_override=excluded.display_label_override,assignment_policy=excluded.assignment_policy,is_override=true,updated_at=statement_timestamp();
  return private.report_effective_signature_configuration(p_report_id,p_signature_field_key);
end
$function$;

revoke all on function public.set_report_signature_configuration(uuid,text,text,text,text) from public, anon;
grant execute on function public.set_report_signature_configuration(uuid,text,text,text,text) to authenticated;

/* Send is deliberately re-owned here instead of delegating to the 085 raw
 * snapshot mapper.  The preserved 038 lifecycle is reproduced below; only
 * signature discovery is changed, and it is exclusively set-based through
 * report_effective_signature_definitions. */
create or replace function public.send_report(
  p_report_id uuid,
  p_recipient_user_ids uuid[],
  p_note text default null,
  p_signature_mappings jsonb default '[]'::jsonb
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  actor record; report_row public.reports%rowtype; cycle_row public.report_send_cycles%rowtype;
  recipient_row record; assignment_row public.report_assignments%rowtype; definition record;
  mapping jsonb; mapping_count integer; mapped_recipient uuid; mapped_field text;
  cycle_no integer; idx integer := 0; signature_row public.signature_profiles%rowtype;
begin
  if not private.current_user_is_active() or not private.current_user_has_permission('reports.view_own') or not private.current_user_has_permission('reports.send') then raise exception 'FORBIDDEN'; end if;
  select * into actor from private.report_actor(); if not found then raise exception 'ACCOUNT_INACTIVE'; end if;
  if p_recipient_user_ids is null or cardinality(p_recipient_user_ids)=0 then raise exception 'RECIPIENTS_REQUIRED'; end if;
  if cardinality(p_recipient_user_ids) <> (select count(distinct x) from unnest(p_recipient_user_ids) x) then raise exception 'DUPLICATE_RECIPIENT'; end if;
  select * into report_row from public.reports where id=p_report_id for update;
  if not found or report_row.created_by_user_id<>actor.user_id or report_row.status<>'completed' or report_row.locked_at is not null or report_row.current_send_cycle_id is not null or report_row.sent_at is not null then raise exception 'REPORT_NOT_SENDABLE'; end if;
  if auth.uid()=any(p_recipient_user_ids) then raise exception 'SELF_RECIPIENT_NOT_ALLOWED'; end if;
  if exists (select 1 from unnest(p_recipient_user_ids) x where not exists (select 1 from public.profiles p join public.roles r on r.id=p.role_id where p.id=x and p.status='Active' and r.is_active and r.role_type in ('System','Custom') and not coalesce(r.is_protected,false))) then raise exception 'INVALID_RECIPIENT'; end if;
  if not exists (select 1 from public.template_versions tv where tv.id=report_row.template_version_id and tv.template_id=report_row.template_id and tv.schema_snapshot is not null) then raise exception 'TEMPLATE_VERSION_INVALID'; end if;
  if p_signature_mappings is null or jsonb_typeof(p_signature_mappings)<>'array' then raise exception 'SIGNATURE_MAPPING_INVALID_FORMAT'; end if;
  select count(*) into mapping_count from jsonb_array_elements(p_signature_mappings);

  /* Sender fields must be role-valid and snapshot the active sender profile. */
  perform private.validate_sender_signature_roles(p_report_id);
  if exists(select 1 from private.report_effective_signature_definitions(p_report_id) d where d.signature_role='sender') then
    select * into signature_row from public.signature_profiles where user_id=actor.user_id and is_active order by updated_at desc limit 1;
    if not found or not ((lower(signature_row.signature_method)='typed' and nullif(btrim(signature_row.typed_name),'') is not null) or (lower(signature_row.signature_method)='drawn' and nullif(btrim(signature_row.drawing_data),'') is not null) or (lower(signature_row.signature_method)='uploaded' and signature_row.signature_asset_id is not null)) then raise exception 'SENDER_SIGNATURE_REQUIRED'; end if;
    for definition in select * from private.report_effective_signature_definitions(p_report_id) where signature_role='sender' loop
      insert into public.report_values(report_id,template_field_id,field_key,field_label_snapshot,field_type_snapshot,value)
      values(report_row.id,null,definition.signature_field_key,definition.display_label,'signature',jsonb_build_object('signatureMethod',signature_row.signature_method,'typedName',signature_row.typed_name,'drawingData',signature_row.drawing_data,'typedFontKey',signature_row.typed_font_key,'signatureAssetId',signature_row.signature_asset_id))
      on conflict(report_id,field_key) do update set template_field_id=null,field_label_snapshot=excluded.field_label_snapshot,field_type_snapshot=excluded.field_type_snapshot,value=excluded.value,updated_at=statement_timestamp();
    end loop;
  end if;

  /* Mapping identity is only the stable effective field key. */
  for mapping in select value from jsonb_array_elements(p_signature_mappings) loop
    if jsonb_typeof(mapping)<>'object' or nullif(btrim(mapping->>'recipientUserId'),'') is null or nullif(btrim(mapping->>'signatureFieldKey'),'') is null or btrim(mapping->>'recipientUserId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'SIGNATURE_MAPPING_INVALID_FORMAT'; end if;
    mapped_recipient:=btrim(mapping->>'recipientUserId')::uuid; mapped_field:=btrim(mapping->>'signatureFieldKey');
    if not mapped_recipient=any(p_recipient_user_ids) then raise exception 'SIGNATURE_MAPPING_RECIPIENT_INVALID'; end if;
    if (select count(*) from jsonb_array_elements(p_signature_mappings) c where btrim(c.value->>'recipientUserId')=mapped_recipient::text)<>1 then raise exception 'SIGNATURE_MAPPING_RECIPIENT_DUPLICATE'; end if;
    if (select count(*) from jsonb_array_elements(p_signature_mappings) c where btrim(c.value->>'signatureFieldKey')=mapped_field)<>1 then raise exception 'SIGNATURE_MAPPING_FIELD_DUPLICATE'; end if;
    select * into definition from private.report_effective_signature_definitions(p_report_id) d where d.signature_field_key=mapped_field;
    if not found then raise exception 'SIGNATURE_MAPPING_FIELD_NOT_FOUND'; end if;
    if definition.signature_role<>'receiver' then raise exception 'SIGNATURE_MAPPING_FIELD_NOT_RECEIVER'; end if;
    if definition.required_role_key is not null and not private.signature_user_has_required_role(mapped_recipient,definition.required_role_key) then raise exception 'SIGNATURE_REQUIRED_ROLE_MISMATCH:%',mapped_field; end if;
  end loop;
  if exists(select 1 from private.report_effective_signature_definitions(p_report_id) d where d.signature_role='receiver' and d.is_required and not exists(select 1 from jsonb_array_elements(p_signature_mappings) m where btrim(m.value->>'signatureFieldKey')=d.signature_field_key)) then raise exception 'SIGNATURE_MAPPING_FIELD_REQUIRED'; end if;

  select coalesce(max(cycle_number),0)+1 into cycle_no from public.report_send_cycles where report_id=report_row.id;
  insert into public.report_send_cycles(report_id,cycle_number,sender_user_id,sender_name_snapshot,sender_email_snapshot,sender_role_id_snapshot,sender_role_key_snapshot,sender_role_name_snapshot,sender_governance_level_snapshot,sender_note,content_hash)
  values(report_row.id,cycle_no,actor.user_id,actor.full_name,actor.email,actor.role_id,actor.role_key,actor.role_name,actor.governance_level,nullif(btrim(p_note),''),encode(sha256(convert_to(report_row.id::text||':'||report_row.updated_at::text,'utf8')),'hex')) returning * into cycle_row;
  for recipient_row in select p.id,p.full_name,p.email,p.role_id,r.key role_key,r.name role_name,r.governance_level from public.profiles p join public.roles r on r.id=p.role_id where p.id=any(p_recipient_user_ids) order by p.full_name,p.id loop
    idx:=idx+1; insert into public.report_assignments(report_id,send_cycle_id,recipient_user_id,recipient_name_snapshot,recipient_email_snapshot,recipient_role_id_snapshot,recipient_role_key_snapshot,recipient_role_name_snapshot,recipient_governance_level_snapshot,assignment_sequence) values(report_row.id,cycle_row.id,recipient_row.id,recipient_row.full_name,recipient_row.email,recipient_row.role_id,recipient_row.role_key,recipient_row.role_name,recipient_row.governance_level,idx);
  end loop;
  update public.reports set status='sent',current_send_cycle_id=cycle_row.id,sent_at=statement_timestamp(),sender_note=nullif(btrim(p_note),''),updated_at=statement_timestamp() where id=report_row.id;
  for assignment_row in select * from public.report_assignments where send_cycle_id=cycle_row.id loop
    insert into public.notifications(recipient_user_id,notification_type,title,message,related_report_id,send_cycle_id,report_assignment_id) values(assignment_row.recipient_user_id,'REPORT_RECEIVED','Report received',report_row.title,report_row.id,cycle_row.id,assignment_row.id);
  end loop;
  perform private.report_audit(report_row.id,'REPORT_SENT','completed','sent',p_note);
  for mapping in select value from jsonb_array_elements(p_signature_mappings) loop
    mapped_recipient:=btrim(mapping->>'recipientUserId')::uuid; mapped_field:=btrim(mapping->>'signatureFieldKey');
    select * into assignment_row from public.report_assignments where report_id=report_row.id and send_cycle_id=cycle_row.id and recipient_user_id=mapped_recipient;
    select * into definition from private.report_effective_signature_definitions(p_report_id) d where d.signature_field_key=mapped_field and d.signature_role='receiver';
    if not found then raise exception 'SIGNATURE_MAPPING_INVALID'; end if;
    insert into public.report_signature_assignments(report_id,send_cycle_id,report_assignment_id,recipient_user_id,signature_field_key,signature_field_label_snapshot) values(report_row.id,cycle_row.id,assignment_row.id,assignment_row.recipient_user_id,mapped_field,definition.display_label);
  end loop;
  return jsonb_build_object('report',(select to_jsonb(r) from public.reports r where r.id=report_row.id),'send_cycle',to_jsonb(cycle_row),'assignments',(select coalesce(jsonb_agg(to_jsonb(a) order by a.assignment_sequence),'[]'::jsonb) from public.report_assignments a where a.send_cycle_id=cycle_row.id));
end
$function$;

revoke all on function public.send_report(uuid,uuid[],text,jsonb) from public, anon;
grant execute on function public.send_report(uuid,uuid[],text,jsonb) to authenticated;

/* Sign likewise cannot delegate to the 085 raw-snapshot validator: a field
 * moved Sender -> Receiver is valid only according to the effective set. */
create or replace function public.sign_report(
  p_report_id uuid,
  p_assignment_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  actor record; report_row public.reports%rowtype; assignment_row public.report_assignments%rowtype;
  cycle_row public.report_send_cycles%rowtype; mapping_row public.report_signature_assignments%rowtype;
  definition record; signature_row public.signature_profiles%rowtype; event_id uuid; verification_id text;
  total_mapped integer; signed_mapped integer; old_status text;
begin
  if not private.current_user_is_active() then raise exception 'FORBIDDEN'; end if;
  select * into actor from private.report_actor(); if not found then raise exception 'ACCOUNT_INACTIVE'; end if;
  select * into report_row from public.reports where id=p_report_id for update;
  if not found then raise exception 'REPORT_NOT_FOUND'; end if;
  if report_row.created_by_user_id=actor.user_id then raise exception 'SELF_SIGN_NOT_ALLOWED'; end if;
  if report_row.status<>'sent' then raise exception 'REPORT_STATUS_NOT_SENT'; end if;
  if report_row.locked_at is not null then raise exception 'REPORT_LOCKED'; end if;
  if report_row.current_send_cycle_id is null then raise exception 'REPORT_HAS_NO_CURRENT_SEND_CYCLE'; end if;
  select * into assignment_row from public.report_assignments where id=p_assignment_id and report_id=report_row.id and send_cycle_id=report_row.current_send_cycle_id for update;
  if not found then raise exception 'ASSIGNMENT_NOT_FOUND'; end if;
  if assignment_row.recipient_user_id<>actor.user_id then raise exception 'ASSIGNMENT_NOT_OWNED'; end if;
  if assignment_row.assignment_status='signed' then raise exception 'ALREADY_SIGNED'; end if;
  if assignment_row.assignment_status<>'pending' then raise exception 'ASSIGNMENT_NOT_ACTIONABLE'; end if;
  select * into cycle_row from public.report_send_cycles where id=assignment_row.send_cycle_id and report_id=report_row.id for update;
  if not found then raise exception 'SEND_CYCLE_NOT_FOUND'; end if;
  if cycle_row.id<>report_row.current_send_cycle_id then raise exception 'SEND_CYCLE_NOT_CURRENT'; end if;
  if cycle_row.status<>'active' then raise exception 'SEND_CYCLE_NOT_ACTIONABLE'; end if;
  if nullif(btrim(cycle_row.content_hash),'') is null then raise exception 'SEND_CYCLE_CONTENT_HASH_MISSING'; end if;
  select * into mapping_row from public.report_signature_assignments where report_id=report_row.id and send_cycle_id=report_row.current_send_cycle_id and report_assignment_id=assignment_row.id and recipient_user_id=actor.user_id for update;
  if not found or nullif(btrim(mapping_row.signature_field_key),'') is null then raise exception 'SIGNATURE_ASSIGNMENT_REQUIRED'; end if;
  select * into definition from private.report_effective_signature_definitions(report_row.id) d where d.signature_field_key=mapping_row.signature_field_key;
  if not found or definition.signature_role<>'receiver' then raise exception 'SIGNATURE_MAPPING_INVALID'; end if;
  if definition.required_role_key is not null and not private.signature_user_has_required_role(actor.user_id,definition.required_role_key) then raise exception 'SIGNATURE_REQUIRED_ROLE_MISMATCH:%',mapping_row.signature_field_key; end if;
  select * into signature_row from public.signature_profiles where user_id=actor.user_id and is_active order by updated_at desc limit 1;
  if not found or not ((lower(signature_row.signature_method)='typed' and nullif(btrim(signature_row.typed_name),'') is not null) or (lower(signature_row.signature_method)='drawn' and nullif(btrim(signature_row.drawing_data),'') is not null) or (lower(signature_row.signature_method)='uploaded' and signature_row.signature_asset_id is not null)) then raise exception 'RECIPIENT_SIGNATURE_REQUIRED'; end if;
  insert into public.report_values(report_id,template_field_id,field_key,field_label_snapshot,field_type_snapshot,value)
  values(report_row.id,null,mapping_row.signature_field_key,definition.display_label,'signature',jsonb_build_object('signatureMethod',lower(signature_row.signature_method),'typedName',signature_row.typed_name,'drawingData',signature_row.drawing_data,'typedFontKey',signature_row.typed_font_key,'signatureAssetId',signature_row.signature_asset_id))
  on conflict(report_id,field_key) do update set template_field_id=null,field_label_snapshot=excluded.field_label_snapshot,field_type_snapshot=excluded.field_type_snapshot,value=excluded.value,updated_at=statement_timestamp();
  old_status:=report_row.status; verification_id:='WF-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20));
  insert into public.report_signature_events(report_id,send_cycle_id,report_assignment_id,event_type,signer_user_id,signer_name,signer_email,signer_role_id,signer_role_key,signer_role_name,signer_governance_level,signature_role,signature_method,typed_name_snapshot,confirmation_statement,verification_id,signed_content_hash,component_key)
  values(report_row.id,assignment_row.send_cycle_id,assignment_row.id,'signed',actor.user_id,actor.full_name,actor.email,actor.role_id,actor.role_key,actor.role_name,actor.governance_level,'receiver',lower(signature_row.signature_method),signature_row.typed_name,p_payload->>'confirmationStatement',verification_id,cycle_row.content_hash,mapping_row.signature_field_key) returning id into event_id;
  update public.report_assignments set assignment_status='signed',signed_at=statement_timestamp(),closed_at=statement_timestamp() where id=assignment_row.id;
  select count(*),count(*) filter(where a.assignment_status='signed') into total_mapped,signed_mapped from public.report_signature_assignments m join public.report_assignments a on a.id=m.report_assignment_id where m.report_id=report_row.id and m.send_cycle_id=assignment_row.send_cycle_id;
  insert into public.notifications(recipient_user_id,notification_type,title,message,related_report_id,send_cycle_id,report_assignment_id) values(report_row.created_by_user_id,'REPORT_SIGNED','Report signed',report_row.title,report_row.id,assignment_row.send_cycle_id,assignment_row.id);
  insert into public.report_audit_events(report_id,event_type,actor_user_id,actor_name,actor_email,actor_role_id,actor_role_key,actor_role_name,actor_governance_level,report_title_snapshot,from_status,to_status,comment,event_data,send_cycle_id,report_assignment_id)
  values(report_row.id,'REPORT_SIGNED',actor.user_id,actor.full_name,actor.email,actor.role_id,actor.role_key,actor.role_name,actor.governance_level,report_row.title,old_status,case when total_mapped>0 and signed_mapped=total_mapped then 'signed' else 'sent' end,verification_id,jsonb_build_object('assignment_id',assignment_row.id,'verification_id',verification_id,'signed_content_hash',cycle_row.content_hash,'signed_assignments',signed_mapped,'total_assignments',total_mapped),assignment_row.send_cycle_id,assignment_row.id);
  if total_mapped>0 and signed_mapped=total_mapped then
    update public.report_send_cycles set status='finalized',closed_at=statement_timestamp() where id=assignment_row.send_cycle_id;
    update public.reports set status='signed',signed_at=statement_timestamp(),locked_at=statement_timestamp(),updated_at=statement_timestamp() where id=report_row.id;
    insert into public.notifications(recipient_user_id,notification_type,title,message,related_report_id,send_cycle_id) values(report_row.created_by_user_id,'REPORT_FULLY_SIGNED','Report fully signed',report_row.title,report_row.id,assignment_row.send_cycle_id);
    insert into public.report_audit_events(report_id,event_type,actor_user_id,actor_name,actor_email,actor_role_id,actor_role_key,actor_role_name,actor_governance_level,report_title_snapshot,from_status,to_status,comment,event_data,send_cycle_id,report_assignment_id)
    values(report_row.id,'REPORT_FULLY_SIGNED',actor.user_id,actor.full_name,actor.email,actor.role_id,actor.role_key,actor.role_name,actor.governance_level,report_row.title,'sent','signed',null,jsonb_build_object('final_signature_verification_id',verification_id,'signed_content_hash',cycle_row.content_hash,'signed_assignments',signed_mapped,'total_assignments',total_mapped),assignment_row.send_cycle_id,assignment_row.id);
  end if;
  return jsonb_build_object('report',(select to_jsonb(r) from public.reports r where r.id=report_row.id),'assignment',(select to_jsonb(a) from public.report_assignments a where a.id=assignment_row.id),'signature',(select to_jsonb(e) from public.report_signature_events e where e.id=event_id),'send_cycle',(select to_jsonb(c) from public.report_send_cycles c where c.id=assignment_row.send_cycle_id),'signed_assignments',signed_mapped,'total_assignments',total_mapped,'fully_signed',total_mapped>0 and signed_mapped=total_mapped);
end
$function$;

revoke all on function public.sign_report(uuid,uuid,jsonb) from public, anon;
grant execute on function public.sign_report(uuid,uuid,jsonb) to authenticated;

insert into private.widgetflow_schema_migrations(id,description)
values ('089_unified_signature_definition_and_report_customization','Canonical historical signature reading and additive report-level label/context/role customization');

commit;
