select
  to_regprocedure('public.save_template_draft(uuid,text,text,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)') is not null as save_rpc_exists,
  pg_get_functiondef('public.save_template_draft(uuid,text,text,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)'::regprocedure) like '%delete from public.template_fields where template_id=t.id%' as deletes_fields_first,
  pg_get_functiondef('public.save_template_draft(uuid,text,text,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)'::regprocedure) like '%delete from public.template_sections where template_id=t.id%' as deletes_sections,
  has_function_privilege('authenticated','public.save_template_draft(uuid,text,text,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)','EXECUTE') as authenticated_can_execute,
  exists(select 1 from private.widgetflow_schema_migrations where id='058_template_resubmit_field_cleanup') as ledger_058_exists;

select
  exists(select 1 from pg_constraint where conname='template_fields_template_id_field_key_key') as field_key_constraint_preserved,
  exists(select 1 from pg_constraint where conname='template_fields_template_id_display_order_key') as display_order_constraint_preserved;
