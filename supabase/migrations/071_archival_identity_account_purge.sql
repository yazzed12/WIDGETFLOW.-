begin;

do $guard$
begin
  if not exists (select 1 from private.widgetflow_schema_migrations where id = '067_factory_reset_status_contract_hotfix') then
    raise exception 'WidgetFlow migration 067_factory_reset_status_contract_hotfix must be applied first';
  end if;
  if exists (select 1 from private.widgetflow_schema_migrations where id = '071_archival_identity_account_purge') then
    raise exception 'WidgetFlow migration 071_archival_identity_account_purge has already been applied';
  end if;
end
$guard$;

alter table public.profiles add column if not exists auth_user_id uuid;

update public.profiles
set auth_user_id = id
where auth_user_id is null;

do $fk$
declare fk_name text;
begin
  select con.conname into fk_name
  from pg_constraint con
  where con.conrelid = 'public.profiles'::regclass
    and con.contype = 'f'
    and con.confrelid = 'auth.users'::regclass
    and con.conkey = array[(select attnum from pg_attribute where attrelid='public.profiles'::regclass and attname='id')::smallint];
  if fk_name is not null then execute format('alter table public.profiles drop constraint %I', fk_name); end if;
end
$fk$;

alter table public.profiles
  add constraint profiles_auth_user_id_fk
  foreign key (auth_user_id) references auth.users(id) on delete set null;

create unique index if not exists profiles_auth_user_id_uq on public.profiles(auth_user_id) where auth_user_id is not null;

create or replace function public.admin_preview_factory_reset(p_options jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable security definer set search_path = ''
as $function$
declare
  delete_accounts boolean := coalesce((p_options->>'delete_user_accounts')::boolean, false);
  accounts jsonb := '[]'::jsonb;
  account_count bigint := 0;
begin
  if not private.current_user_is_protected_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_options is null then p_options := '{}'::jsonb; end if;
  if p_options ? 'delete_user_accounts' and jsonb_typeof(p_options->'delete_user_accounts') <> 'boolean' then raise exception 'INVALID_INPUT'; end if;
  select count(*) into account_count
  from public.profiles p join public.roles r on r.id=p.role_id
  where p.auth_user_id is not null
    and not (p.status='Active' and r.is_active and r.role_type='System' and lower(btrim(r.key))='admin' and r.is_protected);
  if delete_accounts then
    select coalesce(jsonb_agg(jsonb_build_object('profile_id',p.id,'auth_user_id',p.auth_user_id,'name',p.full_name,'email',p.email,'role',r.name,'profile_code',null)), '[]'::jsonb)
      into accounts
    from public.profiles p join public.roles r on r.id=p.role_id
    where p.auth_user_id is not null
      and not (p.status='Active' and r.is_active and r.role_type='System' and lower(btrim(r.key))='admin' and r.is_protected);
  end if;
  return jsonb_build_object(
    'mode', case when delete_accounts then 'data_and_user_accounts' else 'data_only' end,
    'business_data', public.admin_data_control_summary(),
    'account_purge', jsonb_build_object('delete_user_accounts',delete_accounts,'live_accounts_to_remove',case when delete_accounts then account_count else 0 end,'auth_users_to_delete',case when delete_accounts then account_count else 0 end,'profiles_to_archive',case when delete_accounts then account_count else 0 end,'protected_admin_accounts_preserved',1,'accounts',accounts),
    'preserved', jsonb_build_array('Protected Admin','System Roles','Permission Catalog','Workflow Architecture','RLS','Functions','RPCs','Triggers','Indexes','Constraints','Migration Ledger','Reset Audit','Historical Identity Records'),
    'storage','EXTERNAL_CLEANUP_REQUIRED','deletions_enabled',true,'confirmation','RESET WIDGETFLOW DATA','options',p_options
  );
end
$function$;

revoke all on function public.admin_preview_factory_reset(jsonb) from public, anon;
grant execute on function public.admin_preview_factory_reset(jsonb) to authenticated;

insert into private.widgetflow_schema_migrations(id, description)
values ('071_archival_identity_account_purge','Archival profile identity linkage and optional non-admin Auth purge foundation');

commit;
