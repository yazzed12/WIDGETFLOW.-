select
  exists (
    select 1 from private.widgetflow_schema_migrations
    where id = '084_template_timeline_read'
  ) as migration_084_applied,
  to_regprocedure('public.get_template_timeline(uuid)') is not null as function_exists,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_template_timeline'
      and p.prosecdef
      and pg_get_functiondef(p.oid) like '%set search_path = ''''%'
  ) as hardened_security_definer,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_template_timeline'
      and pg_get_functiondef(p.oid) not ilike '%event_data%'
  ) as raw_event_data_excluded;
