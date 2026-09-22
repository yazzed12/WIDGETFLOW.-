select exists(select 1 from private.widgetflow_schema_migrations where id='080_report_display_id') as migration_recorded,
  to_regclass('public.reports') is not null as reports_exists,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='reports' and column_name='report_display_id' and is_nullable='NO') as display_id_required,
  exists(select 1 from pg_constraint where conname='reports_report_display_id_uq') as unique_constraint_exists,
  exists(select 1 from pg_constraint where conname='reports_report_display_id_format_ck') as format_constraint_exists,
  exists(select 1 from pg_trigger where tgname='reports_assign_display_id') as creation_trigger_exists,
  not exists(select 1 from public.reports where report_display_id is null or report_display_id !~ '^RPT-[A-Z]{2}[0-9]{3,}-[0-9]{4}-[0-9]{6,}$') as existing_rows_valid;
