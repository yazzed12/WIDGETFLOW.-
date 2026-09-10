-- Read-only verifier for 062_factory_reset_report_cleanup_engine.
select exists(select 1 from private.widgetflow_schema_migrations where id='060_factory_reset_backend_foundation') as ledger_060_exists,
       exists(select 1 from private.widgetflow_schema_migrations where id='061_factory_reset_transactional_delete_engine') as ledger_061_exists,
       exists(select 1 from private.widgetflow_schema_migrations where id='062_factory_reset_report_cleanup_engine') as ledger_062_exists;
select p.oid::regprocedure,p.prosecdef,p.proconfig
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='admin_execute_data_cleanup';
select has_function_privilege('anon','public.admin_execute_data_cleanup(text,uuid[],jsonb,text)','execute') as anon_execute,
       has_function_privilege('authenticated','public.admin_execute_data_cleanup(text,uuid[],jsonb,text)','execute') as authenticated_execute;
select has_table_privilege('authenticated','public.admin_data_reset_operations','insert') as direct_reset_audit_insert,
       has_table_privilege('authenticated','public.notifications','delete') as direct_notification_delete,
       has_table_privilege('authenticated','public.reports','delete') as direct_report_delete;
select position('reports' in pg_get_functiondef(p.oid))>0 as reports_domain,
       position('DELETE SELECTED REPORTS' in pg_get_functiondef(p.oid))>0 as report_confirmation,
       position('hashtextextended(''widgetflow:factory-reset''' in pg_get_functiondef(p.oid))>0 as shared_lock,
       position('current_send_cycle_id=null' in lower(pg_get_functiondef(p.oid)))>0 as cycle_break,
       position('supersedes_event_id=null' in lower(pg_get_functiondef(p.oid)))>0 as signature_chain_break,
       position('DELETE FROM public.reports' in upper(pg_get_functiondef(p.oid)))>0 as report_delete,
       position('admin_execute_factory_reset' in pg_get_functiondef(p.oid))=0 as no_full_reset_rpc
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='admin_execute_data_cleanup';
select exists(select 1 from pg_proc where proname='send_report') as send_report_exists,
       exists(select 1 from pg_proc where proname='save_report_draft') as save_report_draft_exists,
       exists(select 1 from pg_proc where proname='sign_report') as sign_report_exists,
       exists(select 1 from pg_proc where proname='save_template_draft') as save_template_draft_exists,
       exists(select 1 from pg_proc where proname='approve_template') as approve_template_exists;
select exists(select 1 from pg_proc where proname='current_user_is_protected_admin') as protected_admin_helper_exists,
       to_regclass('private.widgetflow_schema_migrations') as migration_ledger,
       to_regclass('public.admin_data_reset_operations') as reset_audit_table;

-- Safe inspection-only shape; do not execute:
-- select public.admin_execute_data_cleanup('reports', ARRAY['00000000-0000-0000-0000-000000000000']::uuid[], '{}'::jsonb, 'DELETE SELECTED REPORTS');
