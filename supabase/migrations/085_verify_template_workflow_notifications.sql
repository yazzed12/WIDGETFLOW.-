-- Migration 085 verification (read-only).
-- This script intentionally performs catalog/data checks only; it does not
-- mutate the database and is safe to run before manual review/application.
with function_defs as (
  select
    n.nspname,
    p.proname,
    pg_get_function_identity_arguments(p.oid) as identity_arguments,
    pg_get_functiondef(p.oid) as definition,
    p.prosecdef,
    coalesce(array_to_string(p.proconfig, ','), '') as config
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where (n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) in (
    ('private', 'create_template_notification', 'p_recipient_user_id uuid, p_notification_type text, p_title text, p_message text, p_template_id uuid'),
    ('public', 'submit_template_for_approval', 'p_template_id uuid'),
    ('public', 'approve_template', 'p_template_id uuid'),
    ('public', 'reject_template', 'p_template_id uuid, p_reason text'),
    ('public', 'return_template_for_revision', 'p_template_id uuid, p_reason text'),
    ('public', 'claim_template_review', 'p_template_id uuid')
  )
),
submit_def as (
  select definition from function_defs
  where nspname = 'public' and proname = 'submit_template_for_approval'
),
approve_def as (
  select definition from function_defs
  where nspname = 'public' and proname = 'approve_template'
),
reject_def as (
  select definition from function_defs
  where nspname = 'public' and proname = 'reject_template'
),
return_def as (
  select definition from function_defs
  where nspname = 'public' and proname = 'return_template_for_revision'
),
claim_def as (
  select definition from function_defs
  where nspname = 'public' and proname = 'claim_template_review'
),
helper_def as (
  select definition, prosecdef, config from function_defs
  where nspname = 'private' and proname = 'create_template_notification'
)
select
  exists (select 1 from private.widgetflow_schema_migrations where id = '085_template_workflow_notifications') as migration_recorded,
  to_regclass('public.notifications') is not null as notification_table_exists,
  coalesce((select c.relrowsecurity from pg_class c where c.oid = 'public.notifications'::regclass), false) as notifications_rls_enabled,
  case when to_regclass('public.notifications') is not null
    then not has_table_privilege('authenticated', 'public.notifications', 'INSERT')
    else false end as authenticated_cannot_insert_notifications,
  case when to_regclass('public.notifications') is not null
    then not has_table_privilege('anon', 'public.notifications', 'SELECT')
    else false end as anon_cannot_select_notifications,
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'notifications_read_own'
      and (qual ilike '%recipient_user_id%' and qual ilike '%auth.uid()%')
  ) as own_read_policy_exists,
  to_regprocedure('public.submit_template_for_approval(uuid)') is not null as submit_function_exists,
  to_regprocedure('public.approve_template(uuid)') is not null as approve_function_exists,
  to_regprocedure('public.reject_template(uuid,text)') is not null as reject_function_exists,
  to_regprocedure('public.return_template_for_revision(uuid,text)') is not null as return_function_exists,
  to_regprocedure('public.claim_template_review(uuid)') is not null as claim_function_exists,
  to_regprocedure('private.create_template_notification(uuid,text,text,text,uuid)') is not null as private_helper_exists,
  coalesce((select prosecdef from helper_def limit 1), false) as helper_security_definer,
  coalesce((select config ilike '%search_path=%' from helper_def limit 1), false) as helper_hardened_search_path,
  case when to_regprocedure('private.create_template_notification(uuid,text,text,text,uuid)') is not null
    then not has_function_privilege('anon', 'private.create_template_notification(uuid,text,text,text,uuid)', 'EXECUTE')
      and not has_function_privilege('authenticated', 'private.create_template_notification(uuid,text,text,text,uuid)', 'EXECUTE')
      and not has_function_privilege('service_role', 'private.create_template_notification(uuid,text,text,text,uuid)', 'EXECUTE')
    else false end as helper_private_grants_revoked,
  coalesce((select definition ilike '%TEMPLATE_REVIEW_REQUESTED%' and definition ilike '%role_permissions%' and definition ilike '%ROLE_QUEUE%' from submit_def limit 1), false) as submission_producer_and_queue_logic,
  coalesce((select definition ilike '%SPECIFIC_USER%' and definition ilike '%specific_user_id%' from submit_def limit 1), false) as specific_user_logic_preserved,
  coalesce((select definition ilike '%p.id <> a.user_id%' and definition ilike '%template_approvals.view%' and definition ilike '%template_approvals.approve%' from submit_def limit 1), false) as queue_eligibility_excludes_creator,
  coalesce((select definition ilike '%template_display_id%' and definition ilike '%next_template_display_id%' and definition ilike '%template_versions%' and definition ilike '%TEMPLATE_APPROVED%' from approve_def limit 1), false) as approval_display_id_and_publication_preserved,
  coalesce((select definition ilike '%TEMPLATE_APPROVED%' and definition ilike '%create_template_notification%' from approve_def limit 1), false) as approval_producer_present,
  coalesce((select definition ilike '%TEMPLATE_REJECTED%' and definition ilike '%create_template_notification%' and definition ilike '%rejection_reason%' from reject_def limit 1), false) as rejection_producer_present,
  coalesce((select definition ilike '%returned_at%' and definition ilike '%return_reason%' and definition ilike '%TEMPLATE_RETURNED%' and definition ilike '%create_template_notification%' from return_def limit 1), false) as return_producer_and_metadata_present,
  coalesce((select definition not ilike '%create_template_notification%' and definition ilike '%TEMPLATE_REVIEW_CLAIMED%' from claim_def limit 1), false) as claim_has_no_notification_producer,
  not exists (
    select 1 from function_defs
    where nspname = 'public'
      and proname in ('submit_template_for_approval', 'approve_template', 'reject_template', 'return_template_for_revision')
      and (definition ilike '%|| t.id::text%' or definition ilike '%|| p_template_id::text%')
  ) as no_uuid_in_human_messages,
  coalesce((select definition ilike '%security definer%' and definition ilike '%set search_path = ''''%' from submit_def limit 1), false) as submit_hardened,
  coalesce((select definition ilike '%security definer%' and definition ilike '%set search_path = ''''%' from approve_def limit 1), false) as approve_hardened,
  coalesce((select definition ilike '%security definer%' and definition ilike '%set search_path = ''''%' from reject_def limit 1), false) as reject_hardened,
  coalesce((select definition ilike '%security definer%' and definition ilike '%set search_path = ''''%' from return_def limit 1), false) as return_hardened,
  coalesce((select definition not ilike '%create trigger%' and definition not ilike '%event bus%' from submit_def limit 1), false) as no_trigger_or_event_bus
;
