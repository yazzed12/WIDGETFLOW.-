-- Read-only verifier for 060_factory_reset_backend_foundation.
select exists (select 1 from private.widgetflow_schema_migrations where id='059_template_dynamic_pending_reviewer_eligibility') as ledger_059_exists;
select exists (select 1 from private.widgetflow_schema_migrations where id='060_factory_reset_backend_foundation') as ledger_060_exists;
select to_regclass('public.admin_data_reset_operations') as reset_audit_table;
select relrowsecurity from pg_class where oid='public.admin_data_reset_operations'::regclass;
select proname, prosecdef, proconfig from pg_proc where proname in ('admin_data_control_domains','admin_data_control_summary','admin_data_control_browse','admin_account_data_summary','admin_preview_data_cleanup','admin_preview_factory_reset');
select has_function_privilege('anon','public.admin_data_control_summary()','execute') as anon_summary_execute,
       has_function_privilege('authenticated','public.admin_data_control_summary()','execute') as authenticated_summary_execute;
select has_table_privilege('authenticated','public.admin_data_reset_operations','select') as authenticated_direct_read,
       has_table_privilege('authenticated','public.admin_data_reset_operations','insert') as authenticated_direct_insert;
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname='public' and tablename='admin_data_reset_operations';
select position('accounts' in pg_get_functiondef(p.oid)) > 0 as catalog_contains_accounts,
       position('workflow_runtime_data' in pg_get_functiondef(p.oid)) > 0 as catalog_contains_workflow_runtime
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='admin_data_control_domains';
select exists (select 1 from pg_proc where proname='admin_execute_factory_reset') as destructive_reset_rpc_exists;
select exists (select 1 from pg_proc where proname='send_report') as send_report_unchanged_check,
       exists (select 1 from pg_proc where proname='save_template_draft') as save_template_draft_unchanged_check;
