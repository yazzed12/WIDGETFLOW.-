select exists(select 1 from private.widgetflow_schema_migrations where id='073_live_account_read_contract') as ledger_073_exists;
select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('admin_data_control_browse','list_report_recipient_directory');
