-- Read-only verification for 078_template_return_and_report_return_schema_fix.
select
  exists (
    select 1 from private.widgetflow_schema_migrations
    where id = '078_template_return_and_report_return_schema_fix'
  ) as migration_078_recorded,
  to_regclass('public.templates') as templates_table,
  to_regclass('public.report_assignments') as report_assignments_table,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'templates'
      and column_name = 'returned_at'
  ) as templates_returned_at_exists,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'templates'
      and column_name = 'return_reason'
  ) as templates_return_reason_exists,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'report_assignments'
      and column_name = 'updated_at'
  ) as report_assignments_updated_at_exists,
  to_regprocedure('public.return_report(uuid,uuid,text)') is not null as return_report_exists,
  to_regprocedure('public.return_template_for_revision(uuid,text)') is not null as template_return_exists,
  has_function_privilege('authenticated', 'public.return_report(uuid,uuid,text)', 'EXECUTE') as authenticated_can_return_report,
  has_function_privilege('authenticated', 'public.return_template_for_revision(uuid,text)', 'EXECUTE') as authenticated_can_return_template,
  pg_get_functiondef('public.return_report(uuid,uuid,text)'::regprocedure) not like '%report_assignments%updated_at%' as return_report_has_no_invalid_assignment_timestamp,
  pg_get_functiondef('public.return_template_for_revision(uuid,text)'::regprocedure) like '%TEMPLATE_RETURNED%' as template_return_audits,
  pg_get_functiondef('public.return_template_for_revision(uuid,text)'::regprocedure) like '%status = ''draft''%' as template_return_uses_draft,
  pg_get_functiondef('public.return_template_for_revision(uuid,text)'::regprocedure) like '%RETURN_REASON_REQUIRED%' as template_return_requires_reason;
