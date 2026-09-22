select exists(select 1 from private.widgetflow_schema_migrations where id='081_template_display_id') as migration_recorded,
exists(select 1 from information_schema.columns where table_schema='public' and table_name='templates' and column_name='template_display_id') as display_id_column,
exists(select 1 from pg_proc where proname='approve_template') as approval_function_exists,
exists(select 1 from pg_class where relname='template_display_id_counters') as counter_exists,
exists(select 1 from pg_trigger where tgname='templates_assign_display_id') as assignment_trigger_exists,
exists(select 1 from pg_indexes where indexname='templates_display_id_uq') as unique_index_exists,
not exists(select 1 from public.templates where template_display_id is not null and template_display_id !~ '^TMP-[A-Z]{2}[0-9]{3,}-[A-Z]{2}[0-9]{3,}-[0-9]{4}-[0-9]{6,}$') as ids_valid;
