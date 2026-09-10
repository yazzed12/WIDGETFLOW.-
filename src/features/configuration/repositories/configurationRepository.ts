import { getSupabaseBrowserClient } from '../../../lib/supabase/client';
import type { AdminPack, ContentLibraryItem, SystemEffectiveConfig } from '../../../types';

type Row = Record<string, any>;

function requireData<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('The database returned no data.');
  return data;
}

function mapContentItem(row: Row): ContentLibraryItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    contentType: row.content_type,
    contentValue: row.content_value,
    enabled: row.is_enabled,
    createdBy: row.created_by_user_id ?? '',
    createdByName: row.creator_name_snapshot,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function rpc(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
  const { data, error } = await getSupabaseBrowserClient().rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}

export const configurationRepository = {
  async effectiveConfig(): Promise<SystemEffectiveConfig> {
    const { data, error } = await getSupabaseBrowserClient().rpc('current_effective_system_config');
    return requireData(data as SystemEffectiveConfig | null, error);
  },

  async features(): Promise<Row[]> {
    const { data, error } = await getSupabaseBrowserClient().from('feature_settings').select('*').order('category').order('name');
    return (requireData(data, error) as Row[]).map((row) => ({ ...row, feature_key: row.key, feature_name: row.name }));
  },

  async elements(): Promise<Row[]> {
    const { data, error } = await getSupabaseBrowserClient().from('element_settings').select('*').order('category').order('name');
    return (requireData(data, error) as Row[]).map((row) => ({ ...row, element_key: row.key, element_name: row.name }));
  },

  async contentLibrary(): Promise<ContentLibraryItem[]> {
    const { data, error } = await getSupabaseBrowserClient().from('content_library_items').select('*').order('name');
    return (requireData(data, error) as Row[]).map(mapContentItem);
  },

  async operationalContentLibrary(): Promise<ContentLibraryItem[]> {
    const { data, error } = await getSupabaseBrowserClient().from('content_library_items')
      .select('*').eq('is_enabled', true).order('name');
    return (requireData(data, error) as Row[]).map(mapContentItem);
  },

  async packs(): Promise<AdminPack[]> {
    const client = getSupabaseBrowserClient();
    const [packResult, versionResult, itemResult] = await Promise.all([
      client.from('standard_packs').select('*').eq('status', 'published').order('updated_at', { ascending: false }),
      client.from('standard_pack_versions').select('*').eq('status', 'published').order('created_at', { ascending: false }),
      client.from('standard_pack_items').select('*').order('display_order'),
    ]);
    const packs = requireData(packResult.data, packResult.error) as Row[];
    const versions = requireData(versionResult.data, versionResult.error) as Row[];
    const items = requireData(itemResult.data, itemResult.error) as Row[];
    return packs.filter((pack) => pack.status === 'published').map((pack) => {
      const version = versions.find((candidate) => candidate.pack_id === pack.id && candidate.status === 'published');
      const versionItems = version ? items.filter((item) => item.pack_version_id === version.id) : [];
      return {
        id: pack.id, name: pack.name, description: pack.description,
        categoryId: pack.category_id ?? undefined, categoryName: pack.category_name_snapshot ?? undefined,
        status: pack.status === 'published' ? 'Published' : pack.status === 'draft' ? 'Draft' : 'Disabled',
        createdBy: pack.created_by_user_id ?? '', createdByName: pack.creator_name_snapshot,
        createdAt: pack.created_at, updatedAt: pack.updated_at,
        structure: Array.isArray(version?.structure_snapshot) ? version.structure_snapshot : undefined,
        items: versionItems.map((item) => ({ id: item.id, packId: pack.id, sourceType: item.source_type,
          sourceKey: item.source_key ?? undefined, label: item.label,
          configuration: item.configuration_snapshot, displayOrder: item.display_order })),
      } as AdminPack;
    });
  },

  async governance(): Promise<Row> {
    const client = getSupabaseBrowserClient();
    const [routeResult, roleResult, mappingResult, profileResult] = await Promise.all([
      client.from('governance_routes').select('*').eq('is_active', true),
      client.from('roles').select('*').eq('is_active', true),
      client.from('role_permissions').select('role_id,permission_key'),
      client.from('profiles').select('id,auth_user_id,profile_code,full_name,email,department,role_id,status').eq('status', 'Active').not('auth_user_id', 'is', null),
    ]);
    const routes = requireData(routeResult.data, routeResult.error) as Row[];
    const roles = requireData(roleResult.data, roleResult.error) as Row[];
    const mappings = requireData(mappingResult.data, mappingResult.error) as Row[];
    const profiles = requireData(profileResult.data, profileResult.error) as Row[];
    const permissionsByRole = new Map<string, Set<string>>();
    for (const mapping of mappings) {
      const keys = permissionsByRole.get(mapping.role_id) ?? new Set<string>();
      keys.add(mapping.permission_key);
      permissionsByRole.set(mapping.role_id, keys);
    }
    const eligibleRoles = roles
      .filter((role) => !(role.is_protected && String(role.key).toLowerCase() === 'admin'))
      .map((role) => {
        const keys = permissionsByRole.get(role.id) ?? new Set<string>();
        const hasReviewPermissions = keys.has('template_approvals.view') && keys.has('template_approvals.approve');
        const activeUsers = profiles.filter((profile) => profile.role_id === role.id);
        return {
          id: role.id, key: role.key, name: role.name, roleType: role.role_type,
          governanceLevel: role.governance_level, hasReviewPermissions,
          activeUserCount: activeUsers.length,
          eligibleUserCount: hasReviewPermissions ? activeUsers.length : 0,
          eligibleUsers: hasReviewPermissions ? activeUsers.map((profile) => ({
            id: profile.id, profileCode: profile.profile_code, name: profile.full_name,
            email: profile.email, department: profile.department,
          })) : [],
        };
      });
    const routeFor = (level: string) => {
      const route = routes.find((candidate) => candidate.creator_governance_level === level);
      if (!route) return { id: '', strategy: 'SPECIFIC_USER', specificUserId: '', isDirectPublish: false };
      return { id: route.target_role_id ?? 'DIRECT_PUBLISH', strategy: route.strategy,
        specificUserId: route.specific_user_id ?? '', isDirectPublish: route.strategy === 'DIRECT_PUBLISH' };
    };
    return { routes: { employee: routeFor('Employee'), manager: routeFor('Manager'), director: routeFor('Director') }, eligibleRoles };
  },

  setFeature: (key: string, enabled: boolean) => rpc('admin_set_feature_enabled', { p_key: key, p_enabled: enabled }),
  setElement: (key: string, enabled: boolean) => rpc('admin_set_element_enabled', { p_key: key, p_enabled: enabled }),
  updateSettings: (settings: Row) => rpc('admin_update_system_settings', {
    p_organization_name: settings.org_name, p_platform_name: settings.platform_name,
    p_default_template_version: settings.default_template_version,
    p_allow_report_rejection: settings.allow_rejection, p_allow_report_return: settings.allow_return,
    p_digital_signatures_enabled: settings.digital_signature,
    p_template_governance_enabled: settings.template_governance,
  }),
  createContentItem: (item: Row) => rpc('admin_create_content_library_item', {
    p_name: item.name, p_description: item.description, p_category: item.category,
    p_content_type: item.contentType, p_content_value: item.contentValue,
  }),
  updateContentItem: (id: string, item: Row) => rpc('admin_update_content_library_item', {
    p_item_id: id, p_name: item.name, p_description: item.description, p_category: item.category,
    p_content_type: item.contentType, p_content_value: item.contentValue,
  }),
  setContentItemEnabled: (id: string, enabled: boolean) => rpc('admin_set_content_library_item_enabled', { p_item_id: id, p_enabled: enabled }),
  updateGovernance: (routes: Row) => rpc('admin_update_governance_routes', {
    p_employee_strategy: routes.employeeStrategy,
    p_employee_target_role_id: routes.employeeStrategy === 'DIRECT_PUBLISH' ? null : routes.employeeTargetRoleId,
    p_employee_specific_user_id: routes.employeeStrategy === 'SPECIFIC_USER' ? routes.employeeSpecificUserId : null,
    p_manager_strategy: routes.managerStrategy,
    p_manager_target_role_id: routes.managerStrategy === 'DIRECT_PUBLISH' ? null : routes.managerTargetRoleId,
    p_manager_specific_user_id: routes.managerStrategy === 'SPECIFIC_USER' ? routes.managerSpecificUserId : null,
    p_director_strategy: routes.directorStrategy,
    p_director_target_role_id: routes.directorStrategy === 'DIRECT_PUBLISH' ? null : routes.directorTargetRoleId,
    p_director_specific_user_id: routes.directorStrategy === 'SPECIFIC_USER' ? routes.directorSpecificUserId : null,
  }),
};
