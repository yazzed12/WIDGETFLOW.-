select exists(select 1 from private.widgetflow_schema_migrations where id='065_factory_reset_asset_cleanup_engine') as ledger_065_exists;
select exists(select 1 from private.widgetflow_schema_migrations where id='066_factory_reset_execution_engine') as ledger_066_exists;
select p.oid::regprocedure, p.prosecdef, p.proconfig
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('admin_execute_factory_reset','admin_finalize_factory_reset');
select has_function_privilege('anon','public.admin_execute_factory_reset(text)','execute') as anon_execute,
       has_function_privilege('authenticated','public.admin_execute_factory_reset(text)','execute') as authenticated_execute,
       has_function_privilege('anon','public.admin_finalize_factory_reset(uuid)','execute') as anon_finalize,
       has_function_privilege('authenticated','public.admin_finalize_factory_reset(uuid)','execute') as authenticated_finalize;
select exists(select 1 from pg_proc where proname='send_report') as send_report_exists,
       exists(select 1 from pg_proc where proname='save_template_draft') as save_template_draft_exists,
       exists(select 1 from pg_proc where proname='admin_execute_factory_reset') as reset_execute_exists;
