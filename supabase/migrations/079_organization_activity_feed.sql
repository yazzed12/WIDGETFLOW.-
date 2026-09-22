begin;

do $guard$
begin
  if not exists (select 1 from private.widgetflow_schema_migrations where id = '078_template_return_and_report_return_schema_fix') then
    raise exception 'WidgetFlow migration 078_template_return_and_report_return_schema_fix must be applied first';
  end if;
  if exists (select 1 from private.widgetflow_schema_migrations where id = '079_organization_activity_feed') then
    raise exception 'WidgetFlow migration 079_organization_activity_feed has already been applied';
  end if;
end $guard$;

create index organization_activity_template_time_idx on public.template_audit_events (occurred_at desc, id desc);
create index organization_activity_report_time_idx on public.report_audit_events (occurred_at desc, id desc);
create index organization_activity_signature_time_idx on public.report_signature_events (occurred_at desc, id desc);

create or replace function public.list_organization_activity(
  p_category text default null,
  p_event_type text default null,
  p_date_from timestamptz default null,
  p_date_to timestamptz default null,
  p_limit integer default 25,
  p_before_occurred_at timestamptz default null,
  p_before_id uuid default null
) returns table(
  id uuid, event_type text, category text, occurred_at timestamptz,
  actor_user_id uuid, actor_name text, actor_role_name text,
  entity_type text, entity_id uuid, entity_display_name text,
  action_label text, description text, reason text, from_status text, to_status text
)
language sql stable security definer set search_path = '' as $function$
with actor as (
  select private.current_user_is_active() as active,
    private.current_user_has_permission('audit_history.view') as can_audit
), events as (
  select e.id, e.event_type, 'template'::text category, e.occurred_at,
    e.actor_user_id, e.actor_name, e.actor_role_name, 'template'::text entity_type,
    e.template_id entity_id, e.template_name_snapshot entity_display_name,
    case e.event_type
      when 'TEMPLATE_CREATED' then 'Created template' when 'TEMPLATE_DRAFT_SAVED' then 'Updated template draft'
      when 'TEMPLATE_SUBMITTED' then 'Submitted template for approval' when 'TEMPLATE_REVIEW_CLAIMED' then 'Took template for review'
      when 'TEMPLATE_APPROVED' then 'Approved template' when 'TEMPLATE_REJECTED' then 'Rejected template'
      when 'TEMPLATE_RETURNED' then 'Returned template for revision' else 'Updated template' end action_label,
    case e.event_type when 'TEMPLATE_CREATED' then 'created' when 'TEMPLATE_DRAFT_SAVED' then 'updated' when 'TEMPLATE_SUBMITTED' then 'submitted' when 'TEMPLATE_REVIEW_CLAIMED' then 'claimed' when 'TEMPLATE_APPROVED' then 'approved' when 'TEMPLATE_REJECTED' then 'rejected' when 'TEMPLATE_RETURNED' then 'returned' else 'updated' end description,
    case when e.event_type in ('TEMPLATE_REJECTED','TEMPLATE_RETURNED') then nullif(btrim(e.comment),'') else null end reason,
    e.from_status, e.to_status
  from public.template_audit_events e join public.templates t on t.id=e.template_id
  where (t.created_by_user_id=auth.uid() or (t.status='approved' and private.current_user_has_permission('templates.view_approved')) or private.current_user_can_review_template(t.id))
  union all
  select e.id, e.event_type, 'report', e.occurred_at, e.actor_user_id, e.actor_name, e.actor_role_name, 'report', e.report_id, e.report_title_snapshot,
    case e.event_type when 'REPORT_CREATED' then 'Created report' when 'REPORT_DRAFT_SAVED' then 'Updated report draft' when 'REPORT_COMPLETED' then 'Completed report' when 'REPORT_SENT' then 'Sent report' when 'REPORT_RETURNED' then 'Returned report' when 'REPORT_REJECTED' then 'Rejected report' else 'Updated report' end,
    case e.event_type when 'REPORT_CREATED' then 'created' when 'REPORT_DRAFT_SAVED' then 'updated' when 'REPORT_COMPLETED' then 'completed' when 'REPORT_SENT' then 'sent' when 'REPORT_RETURNED' then 'returned' when 'REPORT_REJECTED' then 'rejected' else 'updated' end,
    case when e.event_type in ('REPORT_RETURNED','REPORT_REJECTED') then nullif(btrim(e.comment),'') else null end, e.from_status, e.to_status
  from public.report_audit_events e where private.current_user_can_read_report(e.report_id)
  union all
  select e.id, e.event_type, 'signature', e.occurred_at, e.signer_user_id, e.signer_name, e.signer_role_name, 'report', e.report_id, r.title,
    case e.event_type when 'signed' then 'Signed report' when 'superseded' then 'Superseded signature' when 'revoked' then 'Revoked signature' else 'Updated signature' end,
    case when e.event_type in ('revoked','superseded') then nullif(btrim(e.event_reason),'') else null end, null, null
  from public.report_signature_events e join public.reports r on r.id=e.report_id where private.current_user_can_read_report(e.report_id)
), filtered as (
  select * from events cross join actor a where a.active and a.can_audit
    and (p_category is null or category=p_category) and (p_event_type is null or event_type=p_event_type)
    and (p_date_from is null or occurred_at >= p_date_from) and (p_date_to is null or occurred_at < p_date_to)
    and (p_before_occurred_at is null or (occurred_at, id) < (p_before_occurred_at, p_before_id))
)
select * from filtered order by occurred_at desc, id desc limit least(greatest(coalesce(p_limit,25),1),50);
$function$;

revoke all on function public.list_organization_activity(text,text,timestamptz,timestamptz,integer,timestamptz,uuid) from public, anon;
grant execute on function public.list_organization_activity(text,text,timestamptz,timestamptz,integer,timestamptz,uuid) to authenticated;
insert into private.widgetflow_schema_migrations(id,description) values ('079_organization_activity_feed','Protected canonical business activity feed for templates, reports, and signatures');
commit;
