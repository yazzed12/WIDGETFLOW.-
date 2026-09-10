begin;

do $guard$
begin
  if not exists (
    select 1 from private.widgetflow_schema_migrations
    where id = '066_factory_reset_execution_engine'
  ) then
    raise exception 'WidgetFlow migration 066_factory_reset_execution_engine must be applied first';
  end if;
  if exists (
    select 1 from private.widgetflow_schema_migrations
    where id = '067_factory_reset_status_contract_hotfix'
  ) then
    raise exception 'WidgetFlow migration 067_factory_reset_status_contract_hotfix has already been applied';
  end if;
end
$guard$;

do $constraint$
declare
  constraint_name text;
begin
  select con.conname
    into constraint_name
  from pg_constraint con
  where con.conrelid = 'public.admin_data_reset_operations'::regclass
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%status%'
  order by con.conname
  limit 1;

  if constraint_name is not null then
    execute format(
      'alter table public.admin_data_reset_operations drop constraint %I',
      constraint_name
    );
  end if;

  alter table public.admin_data_reset_operations
    add constraint admin_data_reset_operations_status_check
    check (status in (
      'planned',
      'previewed',
      'executing',
      'reconciliation_required',
      'completed',
      'failed',
      'cancelled'
    ));
end
$constraint$;

insert into private.widgetflow_schema_migrations(id, description)
values (
  '067_factory_reset_status_contract_hotfix',
  'Allow authoritative factory-reset execution and reconciliation states'
);

commit;
