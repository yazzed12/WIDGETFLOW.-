begin;
do $guard$
begin
  if not exists (select 1 from private.widgetflow_schema_migrations where id = '079_organization_activity_feed') then raise exception 'WidgetFlow migration 079_organization_activity_feed must be applied first'; end if;
  if exists (select 1 from private.widgetflow_schema_migrations where id = '080_report_display_id') then raise exception 'WidgetFlow migration 080_report_display_id has already been applied'; end if;
end $guard$;

alter table public.reports add column report_display_id text;
create table private.report_display_id_counters (year_key text primary key, last_value bigint not null check (last_value > 0), updated_at timestamptz not null default statement_timestamp());
alter table private.report_display_id_counters enable row level security;
revoke all on private.report_display_id_counters from public, anon, authenticated, service_role;

create or replace function private.next_report_display_id(p_sender_code text, p_created_at timestamptz)
returns text language plpgsql volatile security definer set search_path = '' as $function$
declare v_match text[]; v_code text; v_year text; v_seq bigint;
begin
  if nullif(btrim(p_sender_code), '') is null or p_created_at is null then raise exception 'REPORT_DISPLAY_ID_INPUT_INVALID'; end if;
  v_match := regexp_match(upper(btrim(p_sender_code)), '^([A-Z]{2})-([0-9]{3,})');
  if v_match is null then raise exception 'REPORT_DISPLAY_ID_SENDER_CODE_INVALID'; end if;
  v_code := v_match[1] || v_match[2]; v_year := to_char(p_created_at at time zone 'UTC', 'YYYY');
  insert into private.report_display_id_counters(year_key,last_value) values(v_year,1)
    on conflict (year_key) do update set last_value = private.report_display_id_counters.last_value + 1, updated_at = statement_timestamp()
    returning last_value into v_seq;
  return 'RPT-' || v_code || '-' || v_year || '-' || lpad(v_seq::text, 6, '0');
end $function$;

create or replace function private.assign_report_display_id()
returns trigger language plpgsql security definer set search_path = '' as $function$
declare v_code text;
begin
  if new.report_display_id is null then select profile_code into v_code from public.profiles where id = new.created_by_user_id; new.report_display_id := private.next_report_display_id(v_code, coalesce(new.created_at, statement_timestamp())); end if;
  return new;
end $function$;

do $backfill$
declare r record;
begin
  for r in select id, created_by_user_id, created_at from public.reports where report_display_id is null order by created_at, id loop
    update public.reports set report_display_id = private.next_report_display_id((select profile_code from public.profiles where id=r.created_by_user_id), r.created_at) where id=r.id;
  end loop;
end $backfill$;

alter table public.reports alter column report_display_id set not null;
alter table public.reports add constraint reports_report_display_id_uq unique (report_display_id);
alter table public.reports add constraint reports_report_display_id_format_ck check (report_display_id ~ '^RPT-[A-Z]{2}[0-9]{3,}-[0-9]{4}-[0-9]{6,}$');
create trigger reports_assign_display_id before insert on public.reports for each row execute function private.assign_report_display_id();
revoke all on function private.next_report_display_id(text,timestamptz), private.assign_report_display_id() from public, anon, authenticated;
insert into private.widgetflow_schema_migrations(id,description) values ('080_report_display_id','Immutable human-readable report display identifier with concurrency-safe yearly sequence');
commit;
