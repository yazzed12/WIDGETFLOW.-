begin;

do $guard$
begin
  if not exists (
    select 1 from private.widgetflow_schema_migrations
    where id = '073_live_account_read_contract'
  ) then
    raise exception 'WidgetFlow migration 073_live_account_read_contract must be applied first';
  end if;
  if exists (
    select 1 from private.widgetflow_schema_migrations
    where id = '074_notification_read_state_rpc'
  ) then
    raise exception 'WidgetFlow migration 074_notification_read_state_rpc has already been applied';
  end if;
end
$guard$;

create or replace function public.mark_my_notification_read(p_notification_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  affected integer := 0;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if not coalesce(private.current_user_is_active(), false) then raise exception 'PROFILE_INACTIVE_OR_MISSING'; end if;
  if p_notification_id is null then raise exception 'NOTIFICATION_ID_REQUIRED'; end if;

  update public.notifications
     set is_read = true,
         read_at = coalesce(read_at, statement_timestamp())
   where id = p_notification_id
     and recipient_user_id = auth.uid();
  get diagnostics affected = row_count;

  if affected = 0 and not exists (
    select 1 from public.notifications
    where id = p_notification_id and recipient_user_id = auth.uid()
  ) then
    raise exception 'NOTIFICATION_NOT_FOUND';
  end if;

  return jsonb_build_object('notification_id', p_notification_id, 'updated_count', affected, 'is_read', true);
end
$function$;

create or replace function public.mark_my_notifications_read()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  affected integer := 0;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  if not coalesce(private.current_user_is_active(), false) then raise exception 'PROFILE_INACTIVE_OR_MISSING'; end if;

  update public.notifications
     set is_read = true,
         read_at = coalesce(read_at, statement_timestamp())
   where recipient_user_id = auth.uid()
     and not is_read;
  get diagnostics affected = row_count;

  return jsonb_build_object('updated_count', affected, 'is_read', true);
end
$function$;

revoke all on function public.mark_my_notification_read(uuid) from public, anon, authenticated;
revoke all on function public.mark_my_notifications_read() from public, anon, authenticated;
grant execute on function public.mark_my_notification_read(uuid) to authenticated;
grant execute on function public.mark_my_notifications_read() to authenticated;

insert into private.widgetflow_schema_migrations (id, description)
values ('074_notification_read_state_rpc', 'Authenticated owner-scoped notification read-state RPCs');

commit;
