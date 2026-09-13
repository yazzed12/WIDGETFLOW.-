begin;
do $guard$
begin
 if not exists (select 1 from private.widgetflow_schema_migrations where id='074_notification_read_state_rpc') then raise exception 'Migration 074 required'; end if;
 if exists (select 1 from private.widgetflow_schema_migrations where id='075_report_comments_supabase_contract') then raise exception 'Migration 075 already applied'; end if;
end $guard$;
create or replace function public.list_report_comments(p_report_id uuid) returns setof public.report_comments language plpgsql stable security definer set search_path=''
as $f$ begin if p_report_id is null or not private.current_user_is_active() or not private.current_user_can_read_report(p_report_id) then raise exception 'FORBIDDEN'; end if; return query select c.* from public.report_comments c where c.report_id=p_report_id order by c.created_at; end $f$;
create or replace function public.add_report_comment(p_report_id uuid,p_message text) returns setof public.report_comments language plpgsql volatile security definer set search_path=''
as $f$ declare a record; begin if p_report_id is null or nullif(btrim(p_message),'') is null or not private.current_user_is_active() or not private.current_user_can_read_report(p_report_id) then raise exception 'FORBIDDEN'; end if; select * into a from public.current_principal() limit 1; if a.user_id is null then raise exception 'FORBIDDEN'; end if; insert into public.report_comments(report_id,author_user_id,author_name,author_email,author_role_id,author_role_key,author_role_name,author_governance_level,message) values(p_report_id,a.user_id,a.full_name,a.email,a.role_id,a.role_key,a.role_name,a.governance_level,btrim(p_message)); return query select c.* from public.report_comments c where c.report_id=p_report_id order by c.created_at; end $f$;
revoke all on function public.list_report_comments(uuid),public.add_report_comment(uuid,text) from public,anon;
grant execute on function public.list_report_comments(uuid),public.add_report_comment(uuid,text) to authenticated;
insert into private.widgetflow_schema_migrations(id,description) values('075_report_comments_supabase_contract','Canonical Supabase report comments contract');
commit;
