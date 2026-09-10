select exists (select 1 from private.widgetflow_schema_migrations where id='071_archival_identity_account_purge') as ledger_071_exists;
select column_name, is_nullable, data_type from information_schema.columns where table_schema='public' and table_name='profiles' and column_name in ('id','auth_user_id','status');
select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.profiles'::regclass and conname='profiles_auth_user_id_fk';
select indexname, indexdef from pg_indexes where schemaname='public' and tablename='profiles' and indexname='profiles_auth_user_id_uq';
select exists (select 1 from pg_trigger where tgrelid='public.user_role_history'::regclass and tgname='user_role_history_append_only') as history_append_only;
select exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='admin_preview_factory_reset') as preview_exists;
