/* Read-only verifier for local migration 089. Every result is expected TRUE. */
with functions as (
  select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) args,
         p.prosecdef, coalesce(p.proconfig, '{}'::text[]) config, pg_get_functiondef(p.oid) definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where (n.nspname,p.proname) in (('private','report_effective_signature_definitions'),('private','validate_sender_signature_roles'),('public','send_report'),('public','sign_report'))
), effective as (
  select * from functions where nspname='private' and proname='report_effective_signature_definitions' and args='p_report_id uuid'
), sender as (
  select * from functions where nspname='private' and proname='validate_sender_signature_roles' and args='p_report_id uuid'
), send_fn as (
  select * from functions where nspname='public' and proname='send_report' and args like 'p_report_id uuid, p_recipient_user_ids uuid[], p_note text, p_signature_mappings jsonb'
), sign_fn as (
  select * from functions where nspname='public' and proname='sign_report' and args like 'p_report_id uuid, p_assignment_id uuid, p_payload jsonb'
)
select
  exists(select 1 from private.widgetflow_schema_migrations where id='088_optional_signature_customization_semantics') as migration_088_present,
  exists(select 1 from private.widgetflow_schema_migrations where id='089_unified_signature_definition_and_report_customization') as migration_089_present,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='report_signature_configurations' and column_name='display_label_override') as label_override_column_exists,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='report_signature_configurations' and column_name='signature_role') as signer_context_storage_exists,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='report_signature_configurations' and column_name='required_role_key') as required_role_storage_exists,
  not exists(select 1 from information_schema.columns where table_schema='public' and table_name='report_signature_configurations' and column_name in ('recipient_user_id','person_id','assigned_person_id')) as no_person_identity_columns,
  exists(select 1 from effective) as effective_definition_helper_exists,
  exists(select 1 from effective where prosecdef and config @> array['search_path=""']::text[]) as effective_helper_is_definer_with_empty_search_path,
  exists(select 1 from effective where definition ilike '%display_label%' and definition ilike '%signature_role%' and definition ilike '%required_role_key%' and definition ilike '%report_signature_configurations%') as effective_helper_exposes_label_context_role_and_override,
  exists(select 1 from effective where definition ilike '%field_key%' and definition ilike '%value ->> ''key''%' and definition ilike '%configuration%') as effective_helper_supports_old_and_new_snapshot_keys,
  exists(select 1 from sender where definition ilike '%report_effective_signature_definitions%' and definition ilike '%signature_role=''sender''%') as sender_uses_effective_context_only,
  exists(select 1 from send_fn) as public_send_contract_exists,
  exists(select 1 from send_fn where definition ilike '%report_effective_signature_definitions%' and definition ilike '%definition.signature_role<>''receiver''%') as send_uses_effective_receiver_context,
  exists(select 1 from send_fn where definition ilike '%definition.required_role_key%' and definition ilike '%signature_user_has_required_role%') as send_uses_effective_required_role,
  exists(select 1 from send_fn where definition ilike '%signature_field_key%' and definition ilike '%definition.display_label%') as send_uses_field_key_and_effective_label_snapshot,
  exists(select 1 from send_fn where definition ilike '%report_audit%' and definition ilike '%REPORT_RECEIVED%') as send_preserves_audit_and_recipient_notifications,
  exists(select 1 from sign_fn where definition ilike '%report_effective_signature_definitions%' and definition ilike '%definition.signature_role<>''receiver''%') as sign_uses_effective_receiver_context,
  exists(select 1 from sign_fn where definition ilike '%definition.required_role_key%' and definition ilike '%signature_user_has_required_role%') as sign_uses_effective_required_role,
  exists(select 1 from sign_fn where definition ilike '%report_assignment_id%' and definition ilike '%send_cycle_id%' and definition ilike '%signature_field_key%') as sign_requires_current_cycle_mapping_and_stable_identity,
  to_regprocedure('public.set_report_signature_configuration(uuid,text,text,text,text)') is not null as five_argument_configuration_rpc_exists,
  has_function_privilege('authenticated','public.set_report_signature_configuration(uuid,text,text,text,text)','execute') as authenticated_can_set_configuration,
  not has_function_privilege('anon','public.set_report_signature_configuration(uuid,text,text,text,text)','execute') as anon_cannot_set_configuration,
  not has_function_privilege('authenticated','private.report_effective_signature_definitions(uuid)','execute') as authenticated_cannot_execute_private_effective_helper,
  exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('report_signature_assignments','report_signature_events')) as signature_assignment_and_event_tables_remain_intact;
