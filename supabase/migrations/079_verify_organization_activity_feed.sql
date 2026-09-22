select
  exists (select 1 from private.widgetflow_schema_migrations where id='079_organization_activity_feed') as migration_recorded,
  to_regprocedure('public.list_organization_activity(text,text,timestamptz,timestamptz,integer,timestamptz,uuid)') is not null as rpc_exists,
  has_function_privilege('authenticated','public.list_organization_activity(text,text,timestamptz,timestamptz,integer,timestamptz,uuid)','EXECUTE') as authenticated_can_execute,
  has_function_privilege('anon','public.list_organization_activity(text,text,timestamptz,timestamptz,integer,timestamptz,uuid)','EXECUTE') as anon_can_execute,
  to_regclass('public.template_audit_events') is not null as template_source_exists,
  to_regclass('public.report_audit_events') is not null as report_source_exists,
  to_regclass('public.report_signature_events') is not null as signature_source_exists,
  pg_get_functiondef('public.list_organization_activity(text,text,timestamptz,timestamptz,integer,timestamptz,uuid)'::regprocedure) not ilike '%event_data%' as raw_event_data_not_exposed;
