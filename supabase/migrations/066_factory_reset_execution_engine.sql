begin;

do $guard$
begin
  if not exists (select 1 from private.widgetflow_schema_migrations where id = '065_factory_reset_asset_cleanup_engine') then
    raise exception 'WidgetFlow migration 065_factory_reset_asset_cleanup_engine must be applied first';
  end if;
  if exists (select 1 from private.widgetflow_schema_migrations where id = '066_factory_reset_execution_engine') then
    raise exception 'WidgetFlow migration 066_factory_reset_execution_engine has already been applied';
  end if;
end
$guard$;

create or replace function public.admin_execute_factory_reset(p_confirmation text)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
  actor uuid := auth.uid(); operation_id uuid; asset_rows jsonb; deleted jsonb := '{}'::jsonb; count_rows bigint;
begin
  if actor is null or not private.current_user_is_protected_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_confirmation is distinct from 'RESET WIDGETFLOW DATA' then raise exception 'CONFIRMATION_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('widgetflow:factory-reset', 0));
  if exists (select 1 from public.admin_data_reset_operations where operation_type = 'FACTORY_RESET' and status = 'previewed') then raise exception 'RESET_ALREADY_IN_PROGRESS'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('asset_id', id, 'bucket_name', bucket_name, 'object_path', object_path, 'asset_purpose', asset_purpose)), '[]'::jsonb)
    into asset_rows from public.asset_metadata;
  insert into public.admin_data_reset_operations(actor_user_id, operation_type, scope, requested_selection, planned_effect, status)
    values (actor, 'FACTORY_RESET', jsonb_build_object('mode','full'), jsonb_build_object('confirmation','RESET WIDGETFLOW DATA'), jsonb_build_object('external_assets',asset_rows), 'previewed')
    returning id into operation_id;

  update public.reports set current_send_cycle_id = null;
  update public.report_signature_events set supersedes_event_id = null;
  update public.templates set supersedes_template_id = null;

  delete from public.workflow_events; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('workflow_events',count_rows);
  delete from public.workflow_tasks; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('workflow_tasks',count_rows);
  delete from public.workflow_instances; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('workflow_instances',count_rows);
  delete from public.report_signature_events; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('report_signature_events',count_rows);
  delete from public.report_signature_assignments; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('report_signature_assignments',count_rows);
  delete from public.report_comments; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('report_comments',count_rows);
  delete from public.report_audit_events; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('report_audit_events',count_rows);
  delete from public.notifications; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('notifications',count_rows);
  delete from public.report_assignments; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('report_assignments',count_rows);
  delete from public.report_send_cycles; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('report_send_cycles',count_rows);
  delete from public.report_values; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('report_values',count_rows);
  delete from public.reports; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('reports',count_rows);
  delete from public.template_comments; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('template_comments',count_rows);
  delete from public.template_audit_events; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('template_audit_events',count_rows);
  delete from public.template_fields; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('template_fields',count_rows);
  delete from public.template_sections; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('template_sections',count_rows);
  delete from public.template_tags; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('template_tags',count_rows);
  delete from public.template_versions; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('template_versions',count_rows);
  delete from public.workflow_versions; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('workflow_versions',count_rows);
  delete from public.workflow_definitions; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('workflow_definitions',count_rows);
  delete from public.templates; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('templates',count_rows);
  delete from public.standard_pack_items; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('standard_pack_items',count_rows);
  delete from public.standard_pack_versions; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('standard_pack_versions',count_rows);
  delete from public.standard_packs; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('standard_packs',count_rows);
  delete from public.content_library_items; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('content_library_items',count_rows);
  delete from public.categories; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('categories',count_rows);
  delete from public.user_packs; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('user_packs',count_rows);
  delete from public.signature_profiles; get diagnostics count_rows = row_count; deleted := deleted || jsonb_build_object('signature_profiles',count_rows);

  update public.admin_data_reset_operations
    set status = 'previewed', planned_effect = planned_effect || jsonb_build_object('deleted',deleted), actual_effect = jsonb_build_object('deleted',deleted,'external_cleanup',asset_rows)
    where id = operation_id;
  return jsonb_build_object('operation_id',operation_id,'status','reconciliation_required','deleted',deleted,'external_cleanup',asset_rows,'preserved',jsonb_build_array('Protected Admin','Profiles','Auth Users','Roles','Permissions','Role Permissions','Role History','Governance','Configuration','Audit','Migration Ledger','Reset Audit'),'warnings',jsonb_build_array('Storage objects require server-side exact-object reconciliation.'));
end
$function$;

create or replace function public.admin_finalize_factory_reset(p_operation_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare actor uuid := auth.uid(); removed bigint;
begin
  if actor is null or not private.current_user_is_protected_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended('widgetflow:factory-reset', 0));
  if not exists (select 1 from public.admin_data_reset_operations where id=p_operation_id and operation_type='FACTORY_RESET' and status='previewed') then raise exception 'RESET_OPERATION_NOT_RECONCILABLE'; end if;
  delete from public.asset_metadata where id in (select (item->>'asset_id')::uuid from public.admin_data_reset_operations op, jsonb_array_elements(op.actual_effect->'external_cleanup') item where op.id=p_operation_id);
  get diagnostics removed = row_count;
  update public.admin_data_reset_operations set status='completed', completed_at=statement_timestamp(), actual_effect=actual_effect || jsonb_build_object('metadata_deleted',removed) where id=p_operation_id;
  return jsonb_build_object('operation_id',p_operation_id,'status','completed','metadata_deleted',removed);
end
$function$;

revoke all on function public.admin_execute_factory_reset(text) from public, anon;
revoke all on function public.admin_finalize_factory_reset(uuid) from public, anon;
grant execute on function public.admin_execute_factory_reset(text) to authenticated;
grant execute on function public.admin_finalize_factory_reset(uuid) to authenticated;
insert into private.widgetflow_schema_migrations(id, description) values ('066_factory_reset_execution_engine','Transactional Protected Admin full reset with external Storage reconciliation');
commit;
