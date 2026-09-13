select
  exists (select 1 from private.widgetflow_schema_migrations where id = '074_notification_read_state_rpc') as migration_074_recorded,
  to_regprocedure('public.mark_my_notification_read(uuid)') is not null as mark_one_exists,
  to_regprocedure('public.mark_my_notifications_read()') is not null as mark_all_exists,
  has_function_privilege('authenticated', 'public.mark_my_notification_read(uuid)', 'EXECUTE') as authenticated_mark_one_execute,
  has_function_privilege('authenticated', 'public.mark_my_notifications_read()', 'EXECUTE') as authenticated_mark_all_execute,
  not has_function_privilege('anon', 'public.mark_my_notification_read(uuid)', 'EXECUTE') as anon_mark_one_denied,
  not has_function_privilege('anon', 'public.mark_my_notifications_read()', 'EXECUTE') as anon_mark_all_denied,
  not has_function_privilege('public', 'public.mark_my_notification_read(uuid)', 'EXECUTE') as public_mark_one_denied,
  not has_function_privilege('public', 'public.mark_my_notifications_read()', 'EXECUTE') as public_mark_all_denied,
  has_table_privilege('authenticated', 'public.notifications', 'SELECT') as notification_select_preserved,
  not has_table_privilege('authenticated', 'public.notifications', 'UPDATE') as notification_update_not_granted;

select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  p.prosecdef as security_definer,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('mark_my_notification_read', 'mark_my_notifications_read');
