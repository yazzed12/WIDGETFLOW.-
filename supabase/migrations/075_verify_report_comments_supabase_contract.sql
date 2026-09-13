select exists(select 1 from private.widgetflow_schema_migrations where id='075_report_comments_supabase_contract') as migration_075_recorded;
select to_regclass('public.report_comments') is not null as report_comments_exists;
select exists(select 1 from pg_constraint where conname='report_comments_report_id_fkey') as report_fk_exists;
select proname,prosecdef,coalesce(proconfig::text,'') like '%search_path=%' as hardened from pg_proc where proname in('list_report_comments','add_report_comment');
select relrowsecurity from pg_class where oid='public.report_comments'::regclass;
