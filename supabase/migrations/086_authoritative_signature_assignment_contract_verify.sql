/* Read-only verifier for Migration 086. */
with fn as (
  select n.nspname, p.proname,
    pg_get_function_identity_arguments(p.oid) as identity_arguments,
    p.prosecdef, coalesce(p.proconfig::text, '') as config,
    pg_get_functiondef(p.oid) as definition
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where (n.nspname, p.proname) in (
    ('private', 'report_effective_signature_configuration'),
    ('private', 'signature_user_has_required_role'),
    ('private', 'validate_sender_signature_roles'),
    ('public', 'set_report_signature_configuration'),
    ('public', 'reset_report_signature_configuration'),
    ('public', 'complete_report'), ('public', 'send_report'), ('public', 'sign_report')
  )
)
select
  exists (select 1 from private.widgetflow_schema_migrations where id = '086_authoritative_signature_assignment_contract') as migration_086_recorded,
  to_regclass('public.report_signature_configurations') is not null as configuration_table_exists,
  coalesce((select relrowsecurity from pg_class where oid = 'public.report_signature_configurations'::regclass), false) as configuration_rls_enabled,
  has_table_privilege('authenticated', 'public.report_signature_configurations', 'SELECT') as authenticated_select,
  has_table_privilege('authenticated', 'public.report_signature_configurations', 'INSERT') as authenticated_insert,
  has_table_privilege('authenticated', 'public.report_signature_configurations', 'UPDATE') as authenticated_update,
  has_table_privilege('authenticated', 'public.report_signature_configurations', 'DELETE') as authenticated_delete,
  exists (select 1 from fn where nspname = 'private' and proname = 'report_effective_signature_configuration' and prosecdef and config like '%search_path%') as helper_hardened,
  exists (select 1 from fn where nspname = 'private' and proname = 'signature_user_has_required_role' and prosecdef and config like '%search_path%') as role_helper_hardened,
  exists (select 1 from fn where nspname = 'private' and proname = 'validate_sender_signature_roles' and prosecdef and config like '%search_path%') as sender_helper_hardened,
  to_regprocedure('public.set_report_signature_configuration(uuid,text,text,text)') is not null as override_rpc_exists,
  to_regprocedure('public.reset_report_signature_configuration(uuid,text)') is not null as reset_rpc_exists,
  to_regprocedure('public.complete_report(uuid,text,jsonb)') is not null as complete_rpc_exists,
  to_regprocedure('public.send_report(uuid,uuid[],text,jsonb)') is not null as send_rpc_exists,
  to_regprocedure('public.sign_report(uuid,uuid,jsonb)') is not null as sign_rpc_exists,
  coalesce((select definition ilike '%SIGNATURE_CONFIGURATION_REQUIRED%' from fn where nspname = 'public' and proname = 'complete_report' limit 1), false) as creator_required_enforced,
  coalesce((select bool_or(definition ilike '%SIGNATURE_REQUIRED_ROLE_MISMATCH%') from fn where nspname = 'public' and proname in ('send_report', 'sign_report')), false) as required_role_enforced,
  coalesce((select definition ilike '%component_key%' from fn where nspname = 'public' and proname = 'sign_report' limit 1), false) as component_key_persisted,
  coalesce((select definition ilike '%private.send_report_085_legacy%' from fn where nspname = 'public' and proname = 'send_report' limit 1), false) as send_legacy_preserved,
  coalesce((select definition ilike '%private.sign_report_085_legacy%' from fn where nspname = 'public' and proname = 'sign_report' limit 1), false) as sign_legacy_preserved,
  coalesce((select definition ilike '%private.complete_report_085_legacy%' from fn where nspname = 'public' and proname = 'complete_report' limit 1), false) as complete_legacy_preserved,
  exists (select 1 from pg_policy pol where pol.schemaname = 'public' and pol.tablename = 'report_signature_configurations' and pol.cmd = 'r') as configuration_read_policy;

select nspname, proname, identity_arguments, prosecdef, config
from fn order by nspname, proname, identity_arguments;
