begin;

do $migration_guard$
begin
  if not exists (
    select 1
    from private.widgetflow_schema_migrations
    where id = '087_signature_role_directory_and_effective_role_hardening'
  ) then
    raise exception 'WidgetFlow migration 087_signature_role_directory_and_effective_role_hardening must be applied first';
  end if;
  if exists (
    select 1
    from private.widgetflow_schema_migrations
    where id = '088_optional_signature_customization_semantics'
  ) then
    raise exception 'WidgetFlow migration 088_optional_signature_customization_semantics has already been applied';
  end if;
end
$migration_guard$;

/*
 * Signature configuration is optional.  The immutable template snapshot is
 * valid when no report-level override exists.  Keep the canonical lifecycle
 * in private.complete_report_085_legacy; this wrapper only preserves the
 * public authorization boundary.
 */
create or replace function public.complete_report(
  p_report_id uuid,
  p_title text default null,
  p_values jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not private.current_user_is_active()
     or not private.current_user_has_permission('reports.view_own')
     or not private.current_user_has_permission('reports.complete') then
    raise exception 'FORBIDDEN';
  end if;

  return private.complete_report_085_legacy(p_report_id, p_title, p_values);
end
$function$;

revoke all on function public.complete_report(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.complete_report(uuid, text, jsonb) to authenticated;

insert into private.widgetflow_schema_migrations (id, description)
values (
  '088_optional_signature_customization_semantics',
  'Make template signature defaults valid without requiring optional report customization'
);

commit;
