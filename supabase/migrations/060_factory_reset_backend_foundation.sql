begin;

do $migration_guard$
begin
  if not exists (
    select 1 from private.widgetflow_schema_migrations
    where id = '059_template_dynamic_pending_reviewer_eligibility'
  ) then
    raise exception 'WidgetFlow migration 059_template_dynamic_pending_reviewer_eligibility must be applied first';
  end if;
  if exists (
    select 1 from private.widgetflow_schema_migrations
    where id = '060_factory_reset_backend_foundation'
  ) then
    raise exception 'WidgetFlow migration 060_factory_reset_backend_foundation has already been applied';
  end if;
end
$migration_guard$;

create table public.admin_data_reset_operations (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  operation_type text not null check (btrim(operation_type) <> ''),
  scope jsonb not null default '{}'::jsonb,
  requested_selection jsonb not null default '{}'::jsonb,
  planned_effect jsonb not null default '{}'::jsonb,
  actual_effect jsonb,
  status text not null default 'planned' check (status in ('planned','previewed','completed','failed','cancelled')),
  created_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz,
  error_summary text
);

alter table public.admin_data_reset_operations enable row level security;
create policy admin_data_reset_operations_admin_only
  on public.admin_data_reset_operations
  for all to authenticated
  using (private.current_user_is_protected_admin())
  with check (private.current_user_is_protected_admin());
revoke all on table public.admin_data_reset_operations from authenticated;

create or replace function public.admin_data_control_domains()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if not private.current_user_is_protected_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  return jsonb_build_array(
    jsonb_build_object('domain_key','accounts','display_name','Accounts','description','User profiles and account-owned data','supports_search',true,'supports_filters',true,'supports_bulk_selection',true,'supports_account_scope',true,'protected',false,'danger_level','critical'),
    jsonb_build_object('domain_key','roles','display_name','Roles','description','System and custom organizational roles','supports_search',false,'supports_filters',false,'supports_bulk_selection',false,'supports_account_scope',false,'protected',true,'danger_level','critical'),
    jsonb_build_object('domain_key','permissions','display_name','Permissions','description','Core permission catalog','supports_search',false,'supports_filters',false,'supports_bulk_selection',false,'supports_account_scope',false,'protected',true,'danger_level','protected'),
    jsonb_build_object('domain_key','categories','display_name','Categories','description','Template categories','supports_search',true,'supports_filters',true,'supports_bulk_selection',true,'supports_account_scope',false,'protected',false,'danger_level','high'),
    jsonb_build_object('domain_key','templates','display_name','Templates','description','Templates and approval records','supports_search',true,'supports_filters',true,'supports_bulk_selection',true,'supports_account_scope',true,'protected',false,'danger_level','critical'),
    jsonb_build_object('domain_key','template_versions','display_name','Template Versions','description','Immutable template snapshots','supports_search',false,'supports_filters',false,'supports_bulk_selection',false,'supports_account_scope',false,'protected',true,'danger_level','high'),
    jsonb_build_object('domain_key','template_comments','display_name','Template Comments','description','Template discussion records','supports_search',false,'supports_filters',false,'supports_bulk_selection',false,'supports_account_scope',false,'protected',false,'danger_level','medium'),
    jsonb_build_object('domain_key','reports','display_name','Reports','description','Generated reports and lifecycle state','supports_search',true,'supports_filters',true,'supports_bulk_selection',true,'supports_account_scope',true,'protected',false,'danger_level','critical'),
    jsonb_build_object('domain_key','report_assignments','display_name','Report Recipients','description','Recipient assignments','supports_search',false,'supports_filters',false,'supports_bulk_selection',false,'supports_account_scope',false,'protected',true,'danger_level','high'),
    jsonb_build_object('domain_key','report_send_cycles','display_name','Report Send Cycles','description','Immutable send-cycle history','supports_search',false,'supports_filters',false,'supports_bulk_selection',false,'supports_account_scope',false,'protected',true,'danger_level','high'),
    jsonb_build_object('domain_key','signature_data','display_name','Signature Data','description','Signature profiles and signature events','supports_search',false,'supports_filters',false,'supports_bulk_selection',false,'supports_account_scope',false,'protected',true,'danger_level','critical'),
    jsonb_build_object('domain_key','notifications','display_name','Notifications','description','System notifications','supports_search',true,'supports_filters',true,'supports_bulk_selection',true,'supports_account_scope',true,'protected',false,'danger_level','medium'),
    jsonb_build_object('domain_key','assets','display_name','Assets','description','Asset metadata and references','supports_search',true,'supports_filters',true,'supports_bulk_selection',true,'supports_account_scope',true,'protected',true,'danger_level','critical'),
    jsonb_build_object('domain_key','content_library','display_name','Content Library','description','Reusable shared content','supports_search',false,'supports_filters',false,'supports_bulk_selection',false,'supports_account_scope',false,'protected',false,'danger_level','medium'),
    jsonb_build_object('domain_key','standard_packs','display_name','Standard Packs','description','Published and draft packs','supports_search',false,'supports_filters',false,'supports_bulk_selection',false,'supports_account_scope',false,'protected',false,'danger_level','high'),
    jsonb_build_object('domain_key','governance_routes','display_name','Governance Routes','description','Approval routing configuration','supports_search',false,'supports_filters',false,'supports_bulk_selection',false,'supports_account_scope',false,'protected',true,'danger_level','protected'),
    jsonb_build_object('domain_key','feature_settings','display_name','Feature Settings','description','Feature enablement configuration','supports_search',false,'supports_filters',false,'supports_bulk_selection',false,'supports_account_scope',false,'protected',true,'danger_level','protected'),
    jsonb_build_object('domain_key','element_settings','display_name','Element Settings','description','Studio element configuration','supports_search',false,'supports_filters',false,'supports_bulk_selection',false,'supports_account_scope',false,'protected',true,'danger_level','protected'),
    jsonb_build_object('domain_key','system_settings','display_name','System Settings','description','Organization-wide settings','supports_search',false,'supports_filters',false,'supports_bulk_selection',false,'supports_account_scope',false,'protected',true,'danger_level','protected'),
    jsonb_build_object('domain_key','audit_data','display_name','Audit Data','description','Security, administrative and business history','supports_search',false,'supports_filters',false,'supports_bulk_selection',false,'supports_account_scope',false,'protected',true,'danger_level','protected'),
    jsonb_build_object('domain_key','workflow_runtime_data','display_name','Workflow Runtime Data','description','Runtime instances, tasks and events','supports_search',false,'supports_filters',false,'supports_bulk_selection',false,'supports_account_scope',false,'protected',false,'danger_level','critical')
  );
end
$function$;

create or replace function public.admin_data_control_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v jsonb;
begin
  if not private.current_user_is_protected_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  select jsonb_agg(jsonb_build_object(
    'domain_key', d->>'domain_key', 'display_name', d->>'display_name',
    'count', case d->>'domain_key'
      when 'accounts' then (select count(*) from public.profiles)
      when 'roles' then (select count(*) from public.roles)
      when 'permissions' then (select count(*) from public.permissions)
      when 'categories' then (select count(*) from public.categories)
      when 'templates' then (select count(*) from public.templates)
      when 'template_versions' then (select count(*) from public.template_versions)
      when 'template_comments' then (select count(*) from public.template_comments)
      when 'reports' then (select count(*) from public.reports)
      when 'report_assignments' then (select count(*) from public.report_assignments)
      when 'report_send_cycles' then (select count(*) from public.report_send_cycles)
      when 'signature_data' then (select (select count(*) from public.signature_profiles) + (select count(*) from public.report_signature_events))
      when 'notifications' then (select count(*) from public.notifications)
      when 'assets' then (select count(*) from public.asset_metadata)
      when 'content_library' then (select count(*) from public.content_library_items)
      when 'standard_packs' then (select count(*) from public.standard_packs)
      when 'governance_routes' then (select count(*) from public.governance_routes)
      when 'feature_settings' then (select count(*) from public.feature_settings)
      when 'element_settings' then (select count(*) from public.element_settings)
      when 'system_settings' then (select count(*) from public.system_settings)
      when 'audit_data' then (select (select count(*) from public.admin_audit_events) + (select count(*) from public.application_auth_events))
      when 'workflow_runtime_data' then (select (select count(*) from public.workflow_instances) + (select count(*) from public.workflow_tasks) + (select count(*) from public.workflow_events))
      else 0 end,
    'protected_count', case d->>'domain_key'
      when 'accounts' then (select count(*) from public.profiles p join public.roles r on r.id=p.role_id where p.status='Active' and r.is_protected)
      when 'roles' then (select count(*) from public.roles where is_protected or role_type='System')
      when 'permissions' then (select count(*) from public.permissions)
      when 'governance_routes' then (select count(*) from public.governance_routes)
      when 'feature_settings' then (select count(*) from public.feature_settings)
      when 'element_settings' then (select count(*) from public.element_settings)
      when 'system_settings' then (select count(*) from public.system_settings)
      when 'audit_data' then (select (select count(*) from public.admin_audit_events) + (select count(*) from public.application_auth_events))
      else 0 end
  )) into v from jsonb_array_elements(public.admin_data_control_domains()) d;
  return coalesce(v, '[]'::jsonb);
end
$function$;

create or replace function public.admin_data_control_browse(
  p_domain_key text, p_page integer default 1, p_page_size integer default 25,
  p_search text default null, p_filters jsonb default '{}'::jsonb, p_sort text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_page integer := greatest(coalesce(p_page,1),1);
  v_size integer := least(greatest(coalesce(p_page_size,25),1),100);
  v_offset integer;
  v_rows jsonb := '[]'::jsonb;
  v_total bigint := 0;
  v_search text := nullif(btrim(coalesce(p_search,'')),'');
begin
  if not private.current_user_is_protected_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if nullif(btrim(coalesce(p_domain_key,'')),'') is null then raise exception 'INVALID_INPUT'; end if;
  if length(coalesce(p_search,'')) > 200 then raise exception 'SEARCH_TOO_LONG'; end if;
  if p_filters is not null and p_filters <> '{}'::jsonb then raise exception 'UNSUPPORTED_FILTERS'; end if;
  if nullif(btrim(coalesce(p_sort,'')),'') is not null then raise exception 'UNSUPPORTED_SORT'; end if;
  v_offset := (v_page-1)*v_size;
  if p_domain_key = 'accounts' then
    select count(*) into v_total from public.profiles p where v_search is null or p.full_name ilike '%'||v_search||'%' or p.email ilike '%'||v_search||'%';
    select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_rows from (select p.id,p.profile_code,p.full_name,p.email,p.status,p.role_id,r.key as role_key,r.name as role_name from public.profiles p join public.roles r on r.id=p.role_id where v_search is null or p.full_name ilike '%'||v_search||'%' or p.email ilike '%'||v_search||'%' order by p.full_name limit v_size offset v_offset) x;
  elsif p_domain_key = 'templates' then
    select count(*) into v_total from public.templates t where v_search is null or t.name ilike '%'||v_search||'%';
    select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_rows from (select t.id,t.name,t.status,t.category_id,t.created_by_user_id,t.created_at,t.updated_at from public.templates t where v_search is null or t.name ilike '%'||v_search||'%' order by t.updated_at desc limit v_size offset v_offset) x;
  elsif p_domain_key = 'reports' then
    select count(*) into v_total from public.reports r where v_search is null or r.title ilike '%'||v_search||'%';
    select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_rows from (select r.id,r.title,r.status,r.template_id,r.created_by_user_id,r.created_at,r.updated_at from public.reports r where v_search is null or r.title ilike '%'||v_search||'%' order by r.updated_at desc limit v_size offset v_offset) x;
  elsif p_domain_key = 'categories' then
    select count(*) into v_total from public.categories c where v_search is null or c.name ilike '%'||v_search||'%';
    select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_rows from (select c.id,c.name,c.status,c.created_at,c.updated_at from public.categories c where v_search is null or c.name ilike '%'||v_search||'%' order by c.name limit v_size offset v_offset) x;
  elsif p_domain_key = 'notifications' then
    select count(*) into v_total from public.notifications n where v_search is null or n.title ilike '%'||v_search||'%' or n.message ilike '%'||v_search||'%';
    select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_rows from (select n.id,n.recipient_user_id,n.notification_type,n.title,n.is_read,n.created_at,n.related_template_id,n.related_report_id from public.notifications n where v_search is null or n.title ilike '%'||v_search||'%' or n.message ilike '%'||v_search||'%' order by n.created_at desc limit v_size offset v_offset) x;
  elsif p_domain_key = 'assets' then
    select count(*) into v_total from public.asset_metadata a where v_search is null or a.original_filename ilike '%'||v_search||'%' or a.mime_type ilike '%'||v_search||'%';
    select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_rows from (select a.id,a.owner_user_id,a.original_filename,a.mime_type,a.byte_size,a.lifecycle_state,a.linked_template_id,a.linked_report_id,a.created_at from public.asset_metadata a where v_search is null or a.original_filename ilike '%'||v_search||'%' or a.mime_type ilike '%'||v_search||'%' order by a.created_at desc limit v_size offset v_offset) x;
  else
    raise exception 'UNSUPPORTED_DOMAIN';
  end if;
  return jsonb_build_object('rows',v_rows,'total_count',v_total,'page',v_page,'page_size',v_size,'domain_key',p_domain_key);
end
$function$;

create or replace function public.admin_account_data_summary(p_user_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $function$
begin
  if not private.current_user_is_protected_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_user_id is null or not exists (select 1 from public.profiles where id=p_user_id) then raise exception 'ACCOUNT_NOT_FOUND'; end if;
  return jsonb_build_object(
    'user_id',p_user_id,
    'templates_created',(select count(*) from public.templates where created_by_user_id=p_user_id),
    'reports_created',(select count(*) from public.reports where created_by_user_id=p_user_id),
    'reports_received',(select count(*) from public.report_assignments where recipient_user_id=p_user_id),
    'template_reviews',(select count(*) from public.template_audit_events where actor_user_id=p_user_id),
    'comments',(select count(*) from public.template_comments where author_user_id=p_user_id)+(select count(*) from public.report_comments where author_user_id=p_user_id),
    'notifications',(select count(*) from public.notifications where recipient_user_id=p_user_id),
    'assets',(select count(*) from public.asset_metadata where owner_user_id=p_user_id),
    'signature_profiles',(select count(*) from public.signature_profiles where user_id=p_user_id),
    'audit_activity',(select count(*) from public.admin_audit_events where actor_user_id=p_user_id)+(select count(*) from public.application_auth_events where user_id=p_user_id or actor_user_id=p_user_id),
    'workflow_runtime',(select count(*) from public.workflow_tasks where assigned_user_id=p_user_id or claimed_by_user_id=p_user_id),
    'role_history',(select count(*) from public.user_role_history where user_id=p_user_id)
  );
end
$function$;

create or replace function public.admin_preview_data_cleanup(
  p_domain_key text, p_record_ids uuid[] default null, p_options jsonb default '{}'::jsonb
)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare v_selected bigint; v_dependencies jsonb := '{}'::jsonb; v_classification text := 'BLOCKED_BY_DEPENDENCY';
begin
  if not private.current_user_is_protected_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_domain_key not in ('accounts','templates','reports','notifications','assets','content_library','standard_packs','categories') then
    return jsonb_build_object('domain_key',p_domain_key,'selected_count',0,'deletable_count',0,'protected_count',0,'blocked_count',0,'classification','PROTECTED','recommended_action','No cleanup operation is defined for this protected domain.');
  end if;
  if p_record_ids is null then
    select coalesce((select (d->>'count')::bigint from jsonb_array_elements(public.admin_data_control_summary()) d where d->>'domain_key'=p_domain_key),0) into v_selected;
  else v_selected := least(coalesce(cardinality(p_record_ids),0),1000); end if;
  if p_domain_key='templates' and p_record_ids is not null then
    v_dependencies := jsonb_build_object('sections',(select count(*) from public.template_sections where template_id = any(p_record_ids)),'fields',(select count(*) from public.template_fields where template_id = any(p_record_ids)),'tags',(select count(*) from public.template_tags where template_id = any(p_record_ids)),'template_versions',(select count(*) from public.template_versions where template_id = any(p_record_ids)),'reports',(select count(*) from public.reports where template_id = any(p_record_ids)),'comments',(select count(*) from public.template_comments where template_id = any(p_record_ids)),'audit_events',(select count(*) from public.template_audit_events where template_id = any(p_record_ids)),'workflow_definitions',(select count(*) from public.workflow_definitions where template_id = any(p_record_ids)),'assets',(select count(*) from public.asset_metadata where linked_template_id = any(p_record_ids)));
  elsif p_domain_key='reports' and p_record_ids is not null then
    v_dependencies := jsonb_build_object('report_values',(select count(*) from public.report_values where report_id = any(p_record_ids)),'send_cycles',(select count(*) from public.report_send_cycles where report_id = any(p_record_ids)),'assignments',(select count(*) from public.report_assignments where report_id = any(p_record_ids)),'signature_assignments',(select count(*) from public.report_signature_assignments where report_id = any(p_record_ids)),'signature_events',(select count(*) from public.report_signature_events where report_id = any(p_record_ids)),'comments',(select count(*) from public.report_comments where report_id = any(p_record_ids)),'audit_events',(select count(*) from public.report_audit_events where report_id = any(p_record_ids)),'notifications',(select count(*) from public.notifications where related_report_id = any(p_record_ids)),'workflow_runtime',(select count(*) from public.workflow_instances where report_id = any(p_record_ids)),'assets',(select count(*) from public.asset_metadata where linked_report_id = any(p_record_ids)));
  elsif p_domain_key='accounts' then
    v_dependencies := jsonb_build_object('auth_account','AUTH_ACCOUNT_EXTERNAL_ACTION_REQUIRED','protected_admin',(select private.is_protected_admin_user(coalesce(p_record_ids[1],auth.uid()))));
  end if;
  return jsonb_build_object('domain_key',p_domain_key,'selected_count',v_selected,'deletable_count',0,'protected_count',case when p_domain_key in ('accounts','roles','permissions','audit_data') then v_selected else 0 end,'blocked_count',v_selected,'dependencies',v_dependencies,'classification','PREVIEW_INCOMPLETE','recommended_action','Preview only. Dependency coverage is incomplete and no deletion operation is currently available.');
end
$function$;

create or replace function public.admin_preview_factory_reset(p_options jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
begin
  if not private.current_user_is_protected_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  return jsonb_build_object('mode','preview_only','business_data',public.admin_data_control_summary(),'preserved',jsonb_build_array('Protected Admin','System Roles','Permission Catalog','Workflow Architecture','RLS','Functions','RPCs','Triggers','Indexes','Constraints','Migration Ledger','Reset Audit'),'auth_accounts','AUTH_ACCOUNT_EXTERNAL_ACTION_REQUIRED','storage','EXTERNAL_CLEANUP_REQUIRED','deletions_enabled',false,'options',coalesce(p_options,'{}'::jsonb));
end
$function$;

revoke all on table public.admin_data_reset_operations from public, anon;
revoke all on function public.admin_data_control_domains() from public, anon;
revoke all on function public.admin_data_control_summary() from public, anon;
revoke all on function public.admin_data_control_browse(text,integer,integer,text,jsonb,text) from public, anon;
revoke all on function public.admin_account_data_summary(uuid) from public, anon;
revoke all on function public.admin_preview_data_cleanup(text,uuid[],jsonb) from public, anon;
revoke all on function public.admin_preview_factory_reset(jsonb) from public, anon;
grant execute on function public.admin_data_control_domains() to authenticated;
grant execute on function public.admin_data_control_summary() to authenticated;
grant execute on function public.admin_data_control_browse(text,integer,integer,text,jsonb,text) to authenticated;
grant execute on function public.admin_account_data_summary(uuid) to authenticated;
grant execute on function public.admin_preview_data_cleanup(text,uuid[],jsonb) to authenticated;
grant execute on function public.admin_preview_factory_reset(jsonb) to authenticated;

insert into private.widgetflow_schema_migrations (id, description)
values ('060_factory_reset_backend_foundation', 'Protected Admin Factory Reset preview and data-control foundation');

commit;
