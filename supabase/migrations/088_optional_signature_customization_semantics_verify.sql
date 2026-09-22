with functions as (
  select
    n.nspname as schema_name,
    p.proname,
    pg_get_function_identity_arguments(p.oid) as identity_arguments,
    pg_get_functiondef(p.oid) as definition,
    p.prosecdef as security_definer,
    p.proconfig as configuration
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where (n.nspname = 'public' and p.proname in ('complete_report', 'send_report', 'sign_report'))
     or (n.nspname = 'private' and p.proname in ('complete_report_085_legacy', 'report_effective_signature_configuration', 'validate_sender_signature_roles'))
), privileges as (
  select has_function_privilege('authenticated', 'public.complete_report(uuid,text,jsonb)', 'EXECUTE') as authenticated_can_complete,
         has_function_privilege('anon', 'public.complete_report(uuid,text,jsonb)', 'EXECUTE') as anon_can_complete
)
select
  exists (select 1 from private.widgetflow_schema_migrations where id = '087_signature_role_directory_and_effective_role_hardening') as migration_087_present,
  exists (select 1 from private.widgetflow_schema_migrations where id = '088_optional_signature_customization_semantics') as migration_088_present,
  exists (select 1 from functions where schema_name = 'public' and proname = 'complete_report' and identity_arguments = 'uuid, text, jsonb') as complete_rpc_exists,
  coalesce((select security_definer from functions where schema_name = 'public' and proname = 'complete_report' and identity_arguments = 'uuid, text, jsonb'), false) as complete_is_security_definer,
  coalesce((select configuration @> array['search_path=""']::text[] from functions where schema_name = 'public' and proname = 'complete_report' and identity_arguments = 'uuid, text, jsonb'), false) as complete_has_empty_search_path,
  coalesce((select definition ilike '%private.complete_report_085_legacy%' from functions where schema_name = 'public' and proname = 'complete_report' and identity_arguments = 'uuid, text, jsonb'), false) as delegates_to_canonical_lifecycle,
  coalesce((select not (definition ilike '%SIGNATURE_CONFIGURATION_REQUIRED%' or definition ilike '%report_creator_required%') from functions where schema_name = 'public' and proname = 'complete_report' and identity_arguments = 'uuid, text, jsonb'), false) as no_creator_configuration_gate,
  coalesce((select authenticated_can_complete from privileges), false) as authenticated_can_execute,
  coalesce((select not anon_can_complete from privileges), false) as anon_cannot_execute,
  exists (select 1 from functions where schema_name = 'private' and proname = 'report_effective_signature_configuration') as effective_configuration_helper_exists,
  exists (select 1 from functions where schema_name = 'private' and proname = 'validate_sender_signature_roles') as sender_validator_exists,
  exists (select 1 from functions where schema_name = 'public' and proname = 'send_report') as send_rpc_exists,
  exists (select 1 from functions where schema_name = 'public' and proname = 'send_report' and definition ilike '%report_effective_signature_configuration%') as send_uses_effective_configuration,
  exists (select 1 from functions where schema_name = 'public' and proname = 'sign_report') as sign_rpc_exists,
  exists (select 1 from functions where schema_name = 'public' and proname = 'sign_report' and definition ilike '%report_effective_signature_configuration%') as sign_uses_effective_configuration,
  to_regclass('public.report_signature_configurations') is not null as signature_configuration_table_intact,
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'report_signature_configurations'
      and column_name in ('person_id', 'assigned_person_id', 'recipient_user_id')
  ) as no_person_identity_column;
