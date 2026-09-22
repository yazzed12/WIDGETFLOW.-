with fn as (
  select n.nspname, p.proname, p.prosecdef,
         coalesce(array_to_string(p.proconfig, ','), '') as config,
         pg_get_functiondef(p.oid) as definition
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where (n.nspname = 'public' and p.proname in ('list_signature_role_directory','complete_report'))
     or (n.nspname = 'private' and p.proname = 'validate_sender_signature_roles')
), objects as (
  select to_regclass('public.report_signature_configurations') is not null as config_table,
         to_regclass('public.report_signature_assignments') is not null as assignment_table
)
select
  exists(select 1 from private.widgetflow_schema_migrations where id='086_authoritative_signature_assignment_contract') as migration_086_present,
  exists(select 1 from private.widgetflow_schema_migrations where id='087_signature_role_directory_and_effective_role_hardening') as migration_087_expected,
  exists(select 1 from fn where nspname='public' and proname='list_signature_role_directory' and prosecdef and config like '%search_path%') as role_directory_hardened,
  exists(select 1 from fn where nspname='public' and proname='list_signature_role_directory' and definition ilike '%reports.view_own%' and definition ilike '%reports.edit_draft%' and definition ilike '%is_active%') as role_directory_authorized,
  exists(select 1 from fn where nspname='public' and proname='complete_report' and definition ilike '%report_signature_configurations%' and definition ilike '%is_override%') as creator_requires_explicit_config,
  exists(select 1 from fn where nspname='private' and proname='validate_sender_signature_roles' and definition ilike '%report_effective_signature_configuration%') as sender_uses_effective_config,
  exists(select 1 from fn where nspname='public' and proname='complete_report' and definition ilike '%private.complete_report_085_legacy%') as lifecycle_wrapper_intact,
  objects.config_table and objects.assignment_table as signature_tables_intact,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='report_signature_configurations' and column_name in ('recipient_user_id','user_id')) as config_has_person_column;
