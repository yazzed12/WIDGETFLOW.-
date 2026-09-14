begin;

do $guard$
begin
  if not exists (
    select 1 from private.widgetflow_schema_migrations
    where id = '057_signature_capacity_read_only_recipients'
  ) then
    raise exception 'WidgetFlow migration 057_signature_capacity_read_only_recipients must be applied first';
  end if;
  if not exists (
    select 1 from private.widgetflow_schema_migrations
    where id = '059_template_dynamic_pending_reviewer_eligibility'
  ) then
    raise exception 'WidgetFlow migration 059_template_dynamic_pending_reviewer_eligibility must be applied first';
  end if;
  if exists (
    select 1 from private.widgetflow_schema_migrations
    where id = '078_template_return_and_report_return_schema_fix'
  ) then
    raise exception 'WidgetFlow migration 078_template_return_and_report_return_schema_fix has already been applied';
  end if;
end
$guard$;

-- Template returns use the existing editable draft state plus dedicated
-- metadata, preserving the distinction from permanent rejection.
alter table public.templates
  add column if not exists returned_at timestamptz,
  add column if not exists return_reason text;

-- Rebuild the canonical draft RPC so a returned-for-revision draft clears its
-- return marker when the creator edits/saves it. Existing behavior is kept.
create or replace function public.save_template_draft(
  p_template_id uuid,
  p_name text,
  p_description text,
  p_category_id uuid,
  p_tags jsonb,
  p_sections jsonb,
  p_rules jsonb,
  p_calculations jsonb,
  p_theme jsonb,
  p_header_config jsonb,
  p_footer_config jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a record;
  t public.templates%rowtype;
  s jsonb;
  f jsonb;
  v_section uuid;
  idx int := 0;
  previous_status text;
begin
  if not private.current_user_is_active()
     or not private.current_user_has_permission('templates.create') then
    raise exception 'FORBIDDEN';
  end if;
  if nullif(btrim(p_name), '') is null
     or not exists (
       select 1 from public.categories
       where id = p_category_id and status = 'Active'
     ) then
    raise exception 'INVALID_INPUT';
  end if;

  select * into a from private.template_actor();
  if p_template_id is null then
    insert into public.templates(
      name, description, category_id, created_by_user_id,
      creator_name, creator_email, creator_role_id, creator_role_key,
      creator_role_name, creator_governance_level, rules, calculations,
      theme, header_config, footer_config
    )
    values(
      btrim(p_name), coalesce(p_description, ''), p_category_id,
      a.user_id, a.full_name, a.email, a.role_id, a.role_key, a.role_name,
      a.governance_level, coalesce(p_rules, '[]'), coalesce(p_calculations, '[]'),
      coalesce(p_theme, '{}'), coalesce(p_header_config, '{}'),
      coalesce(p_footer_config, '{}')
    ) returning * into t;
    perform private.template_audit(t.id, 'TEMPLATE_CREATED', null, 'draft');
  else
    select * into t from public.templates where id = p_template_id for update;
    if not found or t.created_by_user_id <> a.user_id
       or t.status not in ('draft', 'rejected') then
      raise exception 'DRAFT_NOT_EDITABLE';
    end if;
    previous_status := t.status;
    update public.templates
    set name = btrim(p_name),
        description = coalesce(p_description, ''),
        category_id = p_category_id,
        rules = coalesce(p_rules, '[]'),
        calculations = coalesce(p_calculations, '[]'),
        theme = coalesce(p_theme, '{}'),
        header_config = coalesce(p_header_config, '{}'),
        footer_config = coalesce(p_footer_config, '{}'),
        status = 'draft',
        rejection_reason = null,
        rejected_at = null,
        return_reason = null,
        returned_at = null
    where id = t.id
    returning * into t;
    perform private.template_audit(t.id, 'TEMPLATE_DRAFT_SAVED', previous_status, 'draft');
    delete from public.template_fields where template_id = t.id;
    delete from public.template_sections where template_id = t.id;
  end if;

  if p_template_id is null then
    delete from public.template_sections where template_id = t.id;
  end if;
  for s in select * from jsonb_array_elements(coalesce(p_sections, '[]')) loop
    insert into public.template_sections(template_id, name, description, display_order)
    values(t.id, coalesce(s->>'title', 'Section ' || idx), s->>'description', idx)
    returning id into v_section;
    for f in select * from jsonb_array_elements(coalesce(s->'components', '[]')) loop
      insert into public.template_fields(
        template_id, section_id, field_key, label, field_type, is_required,
        placeholder, description, default_value, layout_width,
        validation_rules, options, configuration, display_order
      )
      values(
        t.id, v_section, coalesce(f->>'key', f->>'id', 'field-' || idx),
        coalesce(f->>'label', 'Field'), coalesce(f->>'type', 'text'),
        coalesce((f->>'required')::boolean, false), f->>'placeholder',
        f->>'description', f->'defaultValue', coalesce(f->>'layoutWidth', 'full'),
        coalesce(f->'validation', '{}'), coalesce(f->'options', '[]'), f,
        coalesce((f->>'order')::int, 0)
      );
    end loop;
    idx := idx + 1;
  end loop;
  delete from public.template_tags where template_id = t.id;
  insert into public.template_tags(template_id, tag)
  select t.id, value from jsonb_array_elements_text(coalesce(p_tags, '[]'));
  return private.template_snapshot(t.id);
end $$;

-- Correct the effective report return implementation for the actual
-- report_assignments schema: lifecycle timestamps are explicit and there is
-- no updated_at column on that table.
create or replace function public.return_report(
  p_report_id uuid,
  p_assignment_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a record;
  r public.reports%rowtype;
  x public.report_assignments%rowtype;
  c public.report_send_cycles%rowtype;
begin
  if not private.current_user_is_active() then raise exception 'FORBIDDEN'; end if;
  if nullif(btrim(p_reason), '') is null then raise exception 'RETURN_REASON_REQUIRED'; end if;
  select * into a from private.report_actor();
  if not found then raise exception 'ACCOUNT_INACTIVE'; end if;
  select * into r from public.reports where id = p_report_id for update;
  if not found then raise exception 'REPORT_NOT_FOUND'; end if;
  if r.created_by_user_id = a.user_id then raise exception 'SELF_RECIPIENT_ACTION_NOT_ALLOWED'; end if;
  if r.status <> 'sent' or r.locked_at is not null or r.current_send_cycle_id is null then raise exception 'REPORT_NOT_ACTIONABLE'; end if;
  select * into x
  from public.report_assignments
  where id = p_assignment_id and report_id = r.id and send_cycle_id = r.current_send_cycle_id
  for update;
  if not found then raise exception 'ASSIGNMENT_NOT_FOUND'; end if;
  if x.recipient_user_id <> a.user_id then raise exception 'ASSIGNMENT_NOT_OWNED'; end if;
  if x.assignment_status <> 'pending' then raise exception 'REPORT_NOT_ACTIONABLE'; end if;
  if not exists (
    select 1 from public.report_signature_assignments m
    where m.report_id = r.id and m.send_cycle_id = r.current_send_cycle_id
      and m.report_assignment_id = x.id and m.recipient_user_id = a.user_id
  ) then raise exception 'SIGNATURE_ASSIGNMENT_REQUIRED'; end if;
  select * into c
  from public.report_send_cycles
  where id = x.send_cycle_id and report_id = r.id
  for update;
  if not found or c.status <> 'active' then raise exception 'REPORT_NOT_ACTIONABLE'; end if;

  update public.report_assignments
  set assignment_status = 'returned',
      return_reason = btrim(p_reason),
      returned_at = statement_timestamp(),
      closed_at = statement_timestamp()
  where id = x.id;
  update public.report_assignments
  set assignment_status = 'cancelled',
      closed_at = statement_timestamp()
  where send_cycle_id = x.send_cycle_id
    and id <> x.id
    and assignment_status = 'pending';
  update public.report_send_cycles
  set status = 'returned', closed_at = statement_timestamp()
  where id = c.id;
  update public.reports
  set status = 'draft', current_send_cycle_id = null, sent_at = null,
      returned_at = statement_timestamp(), return_reason = btrim(p_reason),
      updated_at = statement_timestamp()
  where id = r.id;
  insert into public.notifications(
    recipient_user_id, notification_type, title, message,
    related_report_id, send_cycle_id, report_assignment_id
  ) values(
    r.created_by_user_id, 'REPORT_RETURNED', 'Report returned', r.title,
    r.id, x.send_cycle_id, x.id
  );
  insert into public.report_audit_events(
    report_id, event_type, actor_user_id, actor_name, actor_email,
    actor_role_id, actor_role_key, actor_role_name, actor_governance_level,
    report_title_snapshot, from_status, to_status, comment, event_data,
    send_cycle_id, report_assignment_id
  ) values(
    r.id, 'REPORT_RETURNED', a.user_id, a.full_name, a.email, a.role_id,
    a.role_key, a.role_name, a.governance_level, r.title, 'sent', 'draft',
    btrim(p_reason),
    jsonb_build_object(
      'assignment_id', x.id,
      'send_cycle_id', x.send_cycle_id,
      'remaining_pending_assignments_cancelled', true
    ),
    x.send_cycle_id, x.id
  );
  return jsonb_build_object(
    'report', (select to_jsonb(z) from public.reports z where z.id = r.id),
    'assignment', (select to_jsonb(z) from public.report_assignments z where z.id = x.id),
    'send_cycle', (select to_jsonb(z) from public.report_send_cycles z where z.id = c.id)
  );
end $$;

-- Reviewer action distinct from rejection. It reuses the existing
-- template_approvals.reject permission because no separate return permission
-- exists in the canonical permission catalogue.
create or replace function public.return_template_for_revision(
  p_template_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a record;
  t public.templates%rowtype;
begin
  if not private.current_user_is_active()
     or not private.current_user_has_permission('template_approvals.view')
     or not private.current_user_has_permission('template_approvals.reject') then
    raise exception 'FORBIDDEN';
  end if;
  if nullif(btrim(p_reason), '') is null then raise exception 'RETURN_REASON_REQUIRED'; end if;
  select * into a from private.template_actor();
  if not found then raise exception 'ACCOUNT_INACTIVE'; end if;
  select * into t from public.templates where id = p_template_id for update;
  if not found then raise exception 'TEMPLATE_NOT_FOUND'; end if;
  if t.status <> 'pending_approval'
     or not private.current_user_can_review_template(t.id) then
    raise exception 'TEMPLATE_RETURN_NOT_ALLOWED';
  end if;

  update public.templates
  set status = 'draft',
      returned_at = statement_timestamp(),
      return_reason = btrim(p_reason),
      assignment_strategy = null,
      target_role_id = null,
      target_role_key_snapshot = null,
      target_role_name_snapshot = null,
      routing_specific_user_id = null,
      assigned_reviewer_user_id = null,
      assigned_reviewer_name_snapshot = null,
      assigned_reviewer_role_id_snapshot = null,
      assigned_reviewer_role_key_snapshot = null,
      assigned_reviewer_role_name_snapshot = null,
      assigned_reviewer_governance_level_snapshot = null,
      claimed_at = null
  where id = t.id;
  perform private.template_audit(
    t.id, 'TEMPLATE_RETURNED', 'pending_approval', 'draft', btrim(p_reason)
  );
  return private.template_snapshot(t.id);
end $$;

revoke all on function public.save_template_draft(uuid,text,text,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.save_template_draft(uuid,text,text,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) to authenticated;
revoke all on function public.return_report(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.return_report(uuid,uuid,text) to authenticated;
revoke all on function public.return_template_for_revision(uuid,text) from public, anon, authenticated;
grant execute on function public.return_template_for_revision(uuid,text) to authenticated;

insert into private.widgetflow_schema_migrations(id, description)
values(
  '078_template_return_and_report_return_schema_fix',
  'Schema-consistent report return and template return-for-revision workflow'
);

commit;
