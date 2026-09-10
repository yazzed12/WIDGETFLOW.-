begin;

do $migration_guard$
begin
  if not exists (select 1 from private.widgetflow_schema_migrations where id='061_factory_reset_transactional_delete_engine') then
    raise exception 'WidgetFlow migration 061_factory_reset_transactional_delete_engine must be applied first';
  end if;
  if exists (select 1 from private.widgetflow_schema_migrations where id='062_factory_reset_report_cleanup_engine') then
    raise exception 'WidgetFlow migration 062_factory_reset_report_cleanup_engine has already been applied';
  end if;
end
$migration_guard$;

create or replace function public.admin_execute_data_cleanup(
  p_domain_key text,
  p_record_ids uuid[] default null,
  p_options jsonb default '{}'::jsonb,
  p_confirmation text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_ids uuid[];
  v_existing uuid[];
  v_workflow_ids uuid[];
  v_operation uuid;
  v_selected bigint;
  v_deleted bigint;
  v_asset_cleanup jsonb := '[]'::jsonb;
  v_deleted_json jsonb;
begin
  if v_actor is null or not private.current_user_is_protected_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_options is not null and p_options <> '{}'::jsonb then raise exception 'UNSUPPORTED_OPTIONS'; end if;
  if p_record_ids is null or cardinality(p_record_ids)=0 then raise exception 'EMPTY_SELECTION'; end if;
  if cardinality(p_record_ids)>1000 then raise exception 'SELECTION_TOO_LARGE'; end if;

  perform pg_advisory_xact_lock(hashtextextended('widgetflow:factory-reset', 0));
  select array_agg(distinct id order by id) into v_ids from unnest(p_record_ids) supplied(id);
  v_selected := cardinality(v_ids);

  if p_domain_key = 'notifications' then
    if p_confirmation is distinct from 'DELETE SELECTED NOTIFICATIONS' then raise exception 'CONFIRMATION_REQUIRED'; end if;
    select array_agg(id order by id) into v_existing from (select n.id from public.notifications n where n.id=any(v_ids) for update) locked_notifications;
    if coalesce(cardinality(v_existing),0) <> v_selected then raise exception 'RECORD_NOT_FOUND'; end if;
    insert into public.admin_data_reset_operations(actor_user_id,operation_type,scope,requested_selection,planned_effect,status)
    values(v_actor,'SELECTIVE_CLEANUP',jsonb_build_object('domain_key','notifications'),jsonb_build_object('domain_key','notifications','record_ids',to_jsonb(v_ids)),jsonb_build_object('notifications',v_selected,'external_cleanup_required',false),'previewed') returning id into v_operation;
    delete from public.notifications where id=any(v_ids);
    get diagnostics v_deleted=row_count;
    if v_deleted <> v_selected then raise exception 'DELETE_COUNT_MISMATCH'; end if;
    v_deleted_json := jsonb_build_object('notifications',v_deleted);
    update public.admin_data_reset_operations set status='completed',completed_at=statement_timestamp(),actual_effect=jsonb_build_object('deleted',v_deleted_json,'external_cleanup_required',jsonb_build_array()) where id=v_operation;
    return jsonb_build_object('operation_id',v_operation,'status','completed','domain_key','notifications','requested_count',v_selected,'selected_count',v_selected,'deleted',v_deleted_json,'preserved',jsonb_build_object('architecture',true,'audit_history',true),'external_cleanup_required',jsonb_build_array(),'warnings',jsonb_build_array());
  end if;

  if p_domain_key is distinct from 'reports' then raise exception 'UNSUPPORTED_DOMAIN'; end if;
  if p_confirmation is distinct from 'DELETE SELECTED REPORTS' then raise exception 'CONFIRMATION_REQUIRED'; end if;

  select array_agg(id order by id) into v_existing
  from (select r.id from public.reports r where r.id=any(v_ids) for update) locked_reports;
  if coalesce(cardinality(v_existing),0) <> v_selected then raise exception 'RECORD_NOT_FOUND'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('asset_id',a.id,'bucket_name',a.bucket_name,'object_path',a.object_path,'reason','PHYSICAL_ASSET_NOT_DELETED') order by a.id),'[]'::jsonb)
    into v_asset_cleanup from public.asset_metadata a where a.linked_report_id=any(v_ids);
  select array_agg(id order by id) into v_workflow_ids from (select w.id from public.workflow_instances w where w.report_id=any(v_ids) for update) locked_workflow_instances;

  insert into public.admin_data_reset_operations(actor_user_id,operation_type,scope,requested_selection,planned_effect,status)
  values(v_actor,'SELECTIVE_CLEANUP',jsonb_build_object('domain_key','reports'),jsonb_build_object('domain_key','reports','record_ids',to_jsonb(v_ids)),jsonb_build_object('reports',v_selected,'external_cleanup_required',v_asset_cleanup),'previewed') returning id into v_operation;

  update public.reports set current_send_cycle_id=null where id=any(v_ids);

  delete from public.notifications where related_report_id=any(v_ids);
  get diagnostics v_deleted=row_count;
  v_deleted_json := jsonb_build_object('notifications',v_deleted);

  if v_workflow_ids is not null then
    delete from public.workflow_events where workflow_instance_id=any(v_workflow_ids);
    get diagnostics v_deleted=row_count; v_deleted_json := v_deleted_json || jsonb_build_object('workflow_events',v_deleted);
    delete from public.workflow_tasks where workflow_instance_id=any(v_workflow_ids);
    get diagnostics v_deleted=row_count; v_deleted_json := v_deleted_json || jsonb_build_object('workflow_tasks',v_deleted);
  else
    v_deleted_json := v_deleted_json || jsonb_build_object('workflow_events',0,'workflow_tasks',0);
  end if;
  delete from public.workflow_instances where report_id=any(v_ids);
  get diagnostics v_deleted=row_count; v_deleted_json := v_deleted_json || jsonb_build_object('workflow_instances',v_deleted);

  update public.report_signature_events set supersedes_event_id=null where report_id=any(v_ids);
  delete from public.report_signature_events where report_id=any(v_ids);
  get diagnostics v_deleted=row_count; v_deleted_json := v_deleted_json || jsonb_build_object('report_signature_events',v_deleted);
  delete from public.report_signature_assignments where report_id=any(v_ids);
  get diagnostics v_deleted=row_count; v_deleted_json := v_deleted_json || jsonb_build_object('report_signature_assignments',v_deleted);
  delete from public.report_comments where report_id=any(v_ids);
  get diagnostics v_deleted=row_count; v_deleted_json := v_deleted_json || jsonb_build_object('report_comments',v_deleted);
  delete from public.report_audit_events where report_id=any(v_ids);
  get diagnostics v_deleted=row_count; v_deleted_json := v_deleted_json || jsonb_build_object('report_audit_events',v_deleted);
  delete from public.report_assignments where report_id=any(v_ids);
  get diagnostics v_deleted=row_count; v_deleted_json := v_deleted_json || jsonb_build_object('report_assignments',v_deleted);
  delete from public.report_send_cycles where report_id=any(v_ids);
  get diagnostics v_deleted=row_count; v_deleted_json := v_deleted_json || jsonb_build_object('report_send_cycles',v_deleted);
  delete from public.report_values where report_id=any(v_ids);
  get diagnostics v_deleted=row_count; v_deleted_json := v_deleted_json || jsonb_build_object('report_values',v_deleted);
  delete from public.reports where id=any(v_ids);
  get diagnostics v_deleted=row_count;
  if v_deleted <> v_selected then raise exception 'DELETE_COUNT_MISMATCH'; end if;
  v_deleted_json := v_deleted_json || jsonb_build_object('reports',v_deleted);

  update public.admin_data_reset_operations set status='completed',completed_at=statement_timestamp(),actual_effect=jsonb_build_object('deleted',v_deleted_json,'external_cleanup_required',v_asset_cleanup) where id=v_operation;
  return jsonb_build_object('operation_id',v_operation,'status','completed','domain_key','reports','requested_count',v_selected,'selected_count',v_selected,'deleted',v_deleted_json,'preserved',jsonb_build_object('templates',true,'template_versions',true,'signature_profiles',true,'asset_metadata',true,'workflow_architecture',true,'audit_history',true),'external_cleanup_required',v_asset_cleanup,'warnings',case when jsonb_array_length(v_asset_cleanup)>0 then jsonb_build_array('Physical assets were not deleted.') else jsonb_build_array() end);
end
$function$;

revoke all on function public.admin_execute_data_cleanup(text,uuid[],jsonb,text) from public, anon;
grant execute on function public.admin_execute_data_cleanup(text,uuid[],jsonb,text) to authenticated;

insert into private.widgetflow_schema_migrations(id,description)
values('062_factory_reset_report_cleanup_engine','Transactional Protected Admin report cleanup engine');

commit;
