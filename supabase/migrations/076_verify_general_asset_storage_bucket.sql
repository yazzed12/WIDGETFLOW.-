select
  exists (
    select 1
    from private.widgetflow_schema_migrations
    where id = '076_general_asset_storage_bucket'
  ) as migration_076_applied,
  b.id,
  b.name,
  b.public,
  b.file_size_limit,
  b.allowed_mime_types
from storage.buckets b
where b.id = 'widgetflow-assets'
  and b.name = 'widgetflow-assets';
