begin;
do $guard$
begin
  if not exists (select 1 from private.widgetflow_schema_migrations where id='081_template_display_id') then raise exception 'WidgetFlow migration 081_template_display_id must be applied first'; end if;
  if exists (select 1 from private.widgetflow_schema_migrations where id='082_sticky_notes') then raise exception 'WidgetFlow migration 082_sticky_notes has already been applied'; end if;
end $guard$;
create table public.sticky_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  color_key text not null default 'yellow' check (color_key in ('yellow','blue','green','rose','purple')),
  is_pinned boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  archived_at timestamptz,
  constraint sticky_notes_content_not_blank check (nullif(btrim(content),'') is not null)
);
create index sticky_notes_user_sort_idx on public.sticky_notes(user_id,is_pinned desc,updated_at desc);
create trigger sticky_notes_set_updated_at before update on public.sticky_notes for each row execute function private.set_updated_at();
alter table public.sticky_notes enable row level security;
revoke all on table public.sticky_notes from anon,authenticated;
grant select,insert,update,delete on public.sticky_notes to authenticated;
create policy sticky_notes_select_own on public.sticky_notes for select to authenticated using (user_id=auth.uid());
create policy sticky_notes_insert_own on public.sticky_notes for insert to authenticated with check (user_id=auth.uid());
create policy sticky_notes_update_own on public.sticky_notes for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy sticky_notes_delete_own on public.sticky_notes for delete to authenticated using (user_id=auth.uid());
insert into private.widgetflow_schema_migrations(id,description) values('082_sticky_notes','Private per-user plain-text Sticky Notes with row-level ownership controls');
commit;
