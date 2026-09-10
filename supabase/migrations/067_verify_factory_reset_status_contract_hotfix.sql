select exists (
  select 1 from private.widgetflow_schema_migrations
  where id = '066_factory_reset_execution_engine'
) as ledger_066_exists;

select exists (
  select 1 from private.widgetflow_schema_migrations
  where id = '067_factory_reset_status_contract_hotfix'
) as ledger_067_exists;

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.admin_data_reset_operations'::regclass
  and conname = 'admin_data_reset_operations_status_check';

select proname, pg_get_function_identity_arguments(oid) as identity_arguments
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('admin_execute_factory_reset', 'admin_finalize_factory_reset');
