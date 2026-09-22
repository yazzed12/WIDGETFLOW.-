begin;

do $guard$
begin
  if not exists (
    select 1 from private.widgetflow_schema_migrations
    where id = '084_template_timeline_read'
  ) then
    raise exception 'WidgetFlow migration 084_template_timeline_read must be applied first';
  end if;
  if exists (
    select 1 from private.widgetflow_schema_migrations
    where id = '085_template_workflow_notifications'
  ) then
    raise exception 'WidgetFlow migration 085_template_workflow_notifications has already been applied';
  end if;
end $guard$;

-- One canonical, transactional producer for template notifications. The
-- workflow RPCs below remain the only event producers; no trigger is added.
create or replace function private.create_template_notification(
  p_recipient_user_id uuid,
  p_notification_type text,
  p_title text,
  p_message text,
  p_template_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if p_recipient_user_id is null
     or p_recipient_user_id = auth.uid()
     or nullif(btrim(p_notification_type), '') is null
     or nullif(btrim(p_title), '') is null
     or nullif(btrim(p_message), '') is null
     or p_template_id is null then
    return;
  end if;

  insert into public.notifications(
    recipient_user_id,
    notification_type,
    title,
    message,
    related_template_id
  ) values (
    p_recipient_user_id,
    btrim(p_notification_type),
    btrim(p_title),
    btrim(p_message),
    p_template_id
  );
end
$function$;

revoke all on function private.create_template_notification(uuid,text,text,text,uuid)
  from public, anon, authenticated, service_role;

-- Current canonical submit function (023), augmented only with notification
-- production after routing has been evaluated and persisted.
create or replace function public.submit_template_for_approval(p_template_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  t public.templates%rowtype;
  a record;
  r record;
  reviewer record;
  gov boolean;
  notification_title text;
  notification_message text;
begin
  if not private.current_user_is_active()
     or not private.current_user_has_permission('templates.submit') then
    raise exception 'FORBIDDEN';
  end if;

  select * into a from private.template_actor();
  select * into t from public.templates where id = p_template_id for update;
  if t.created_by_user_id <> a.user_id
     or t.status not in ('draft', 'rejected') then
    raise exception 'SUBMISSION_NOT_ALLOWED';
  end if;

  select template_governance_enabled into gov
  from public.system_settings where id = 'default';
  select * into r from public.governance_routes
  where creator_governance_level = t.creator_governance_level
    and is_active;

  notification_title := 'Template requires your review';
  notification_message := coalesce(nullif(btrim(t.name), ''), 'A template') ||
    ' was submitted for your review.';

  if not coalesce(gov, true)
     or r.strategy = 'DIRECT_PUBLISH'
     or r.strategy is null then
    update public.templates
    set status = 'approved',
        assignment_strategy = 'DIRECT_PUBLISH',
        submitted_at = statement_timestamp(),
        approved_at = statement_timestamp()
    where id = t.id;
    update public.templates set status = 'superseded'
    where id = t.supersedes_template_id and status = 'approved';
    insert into public.template_versions(
      template_id, version_label, schema_snapshot, published_by_user_id,
      publisher_name, publisher_email, publisher_role_id, publisher_role_key,
      publisher_role_name, publisher_governance_level
    ) values (
      t.id, t.version_label, private.template_snapshot(t.id), a.user_id,
      a.full_name, a.email, a.role_id, a.role_key, a.role_name,
      a.governance_level
    );
    perform private.template_audit(t.id, 'TEMPLATE_PUBLISHED_DIRECT', t.status, 'approved');
  elsif r.strategy = 'SPECIFIC_USER' then
    if r.specific_user_id = a.user_id
       or not exists (
         select 1
         from public.profiles p
         join public.roles ro on ro.id = p.role_id
         join public.role_permissions rp on rp.role_id = ro.id
         where p.id = r.specific_user_id
           and p.status = 'Active'
           and ro.is_active
           and rp.permission_key in ('template_approvals.view', 'template_approvals.approve')
         group by p.id
         having count(distinct rp.permission_key) = 2
       ) then
      raise exception 'REVIEWER_NOT_ELIGIBLE';
    end if;

    update public.templates
    set status = 'pending_approval',
        assignment_strategy = 'SPECIFIC_USER',
        target_role_id = r.target_role_id,
        routing_specific_user_id = r.specific_user_id,
        assigned_reviewer_user_id = r.specific_user_id,
        assigned_reviewer_name_snapshot = (select p.full_name from public.profiles p where p.id = r.specific_user_id),
        assigned_reviewer_role_id_snapshot = (select p.role_id from public.profiles p where p.id = r.specific_user_id),
        assigned_reviewer_role_key_snapshot = (select ro.key from public.profiles p join public.roles ro on ro.id = p.role_id where p.id = r.specific_user_id),
        assigned_reviewer_role_name_snapshot = (select ro.name from public.profiles p join public.roles ro on ro.id = p.role_id where p.id = r.specific_user_id),
        assigned_reviewer_governance_level_snapshot = (select ro.governance_level from public.profiles p join public.roles ro on ro.id = p.role_id where p.id = r.specific_user_id),
        submitted_at = statement_timestamp()
    where id = t.id;
    perform private.template_audit(t.id, 'TEMPLATE_SUBMITTED', t.status, 'pending_approval');
    perform private.create_template_notification(
      r.specific_user_id,
      'TEMPLATE_REVIEW_REQUESTED',
      notification_title,
      notification_message,
      t.id
    );
  else
    if not exists (
      select 1
      from public.roles ro
      join public.role_permissions a1 on a1.role_id = ro.id and a1.permission_key = 'template_approvals.view'
      join public.role_permissions a2 on a2.role_id = ro.id and a2.permission_key = 'template_approvals.approve'
      join public.profiles p on p.role_id = ro.id and p.status = 'Active'
      where ro.id = r.target_role_id
        and ro.is_active
        and p.id <> a.user_id
    ) then
      raise exception 'NO_ELIGIBLE_REVIEWER';
    end if;

    update public.templates
    set status = 'pending_approval',
        assignment_strategy = 'ROLE_QUEUE',
        target_role_id = r.target_role_id,
        target_role_key_snapshot = (select key from public.roles where id = r.target_role_id),
        target_role_name_snapshot = (select name from public.roles where id = r.target_role_id),
        assigned_reviewer_user_id = null,
        submitted_at = statement_timestamp()
    where id = t.id;
    perform private.template_audit(t.id, 'TEMPLATE_SUBMITTED', t.status, 'pending_approval');

    -- Notify every currently eligible queue member, using the same active
    -- role/permission/self-review conditions as current_user_can_review_template.
    for reviewer in
      select p.id
      from public.profiles p
      join public.roles ro on ro.id = p.role_id
      where p.status = 'Active'
        and ro.is_active
        and ro.id = r.target_role_id
        and p.id <> a.user_id
        and exists (select 1 from public.role_permissions rp where rp.role_id = ro.id and rp.permission_key = 'template_approvals.view')
        and exists (select 1 from public.role_permissions rp where rp.role_id = ro.id and rp.permission_key = 'template_approvals.approve')
    loop
      perform private.create_template_notification(
        reviewer.id,
        'TEMPLATE_REVIEW_REQUESTED',
        notification_title,
        notification_message,
        t.id
      );
    end loop;
  end if;

  return private.template_snapshot(t.id);
end
$function$;

-- Current canonical approval function (081), preserving display-ID assignment,
-- supersession, publication, audit, and reviewer eligibility.
create or replace function public.approve_template(p_template_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  t public.templates%rowtype;
  a record;
  creator_code text;
  approver_code text;
  v_approved_at timestamptz;
  visible_name text;
  display_id text;
begin
  if not private.current_user_is_active()
     or not private.current_user_has_permission('template_approvals.view')
     or not private.current_user_has_permission('template_approvals.approve') then
    raise exception 'FORBIDDEN';
  end if;
  select * into a from private.template_actor();
  select * into t from public.templates where id = p_template_id for update;
  if not found or t.status <> 'pending_approval'
     or not private.current_user_can_review_template(t.id) then
    raise exception 'APPROVAL_NOT_ALLOWED';
  end if;

  v_approved_at := statement_timestamp();
  select profile_code into creator_code from public.profiles where id = t.created_by_user_id;
  select profile_code into approver_code from public.profiles where id = a.user_id;
  update public.templates
  set status = 'approved',
      approved_at = v_approved_at,
      creator_profile_code_snapshot = creator_code,
      final_approver_profile_code_snapshot = approver_code,
      template_display_id = coalesce(template_display_id, private.next_template_display_id(creator_code, approver_code, v_approved_at))
  where id = t.id;
  update public.templates set status = 'superseded'
  where id = t.supersedes_template_id and status = 'approved';
  insert into public.template_versions(
    template_id, version_label, schema_snapshot, published_by_user_id,
    publisher_name, publisher_email, publisher_role_id, publisher_role_key,
    publisher_role_name, publisher_governance_level
  ) values (
    t.id, t.version_label, private.template_snapshot(t.id), a.user_id,
    a.full_name, a.email, a.role_id, a.role_key, a.role_name, a.governance_level
  );
  perform private.template_audit(t.id, 'TEMPLATE_APPROVED', t.status, 'approved');

  select coalesce(nullif(btrim(name), ''), 'Template'), nullif(btrim(template_display_id), '')
    into visible_name, display_id from public.templates where id = t.id;
  perform private.create_template_notification(
    t.created_by_user_id,
    'TEMPLATE_APPROVED',
    'Template approved',
    visible_name || ' was approved.' || case when display_id is not null then ' Template ID: ' || display_id else '' end,
    t.id
  );
  return private.template_snapshot(t.id);
end
$function$;

-- Current canonical rejection function (059), preserving reason validation,
-- route eligibility, terminal status, and audit behavior.
create or replace function public.reject_template(p_template_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  t public.templates%rowtype;
  a record;
begin
  if nullif(btrim(p_reason), '') is null
     or not private.current_user_is_active()
     or not private.current_user_has_permission('template_approvals.view')
     or not private.current_user_has_permission('template_approvals.reject') then
    raise exception 'FORBIDDEN';
  end if;
  select * into a from private.template_actor();
  select * into t from public.templates where id = p_template_id for update;
  if t.status <> 'pending_approval'
     or not private.current_user_can_review_template(t.id) then
    raise exception 'REJECTION_NOT_ALLOWED';
  end if;
  update public.templates
  set status = 'rejected',
      rejected_at = statement_timestamp(),
      rejection_reason = btrim(p_reason)
  where id = t.id;
  perform private.template_audit(t.id, 'TEMPLATE_REJECTED', t.status, 'rejected', p_reason);
  perform private.create_template_notification(
    t.created_by_user_id,
    'TEMPLATE_REJECTED',
    'Template rejected',
    coalesce(nullif(btrim(t.name), ''), 'Your template') || ' was rejected. Reason: ' || btrim(p_reason),
    t.id
  );
  return private.template_snapshot(t.id);
end
$function$;

-- Current canonical return-for-revision function (078), preserving draft
-- lifecycle, routing cleanup, and audit behavior.
create or replace function public.return_template_for_revision(
  p_template_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
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
  perform private.template_audit(t.id, 'TEMPLATE_RETURNED', 'pending_approval', 'draft', btrim(p_reason));
  perform private.create_template_notification(
    t.created_by_user_id,
    'TEMPLATE_RETURNED',
    'Template returned for revision',
    coalesce(nullif(btrim(t.name), ''), 'Your template') || ' was returned for revision. Reason: ' || btrim(p_reason),
    t.id
  );
  return private.template_snapshot(t.id);
end
$function$;

revoke all on function public.submit_template_for_approval(uuid), public.approve_template(uuid), public.reject_template(uuid,text), public.return_template_for_revision(uuid,text)
  from public, anon;
grant execute on function public.submit_template_for_approval(uuid), public.approve_template(uuid), public.reject_template(uuid,text), public.return_template_for_revision(uuid,text)
  to authenticated;

insert into private.widgetflow_schema_migrations(id, description)
values (
  '085_template_workflow_notifications',
  'Canonical user-scoped template workflow notification producers'
);

commit;
