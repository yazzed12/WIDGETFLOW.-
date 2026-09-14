begin;

do $guard$
begin
  if not exists (
    select 1
    from private.widgetflow_schema_migrations
    where id = '076_general_asset_storage_bucket'
  ) then
    raise exception 'WidgetFlow migration 076_general_asset_storage_bucket must be applied first';
  end if;

  if exists (
    select 1
    from private.widgetflow_schema_migrations
    where id = '077_asset_gateway_metadata_privileges'
  ) then
    raise exception 'WidgetFlow migration 077_asset_gateway_metadata_privileges has already been applied';
  end if;
end
$guard$;

-- The Edge Function is the trusted server boundary for general assets.
-- Browser roles remain denied direct table writes by the security baseline.
-- SELECT is required for metadata lookup and INSERT ... RETURNING/select;
-- UPDATE is required only for the explicit staged-asset link operation.
grant select, insert, update on table public.asset_metadata to service_role;

insert into private.widgetflow_schema_migrations (
  id,
  description
)
values (
  '077_asset_gateway_metadata_privileges',
  'Least-privilege service-role metadata access for the general asset gateway'
);

commit;
