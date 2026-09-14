begin;

do $guard$
begin
  if not exists (
    select 1
    from private.widgetflow_schema_migrations
    where id = '075_report_comments_supabase_contract'
  ) then
    raise exception 'WidgetFlow migration 075_report_comments_supabase_contract must be applied first';
  end if;

  if exists (
    select 1
    from private.widgetflow_schema_migrations
    where id = '076_general_asset_storage_bucket'
  ) then
    raise exception 'WidgetFlow migration 076_general_asset_storage_bucket has already been applied';
  end if;
end
$guard$;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'widgetflow-assets',
  'widgetflow-assets',
  false,
  10485760,
  array[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
);

insert into private.widgetflow_schema_migrations (
  id,
  description
)
values (
  '076_general_asset_storage_bucket',
  'Provision private general report and template asset Storage bucket'
);

commit;
