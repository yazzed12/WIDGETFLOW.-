begin;
do $guard$
begin
  if not exists (select 1 from private.widgetflow_schema_migrations where id='072_account_purge_governance_safe_reset') then raise exception 'Migration 072 must be applied first'; end if;
  if exists (select 1 from private.widgetflow_schema_migrations where id='073_live_account_read_contract') then raise exception 'Migration 073 already applied'; end if;
end $guard$;

create or replace function public.admin_data_control_browse(
  p_domain_key text, p_page integer default 1, p_page_size integer default 25,
  p_search text default null, p_filters jsonb default '{}'::jsonb, p_sort text default null
)
returns jsonb language plpgsql security definer stable set search_path=''
as $function$
declare v_page integer:=greatest(coalesce(p_page,1),1); v_size integer:=least(greatest(coalesce(p_page_size,25),1),100); v_offset integer; v_rows jsonb:='[]'::jsonb; v_total bigint:=0; v_search text:=nullif(btrim(coalesce(p_search,'')),'');
begin
  if not private.current_user_is_protected_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  if p_filters is not null and p_filters <> '{}'::jsonb then raise exception 'UNSUPPORTED_FILTERS'; end if;
  if nullif(btrim(coalesce(p_sort,'')),'') is not null then raise exception 'UNSUPPORTED_SORT'; end if;
  v_offset:=(v_page-1)*v_size;
  if p_domain_key='accounts' then
    select count(*) into v_total from public.profiles p where p.auth_user_id is not null and p.status='Active' and (v_search is null or p.full_name ilike '%'||v_search||'%' or p.email ilike '%'||v_search||'%');
    select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_rows from (select p.id,p.auth_user_id,p.profile_code,p.full_name,p.email,p.status,p.role_id,r.key as role_key,r.name as role_name from public.profiles p join public.roles r on r.id=p.role_id where p.auth_user_id is not null and p.status='Active' and (v_search is null or p.full_name ilike '%'||v_search||'%' or p.email ilike '%'||v_search||'%') order by p.full_name limit v_size offset v_offset) x;
  elsif p_domain_key='templates' then
    select count(*) into v_total from public.templates t where v_search is null or t.name ilike '%'||v_search||'%';
    select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_rows from (select t.id,t.name,t.status,t.category_id,t.created_by_user_id,t.created_at,t.updated_at from public.templates t where v_search is null or t.name ilike '%'||v_search||'%' order by t.updated_at desc limit v_size offset v_offset) x;
  elsif p_domain_key='reports' then
    select count(*) into v_total from public.reports r where v_search is null or r.title ilike '%'||v_search||'%';
    select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_rows from (select r.id,r.title,r.status,r.template_id,r.created_by_user_id,r.created_at,r.updated_at from public.reports r where v_search is null or r.title ilike '%'||v_search||'%' order by r.updated_at desc limit v_size offset v_offset) x;
  elsif p_domain_key='categories' then
    select count(*) into v_total from public.categories c where v_search is null or c.name ilike '%'||v_search||'%';
    select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_rows from (select c.id,c.name,c.status,c.created_at,c.updated_at from public.categories c where v_search is null or c.name ilike '%'||v_search||'%' order by c.name limit v_size offset v_offset) x;
  elsif p_domain_key='notifications' then
    select count(*) into v_total from public.notifications n where v_search is null or n.title ilike '%'||v_search||'%' or n.message ilike '%'||v_search||'%';
    select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_rows from (select n.id,n.recipient_user_id,n.notification_type,n.title,n.is_read,n.created_at,n.related_template_id,n.related_report_id from public.notifications n where v_search is null or n.title ilike '%'||v_search||'%' or n.message ilike '%'||v_search||'%' order by n.created_at desc limit v_size offset v_offset) x;
  elsif p_domain_key='assets' then
    select count(*) into v_total from public.asset_metadata a where v_search is null or a.original_filename ilike '%'||v_search||'%' or a.mime_type ilike '%'||v_search||'%';
    select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v_rows from (select a.id,a.owner_user_id,a.original_filename,a.mime_type,a.byte_size,a.lifecycle_state,a.linked_template_id,a.linked_report_id,a.created_at from public.asset_metadata a where v_search is null or a.original_filename ilike '%'||v_search||'%' or a.mime_type ilike '%'||v_search||'%' order by a.created_at desc limit v_size offset v_offset) x;
  else raise exception 'UNSUPPORTED_DOMAIN'; end if;
  return jsonb_build_object('rows',v_rows,'total_count',v_total,'page',v_page,'page_size',v_size,'domain_key',p_domain_key);
end $function$;

create or replace function public.list_report_recipient_directory()
returns jsonb language sql stable security definer set search_path=''
as $function$
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.full_name,'email',p.email,'roleId',p.role_id,'roleKey',r.key,'roleName',r.name,'governanceLevel',r.governance_level,'department',p.department) order by p.full_name,p.id),'[]'::jsonb)
  from public.profiles p join public.roles r on r.id=p.role_id
  where p.auth_user_id is not null and p.status='Active' and r.is_active and r.role_type in ('System','Custom') and not coalesce(r.is_protected,false);
$function$;

revoke all on function public.admin_data_control_browse(text,integer,integer,text,jsonb,text),public.list_report_recipient_directory() from public,anon;
grant execute on function public.admin_data_control_browse(text,integer,integer,text,jsonb,text),public.list_report_recipient_directory() to authenticated;
  insert into private.widgetflow_schema_migrations(id,description) values ('073_live_account_read_contract','Live account filtering for Data Control and recipient directory');
commit;
