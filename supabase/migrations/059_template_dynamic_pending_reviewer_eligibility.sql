begin;

do $guard$
begin
  if not exists (select 1 from private.widgetflow_schema_migrations where id = '058_template_resubmit_field_cleanup') then
    raise exception 'WidgetFlow migration 058_template_resubmit_field_cleanup must be applied first';
  end if;
  if exists (select 1 from private.widgetflow_schema_migrations where id = '059_template_dynamic_pending_reviewer_eligibility') then
    raise exception 'WidgetFlow migration 059_template_dynamic_pending_reviewer_eligibility has already been applied';
  end if;
end
$guard$;

create or replace function private.current_user_can_review_template(p_template_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with actor as (
    select p.id, p.role_id, r.governance_level
    from public.profiles p
    join public.roles r on r.id = p.role_id and r.is_active
    where p.id = auth.uid()
      and p.status = 'Active'
      and exists (select 1 from public.role_permissions rp where rp.role_id = r.id and rp.permission_key = 'template_approvals.view')
      and exists (select 1 from public.role_permissions rp where rp.role_id = r.id and rp.permission_key = 'template_approvals.approve')
  ), creator_route as (
    select t.id, t.created_by_user_id, t.assigned_reviewer_user_id, route.strategy, route.target_role_id, route.specific_user_id
    from public.templates t
    join public.profiles creator on creator.id = t.created_by_user_id and creator.status = 'Active'
    join public.roles creator_role on creator_role.id = creator.role_id and creator_role.is_active
    join public.governance_routes route on route.creator_governance_level = creator_role.governance_level and route.is_active
    where t.id = p_template_id
      and t.status = 'pending_approval'
  )
  select exists (
    select 1
    from actor a
    join creator_route route on route.id = p_template_id
    where route.created_by_user_id <> a.id
      and (
        (route.strategy = 'ROLE_QUEUE' and route.target_role_id = a.role_id and (route.assigned_reviewer_user_id is null or route.assigned_reviewer_user_id = a.id))
        or
        (route.strategy = 'SPECIFIC_USER' and route.specific_user_id = a.id and route.target_role_id = a.role_id)
      )
  );
$$;

revoke all on function private.current_user_can_review_template(uuid) from public, anon, service_role;
grant execute on function private.current_user_can_review_template(uuid) to authenticated;

drop policy if exists templates_read_queue on public.templates;
create policy templates_read_queue on public.templates
for select to authenticated
using (private.current_user_can_review_template(id));

drop policy if exists template_children_read on public.template_sections;
create policy template_children_read on public.template_sections
for select to authenticated
using (
  exists (
    select 1 from public.templates t
    where t.id = template_id
      and (
        t.status = 'approved'
        or t.created_by_user_id = auth.uid()
        or private.current_user_can_review_template(t.id)
      )
  )
);

drop policy if exists template_fields_read on public.template_fields;
create policy template_fields_read on public.template_fields
for select to authenticated
using (
  exists (
    select 1 from public.templates t
    where t.id = template_id
      and (
        t.status = 'approved'
        or t.created_by_user_id = auth.uid()
        or private.current_user_can_review_template(t.id)
      )
  )
);

drop policy if exists template_tags_read on public.template_tags;
create policy template_tags_read on public.template_tags
for select to authenticated
using (
  exists (
    select 1 from public.templates t
    where t.id = template_id
      and (
        t.status = 'approved'
        or t.created_by_user_id = auth.uid()
        or private.current_user_can_review_template(t.id)
      )
  )
);

create or replace function public.claim_template_review(p_template_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.templates%rowtype; a record;
begin
  if not private.current_user_is_active() or not private.current_user_has_permission('template_approvals.view') then raise exception 'FORBIDDEN'; end if;
  select * into a from private.template_actor(); select * into t from public.templates where id=p_template_id for update;
  if t.status<>'pending_approval' or t.assignment_strategy<>'ROLE_QUEUE' or t.assigned_reviewer_user_id is not null or t.created_by_user_id=a.user_id or not private.current_user_can_review_template(t.id) then raise exception 'CLAIM_NOT_ALLOWED'; end if;
  update public.templates set assigned_reviewer_user_id=a.user_id,assigned_reviewer_name_snapshot=a.full_name,assigned_reviewer_role_id_snapshot=a.role_id,assigned_reviewer_role_key_snapshot=a.role_key,assigned_reviewer_role_name_snapshot=a.role_name,assigned_reviewer_governance_level_snapshot=a.governance_level,claimed_at=statement_timestamp() where id=t.id and assigned_reviewer_user_id is null;
  if not found then raise exception 'CLAIM_CONFLICT'; end if;
  perform private.template_audit(t.id,'TEMPLATE_REVIEW_CLAIMED',t.status,t.status); return private.template_snapshot(t.id);
end $$;

create or replace function public.approve_template(p_template_id uuid) returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.templates%rowtype; a record;
begin
  if not private.current_user_is_active() or not private.current_user_has_permission('template_approvals.view') or not private.current_user_has_permission('template_approvals.approve') then raise exception 'FORBIDDEN'; end if;
  select * into a from private.template_actor(); select * into t from public.templates where id=p_template_id for update;
  if t.status<>'pending_approval' or not private.current_user_can_review_template(t.id) then raise exception 'APPROVAL_NOT_ALLOWED'; end if;
  update public.templates set status='approved',approved_at=statement_timestamp() where id=t.id;
  update public.templates set status='superseded' where id=t.supersedes_template_id and status='approved';
  insert into public.template_versions(template_id,version_label,schema_snapshot,published_by_user_id,publisher_name,publisher_email,publisher_role_id,publisher_role_key,publisher_role_name,publisher_governance_level) values(t.id,t.version_label,private.template_snapshot(t.id),a.user_id,a.full_name,a.email,a.role_id,a.role_key,a.role_name,a.governance_level);
  perform private.template_audit(t.id,'TEMPLATE_APPROVED',t.status,'approved'); return private.template_snapshot(t.id);
end $$;

create or replace function public.reject_template(p_template_id uuid,p_reason text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.templates%rowtype; a record;
begin
  if nullif(btrim(p_reason),'') is null or not private.current_user_is_active() or not private.current_user_has_permission('template_approvals.view') or not private.current_user_has_permission('template_approvals.reject') then raise exception 'FORBIDDEN'; end if;
  select * into a from private.template_actor(); select * into t from public.templates where id=p_template_id for update;
  if t.status<>'pending_approval' or not private.current_user_can_review_template(t.id) then raise exception 'REJECTION_NOT_ALLOWED'; end if;
  update public.templates set status='rejected',rejected_at=statement_timestamp(),rejection_reason=btrim(p_reason) where id=t.id;
  perform private.template_audit(t.id,'TEMPLATE_REJECTED',t.status,'rejected',p_reason); return private.template_snapshot(t.id);
end $$;

revoke all on function public.claim_template_review(uuid), public.approve_template(uuid), public.reject_template(uuid,text) from public, anon;
grant execute on function public.claim_template_review(uuid), public.approve_template(uuid), public.reject_template(uuid,text) to authenticated;

insert into private.widgetflow_schema_migrations(id,description)
values('059_template_dynamic_pending_reviewer_eligibility','Current-role pending template reviewer visibility, self-review exclusion, and action guards');

commit;
