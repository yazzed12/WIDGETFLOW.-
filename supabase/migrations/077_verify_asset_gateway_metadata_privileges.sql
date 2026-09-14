select
  exists (
    select 1
    from private.widgetflow_schema_migrations
    where id = '077_asset_gateway_metadata_privileges'
  ) as migration_077_recorded,
  to_regclass('public.asset_metadata') as asset_metadata_table,
  has_table_privilege(
    'service_role',
    'public.asset_metadata',
    'select'
  ) as service_role_select,
  has_table_privilege(
    'service_role',
    'public.asset_metadata',
    'insert'
  ) as service_role_insert,
  has_table_privilege(
    'service_role',
    'public.asset_metadata',
    'update'
  ) as service_role_update,
  has_table_privilege(
    'service_role',
    'public.asset_metadata',
    'delete'
  ) as service_role_delete,
  has_table_privilege(
    'authenticated',
    'public.asset_metadata',
    'insert'
  ) as authenticated_insert,
  has_table_privilege(
    'authenticated',
    'public.asset_metadata',
    'update'
  ) as authenticated_update,
  has_table_privilege(
    'authenticated',
    'public.asset_metadata',
    'delete'
  ) as authenticated_delete;
