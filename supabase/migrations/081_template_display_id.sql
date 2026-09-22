begin;
do $guard$
begin
  if not exists (select 1 from private.widgetflow_schema_migrations where id='080_report_display_id') then raise exception 'WidgetFlow migration 080_report_display_id must be applied first'; end if;
  if exists (select 1 from private.widgetflow_schema_migrations where id='081_template_display_id') then raise exception 'WidgetFlow migration 081_template_display_id has already been applied'; end if;
end $guard$;

alter table public.templates add column template_display_id text;
alter table public.templates add column creator_profile_code_snapshot text;
alter table public.templates add column final_approver_profile_code_snapshot text;
create table private.template_display_id_counters (year_key text primary key, last_value bigint not null check(last_value>0), updated_at timestamptz not null default statement_timestamp());
alter table private.template_display_id_counters enable row level security;
revoke all on private.template_display_id_counters from public, anon, authenticated, service_role;

create or replace function private.next_template_display_id(p_creator_code text,p_approver_code text,p_approved_at timestamptz)
returns text language plpgsql volatile security definer set search_path='' as $function$
declare c text[]; a text[]; y text; n bigint;
begin
  c:=regexp_match(upper(btrim(p_creator_code)),'^([A-Z]{2})-([0-9]{3,})'); a:=regexp_match(upper(btrim(p_approver_code)),'^([A-Z]{2})-([0-9]{3,})');
  if c is null or a is null or p_approved_at is null then raise exception 'TEMPLATE_DISPLAY_ID_INPUT_INVALID'; end if;
  y:=to_char(p_approved_at at time zone 'UTC','YYYY');
  insert into private.template_display_id_counters(year_key,last_value) values(y,1) on conflict(year_key) do update set last_value=private.template_display_id_counters.last_value+1,updated_at=statement_timestamp() returning last_value into n;
  return 'TMP-'||c[1]||c[2]||'-'||a[1]||a[2]||'-'||y||'-'||lpad(n::text,6,'0');
end $function$;

create or replace function private.assign_template_display_id()
returns trigger language plpgsql security definer set search_path='' as $function$
declare creator_code text; approver_code text;
begin
  if new.status='approved' and old.status is distinct from 'approved' and new.template_display_id is null then
    select profile_code into creator_code from public.profiles where id=new.created_by_user_id;
    select profile_code into approver_code from public.profiles where id=auth.uid();
    new.creator_profile_code_snapshot:=creator_code; new.final_approver_profile_code_snapshot:=approver_code;
    new.template_display_id:=private.next_template_display_id(creator_code,approver_code,coalesce(new.approved_at,statement_timestamp()));
  end if;
  return new;
end $function$;
create trigger templates_assign_display_id before update on public.templates for each row execute function private.assign_template_display_id();

create or replace function public.approve_template(p_template_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.templates%rowtype; a record; creator_code text; approver_code text; v_approved_at timestamptz;
begin
  if not private.current_user_is_active() or not private.current_user_has_permission('template_approvals.view') or not private.current_user_has_permission('template_approvals.approve') then raise exception 'FORBIDDEN'; end if;
  select * into a from private.template_actor(); select * into t from public.templates where id=p_template_id for update;
  if not found or t.status<>'pending_approval' or not private.current_user_can_review_template(t.id) then raise exception 'APPROVAL_NOT_ALLOWED'; end if;
  v_approved_at:=statement_timestamp(); select profile_code into creator_code from public.profiles where id=t.created_by_user_id; select profile_code into approver_code from public.profiles where id=a.user_id;
  update public.templates set status='approved',approved_at=v_approved_at,creator_profile_code_snapshot=creator_code,final_approver_profile_code_snapshot=approver_code,template_display_id=coalesce(template_display_id,private.next_template_display_id(creator_code,approver_code,v_approved_at)) where id=t.id;
  update public.templates set status='superseded' where id=t.supersedes_template_id and status='approved';
  insert into public.template_versions(template_id,version_label,schema_snapshot,published_by_user_id,publisher_name,publisher_email,publisher_role_id,publisher_role_key,publisher_role_name,publisher_governance_level) values(t.id,t.version_label,private.template_snapshot(t.id),a.user_id,a.full_name,a.email,a.role_id,a.role_key,a.role_name,a.governance_level);
  perform private.template_audit(t.id,'TEMPLATE_APPROVED',t.status,'approved'); return private.template_snapshot(t.id);
end $$;

alter table public.templates add constraint templates_display_id_format_ck check (template_display_id is null or template_display_id ~ '^TMP-[A-Z]{2}[0-9]{3,}-[A-Z]{2}[0-9]{3,}-[0-9]{4}-[0-9]{6,}$');
create unique index templates_display_id_uq on public.templates(template_display_id) where template_display_id is not null;
revoke all on function private.next_template_display_id(text,text,timestamptz) from public,anon,authenticated;
revoke all on function private.assign_template_display_id() from public,anon,authenticated;
insert into private.widgetflow_schema_migrations(id,description) values('081_template_display_id','Immutable template display identifier assigned during final approval');
commit;
