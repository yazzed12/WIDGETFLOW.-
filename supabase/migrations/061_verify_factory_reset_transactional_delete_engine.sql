-- Read-only verifier for 061_factory_reset_transactional_delete_engine.
select exists (select 1 from private.widgetflow_schema_migrations where id='060_factory_reset_backend_foundation') as ledger_060_exists;
select exists (select 1 from private.widgetflow_schema_migrations where id='061_factory_reset_transactional_delete_engine') as ledger_061_exists;
select p.oid::regprocedure, p.prosecdef, p.proconfig
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='admin_execute_data_cleanup';
select has_function_privilege('anon','public.admin_execute_data_cleanup(text,uuid[],jsonb,text)','execute') as anon_execute,
       has_function_privilege('authenticated','public.admin_execute_data_cleanup(text,uuid[],jsonb,text)','execute') as authenticated_execute;
select has_table_privilege('authenticated','public.admin_data_reset_operations','insert') as direct_reset_audit_insert,
       has_table_privilege('authenticated','public.notifications','delete') as direct_notification_delete;
select exists (select 1 from pg_proc where proname='admin_execute_factory_reset') as full_reset_rpc_exists;
select exists (select 1 from pg_proc where proname='send_report') as send_report_exists,
       exists (select 1 from pg_proc where proname='save_template_draft') as save_template_draft_exists,
       exists (select 1 from pg_proc where proname='sign_report') as sign_report_exists;
select exists (select 1 from pg_proc where proname='current_user_is_protected_admin') as protected_admin_helper_exists;
select to_regclass('private.widgetflow_schema_migrations') as migration_ledger,
       to_regclass('public.admin_data_reset_operations') as reset_audit_table;

-- Safe inspection-only call shape; do not execute a destructive call here.
-- select public.admin_execute_data_cleanup('notifications', ARRAY['00000000-0000-0000-0000-000000000000']::uuid[], '{}'::jsonb, 'DELETE SELECTED NOTIFICATIONS');
