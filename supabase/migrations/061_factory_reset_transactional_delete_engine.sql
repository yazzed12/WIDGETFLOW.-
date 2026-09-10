begin;

do $migration_guard$
begin
  if not exists (select 1 from private.widgetflow_schema_migrations where id = '060_factory_reset_backend_foundation') then
    raise exception 'WidgetFlow migration 060_factory_reset_backend_foundation must be applied first';
  end if;
  if exists (select 1 from private.widgetflow_schema_migrations where id = '061_factory_reset_transactional_delete_engine') then
    raise exception 'WidgetFlow migration 061_factory_reset_transactional_delete_engine has already been applied';
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
  v_operation uuid;
  v_deleted bigint := 0;
  v_requested jsonb;
begin
  if v_actor is null or not private.current_user_is_protected_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_domain_key is distinct from 'notifications' then raise exception 'UNSUPPORTED_DOMAIN'; end if;
  if p_confirmation is distinct from 'DELETE SELECTED NOTIFICATIONS' then raise exception 'CONFIRMATION_REQUIRED'; end if;
  if p_options is not null and p_options <> '{}'::jsonb then raise exception 'UNSUPPORTED_OPTIONS'; end if;
  if p_record_ids is null or cardinality(p_record_ids) = 0 then raise exception 'EMPTY_SELECTION'; end if;
  if cardinality(p_record_ids) > 1000 then raise exception 'SELECTION_TOO_LARGE'; end if;

  perform pg_advisory_xact_lock(hashtextextended('widgetflow:factory-reset', 0));
  select array_agg(distinct id order by id) into v_ids from unnest(p_record_ids) as supplied(id);
  select array_agg(n.id order by n.id) into v_existing
  from public.notifications n where n.id = any(v_ids);
  if coalesce(cardinality(v_existing), 0) <> coalesce(cardinality(v_ids), 0) then raise exception 'RECORD_NOT_FOUND'; end if;

  v_requested := jsonb_build_object('domain_key', p_domain_key, 'record_ids', to_jsonb(v_ids));
  insert into public.admin_data_reset_operations (actor_user_id, operation_type, scope, requested_selection, planned_effect, status)
  values (v_actor, 'SELECTIVE_CLEANUP', jsonb_build_object('domain_key',p_domain_key), v_requested,
          jsonb_build_object('notifications', cardinality(v_ids), 'external_cleanup_required', false), 'previewed')
  returning id into v_operation;

  delete from public.notifications where id = any(v_ids);
  get diagnostics v_deleted = row_count;
  if v_deleted <> cardinality(v_ids) then raise exception 'RECORD_NOT_FOUND'; end if;

  update public.admin_data_reset_operations
  set status = 'completed', completed_at = statement_timestamp(),
      actual_effect = jsonb_build_object('notifications', v_deleted, 'external_cleanup_required', false)
  where id = v_operation;

  return jsonb_build_object('operation_id',v_operation,'status','completed','domain_key',p_domain_key,'selected_count',cardinality(v_ids),'deleted',jsonb_build_object('notifications',v_deleted),'preserved',jsonb_build_object('architecture',true,'audit_history',true),'external_cleanup_required',jsonb_build_array(),'warnings',jsonb_build_array());
end
$function$;

revoke all on function public.admin_execute_data_cleanup(text, uuid[], jsonb, text) from public, anon;
grant execute on function public.admin_execute_data_cleanup(text, uuid[], jsonb, text) to authenticated;

insert into private.widgetflow_schema_migrations (id, description)
values ('061_factory_reset_transactional_delete_engine', 'Transactional Protected Admin cleanup engine for notifications');

commit;
