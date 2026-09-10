select
  to_regprocedure('private.current_user_can_review_template(uuid)') is not null as reviewer_helper_exists,
  pg_get_functiondef('private.current_user_can_review_template(uuid)'::regprocedure) like '%route.creator_governance_level = creator_role.governance_level%' as current_creator_role_used,
  pg_get_functiondef('private.current_user_can_review_template(uuid)'::regprocedure) like '%route.created_by_user_id <> a.id%' as self_review_excluded,
  pg_get_functiondef('private.current_user_can_review_template(uuid)'::regprocedure) like '%template_approvals.view%' as view_permission_required,
  pg_get_functiondef('private.current_user_can_review_template(uuid)'::regprocedure) like '%template_approvals.approve%' as approve_permission_required,
  pg_get_functiondef('public.claim_template_review(uuid)'::regprocedure) like '%current_user_can_review_template%' as claim_uses_current_eligibility,
  pg_get_functiondef('public.approve_template(uuid)'::regprocedure) like '%current_user_can_review_template%' as approve_uses_current_eligibility,
  pg_get_functiondef('public.reject_template(uuid,text)'::regprocedure) like '%current_user_can_review_template%' as reject_uses_current_eligibility,
  has_function_privilege('authenticated','public.claim_template_review(uuid)','EXECUTE') as claim_granted,
  has_function_privilege('authenticated','public.approve_template(uuid)','EXECUTE') as approve_granted,
  has_function_privilege('authenticated','public.reject_template(uuid,text)','EXECUTE') as reject_granted,
  exists(select 1 from private.widgetflow_schema_migrations where id='059_template_dynamic_pending_reviewer_eligibility') as ledger_059_exists;
