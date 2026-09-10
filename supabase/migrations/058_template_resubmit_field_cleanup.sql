begin;

do $guard$
begin
  if not exists (
    select 1 from private.widgetflow_schema_migrations
    where id = '057_signature_capacity_read_only_recipients'
  ) then
    raise exception 'WidgetFlow migration 057_signature_capacity_read_only_recipients must be applied first';
  end if;
  if exists (
    select 1 from private.widgetflow_schema_migrations
    where id = '058_template_resubmit_field_cleanup'
  ) then
    raise exception 'WidgetFlow migration 058_template_resubmit_field_cleanup has already been applied';
  end if;
end
$guard$;

create or replace function public.save_template_draft(p_template_id uuid,p_name text,p_description text,p_category_id uuid,p_tags jsonb,p_sections jsonb,p_rules jsonb,p_calculations jsonb,p_theme jsonb,p_header_config jsonb,p_footer_config jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a record; t public.templates%rowtype; s jsonb; f jsonb; v_section uuid; idx int:=0;
begin
  if not private.current_user_is_active() or not private.current_user_has_permission('templates.create') then raise exception 'FORBIDDEN'; end if;
  if nullif(btrim(p_name),'') is null or not exists(select 1 from public.categories where id=p_category_id and status='Active') then raise exception 'INVALID_INPUT'; end if;
  select * into a from private.template_actor();
  if p_template_id is null then
    insert into public.templates(name,description,category_id,created_by_user_id,creator_name,creator_email,creator_role_id,creator_role_key,creator_role_name,creator_governance_level,rules,calculations,theme,header_config,footer_config)
    values(btrim(p_name),coalesce(p_description,''),p_category_id,a.user_id,a.full_name,a.email,a.role_id,a.role_key,a.role_name,a.governance_level,coalesce(p_rules,'[]'),coalesce(p_calculations,'[]'),coalesce(p_theme,'{}'),coalesce(p_header_config,'{}'),coalesce(p_footer_config,'{}')) returning * into t;
    perform private.template_audit(t.id,'TEMPLATE_CREATED',null,'draft');
  else
    select * into t from public.templates where id=p_template_id for update;
    if not found or t.created_by_user_id<>a.user_id or t.status not in ('draft','rejected') then raise exception 'DRAFT_NOT_EDITABLE'; end if;
    update public.templates set name=btrim(p_name),description=coalesce(p_description,''),category_id=p_category_id,rules=coalesce(p_rules,'[]'),calculations=coalesce(p_calculations,'[]'),theme=coalesce(p_theme,'{}'),header_config=coalesce(p_header_config,'{}'),footer_config=coalesce(p_footer_config,'{}'),status='draft',rejection_reason=null,rejected_at=null where id=t.id returning * into t;
    perform private.template_audit(t.id,'TEMPLATE_DRAFT_SAVED','rejected','draft');
    delete from public.template_fields where template_id=t.id;
    delete from public.template_sections where template_id=t.id;
  end if;
  if p_template_id is null then delete from public.template_sections where template_id=t.id; end if;
  for s in select * from jsonb_array_elements(coalesce(p_sections,'[]')) loop
    insert into public.template_sections(template_id,name,description,display_order) values(t.id,coalesce(s->>'title','Section '||idx),s->>'description',idx) returning id into v_section;
    for f in select * from jsonb_array_elements(coalesce(s->'components','[]')) loop
      insert into public.template_fields(template_id,section_id,field_key,label,field_type,is_required,placeholder,description,default_value,layout_width,validation_rules,options,configuration,display_order)
      values(t.id,v_section,coalesce(f->>'key',f->>'id','field-'||idx),coalesce(f->>'label','Field'),coalesce(f->>'type','text'),coalesce((f->>'required')::boolean,false),f->>'placeholder',f->>'description',f->'defaultValue',coalesce(f->>'layoutWidth','full'),coalesce(f->'validation','{}'),coalesce(f->'options','[]'),f,coalesce((f->>'order')::int,0));
    end loop; idx:=idx+1;
  end loop;
  delete from public.template_tags where template_id=t.id;
  insert into public.template_tags(template_id,tag) select t.id,value from jsonb_array_elements_text(coalesce(p_tags,'[]'));
  return private.template_snapshot(t.id);
end $$;

revoke all on function public.save_template_draft(uuid,text,text,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.save_template_draft(uuid,text,text,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) to authenticated;

insert into private.widgetflow_schema_migrations(id,description)
values('058_template_resubmit_field_cleanup','Delete stale template fields before rejected-template resubmission reinsertion');

commit;
