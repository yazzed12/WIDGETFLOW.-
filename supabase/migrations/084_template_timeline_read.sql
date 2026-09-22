begin;

do $guard$
begin
  if not exists (
    select 1
    from private.widgetflow_schema_migrations
    where left(id, 4) = '083_'
  ) then
    raise exception 'WidgetFlow migration 083 must be applied first';
  end if;
  if exists (
    select 1
    from private.widgetflow_schema_migrations
    where id = '084_template_timeline_read'
  ) then
    raise exception 'WidgetFlow migration 084_template_timeline_read has already been applied';
  end if;
end
$guard$;

create or replace function public.get_template_timeline(p_template_id uuid)
returns table(
  id uuid,
  event_type text,
  occurred_at timestamptz,
  actor_user_id uuid,
  actor_name text,
  actor_role_name text,
  from_status text,
  to_status text,
  action_label text,
  description text,
  reason text
)
language sql
stable
security definer
set search_path = ''
as $function$
with target as (
  select t.id, t.status, t.created_by_user_id, t.assigned_reviewer_user_id
  from public.templates t
  where t.id = p_template_id
), actor as (
  select
    auth.uid() as user_id,
    private.current_user_is_active() as is_active
), visible as (
  select t.id
  from target t
  cross join actor a
  where a.is_active
    and (
      t.created_by_user_id = a.user_id
      or t.assigned_reviewer_user_id = a.user_id
      or private.current_user_can_review_template(t.id)
      or t.status = 'approved'
    )
), ordered_events as (
  select
    e.id,
    e.event_type,
    e.occurred_at,
    e.actor_user_id,
    e.actor_name,
    e.actor_role_name,
    e.from_status,
    e.to_status,
    e.comment,
    count(*) filter (where e.event_type = 'TEMPLATE_SUBMITTED') over (
      partition by e.template_id
      order by e.occurred_at, e.id
      rows between unbounded preceding and 1 preceding
    ) as prior_submission_count
  from public.template_audit_events e
  join visible v on v.id = e.template_id
)
select
  e.id,
  e.event_type,
  e.occurred_at,
  e.actor_user_id,
  e.actor_name,
  e.actor_role_name,
  e.from_status,
  e.to_status,
  case
    when e.event_type = 'TEMPLATE_CREATED' then 'Template created'
    when e.event_type = 'TEMPLATE_DRAFT_SAVED' then 'Draft saved'
    when e.event_type = 'TEMPLATE_SUBMITTED' and e.prior_submission_count > 0 then 'Resubmitted for approval'
    when e.event_type = 'TEMPLATE_SUBMITTED' then 'Submitted for approval'
    when e.event_type = 'TEMPLATE_REVIEW_CLAIMED' then 'Review claimed'
    when e.event_type = 'TEMPLATE_APPROVED' then 'Approved'
    when e.event_type = 'TEMPLATE_REJECTED' then 'Rejected'
    when e.event_type = 'TEMPLATE_RETURNED' then 'Returned for revision'
    else 'Template updated'
  end as action_label,
  case
    when e.event_type = 'TEMPLATE_CREATED' then 'Created template'
    when e.event_type = 'TEMPLATE_DRAFT_SAVED' then 'Saved draft'
    when e.event_type = 'TEMPLATE_SUBMITTED' and e.prior_submission_count > 0 then 'Resubmitted template for approval'
    when e.event_type = 'TEMPLATE_SUBMITTED' then 'Submitted template for approval'
    when e.event_type = 'TEMPLATE_REVIEW_CLAIMED' then 'Took template for review'
    when e.event_type = 'TEMPLATE_APPROVED' then 'Approved template'
    when e.event_type = 'TEMPLATE_REJECTED' then 'Rejected template'
    when e.event_type = 'TEMPLATE_RETURNED' then 'Returned template for revision'
    else 'Updated template'
  end as description,
  case
    when e.event_type in ('TEMPLATE_REJECTED', 'TEMPLATE_RETURNED') then nullif(btrim(e.comment), '')
    else null
  end as reason
from ordered_events e
order by e.occurred_at asc, e.id asc;
$function$;

revoke all on function public.get_template_timeline(uuid) from public, anon;
grant execute on function public.get_template_timeline(uuid) to authenticated;

insert into private.widgetflow_schema_migrations(id, description)
values (
  '084_template_timeline_read',
  'Per-template authorized chronological audit timeline read contract'
);

commit;
