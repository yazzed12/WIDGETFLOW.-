select exists(select 1 from private.widgetflow_schema_migrations where id='082_sticky_notes') as migration_recorded,
to_regclass('public.sticky_notes') is not null as table_exists,
(select relrowsecurity from pg_class where oid='public.sticky_notes'::regclass) as rls_enabled,
has_table_privilege('authenticated','public.sticky_notes','SELECT') as authenticated_select,
has_table_privilege('anon','public.sticky_notes','SELECT') as anon_select,
exists(select 1 from pg_policies where tablename='sticky_notes' and policyname='sticky_notes_select_own') as own_select_policy,
exists(select 1 from pg_policies where tablename='sticky_notes' and policyname='sticky_notes_insert_own') as own_insert_policy,
exists(select 1 from pg_policies where tablename='sticky_notes' and policyname='sticky_notes_update_own') as own_update_policy,
exists(select 1 from pg_policies where tablename='sticky_notes' and policyname='sticky_notes_delete_own') as own_delete_policy;
