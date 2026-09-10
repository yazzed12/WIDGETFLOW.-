import { getSupabaseBrowserClient } from '../../../lib/supabase/client';
import type { AdminPack, Category, OrganizationalRole, User } from '../../../types';
import type { PermissionKey } from '../../../shared/permissionCatalog';
import type {
  AdminAuditRecord,
  AdminOverviewSummary,
  AdminPermissionDefinition,
  AdminRoleCatalog,
} from '../types/adminTypes';

type Row = Record<string, any>;

function requireData<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('The database returned no data.');
  return data;
}

function displayJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function mapAudit(row: Row): AdminAuditRecord {
  return {
    id: row.id,
    timestamp: row.occurred_at ?? row.occurredAt,
    actor_name: row.actor_name ?? row.actorName,
    actor_role: row.actor_role_name ?? row.actorRoleName,
    action: row.event_type ?? row.eventType,
    target: row.target_label ?? row.targetLabel,
    previous_value: displayJson(row.previous_value),
    new_value: displayJson(row.new_value),
  };
}

export const adminReadRepository = {
  async overview(): Promise<AdminOverviewSummary> {
    const { data, error } = await getSupabaseBrowserClient().rpc('admin_overview_summary');
    const value = requireData(data as Row | null, error) as Row;
    return {
      userCount: Number(value.userCount ?? 0), activeUserCount: Number(value.activeUserCount ?? 0),
      roleCount: Number(value.roleCount ?? 0), customRoleCount: Number(value.customRoleCount ?? 0),
      categoryCount: Number(value.categoryCount ?? 0), activeCategoryCount: Number(value.activeCategoryCount ?? 0),
      packCount: Number(value.packCount ?? 0), publishedPackCount: Number(value.publishedPackCount ?? 0),
      contentItemCount: Number(value.contentItemCount ?? 0), enabledContentItemCount: Number(value.enabledContentItemCount ?? 0),
      featureCount: Number(value.featureCount ?? 0), enabledFeatureCount: Number(value.enabledFeatureCount ?? 0),
      elementCount: Number(value.elementCount ?? 0), enabledElementCount: Number(value.enabledElementCount ?? 0),
      auditEventCount: Number(value.auditEventCount ?? 0),
      recentAudit: (Array.isArray(value.recentAudit) ? value.recentAudit : []).map(mapAudit),
    };
  },

  async roleCatalog(): Promise<AdminRoleCatalog> {
    const client = getSupabaseBrowserClient();
    const [roleResult, permissionResult, mappingResult, profileResult] = await Promise.all([
      client.from('roles').select('*').order('name'),
      client.from('permissions').select('*').order('group_key').order('label'),
      client.from('role_permissions').select('role_id,permission_key'),
      client.from('profiles').select('role_id,status,auth_user_id'),
    ]);
    const roleRows = requireData(roleResult.data, roleResult.error) as Row[];
    const permissionRows = requireData(permissionResult.data, permissionResult.error) as Row[];
    const mappings = requireData(mappingResult.data, mappingResult.error) as Row[];
    const profiles = requireData(profileResult.data, profileResult.error) as Row[];
    const permissionsByRole = new Map<string, PermissionKey[]>();
    for (const mapping of mappings) {
      const assigned = permissionsByRole.get(mapping.role_id) ?? [];
      assigned.push(mapping.permission_key as PermissionKey);
      permissionsByRole.set(mapping.role_id, assigned);
    }
    const userCountsByRole = new Map<string, number>();
    const activeUserCountsByRole = new Map<string, number>();
    for (const profile of profiles) {
      userCountsByRole.set(profile.role_id, (userCountsByRole.get(profile.role_id) ?? 0) + 1);
      if (profile.status === 'Active' && profile.auth_user_id) {
        activeUserCountsByRole.set(profile.role_id, (activeUserCountsByRole.get(profile.role_id) ?? 0) + 1);
      }
    }
    const roles: OrganizationalRole[] = roleRows.map((role) => ({
      id: role.id, key: role.key, name: role.name, description: role.description,
      roleType: role.role_type, governanceLevel: role.governance_level,
      isActive: role.is_active, isProtected: role.is_protected,
      assignedUsers: userCountsByRole.get(role.id) ?? 0,
      activeAssignedUsers: activeUserCountsByRole.get(role.id) ?? 0,
      permissions: permissionsByRole.get(role.id) ?? [],
      createdBy: role.created_by_user_id ?? undefined, createdAt: role.created_at, updatedAt: role.updated_at,
    }));
    const permissions: AdminPermissionDefinition[] = permissionRows.map((permission) => ({
      key: permission.key, groupKey: permission.group_key, label: permission.label,
      description: permission.description ?? undefined,
    }));
    return { roles, permissions };
  },

  async users(): Promise<User[]> {
    const client = getSupabaseBrowserClient();
    const [profilesResult, rolesResult] = await Promise.all([
      client.from('profiles').select('*').eq('status', 'Active').not('auth_user_id', 'is', null).order('full_name'),
      client.from('roles').select('*'),
    ]);
    const profiles = requireData(profilesResult.data, profilesResult.error) as Row[];
    const roles = requireData(rolesResult.data, rolesResult.error) as Row[];
    const roleById = new Map(roles.map((role) => [role.id, role]));
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
    return profiles.map((profile) => {
      const role = roleById.get(profile.role_id) as Row | undefined;
      const manager = profileById.get(profile.manager_user_id);
      const initials = profile.avatar_initials || profile.full_name.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase();
      return {
        id: profile.id, profileCode: profile.profile_code, name: profile.full_name, email: profile.email,
        role: role?.name ?? 'Unknown', roleId: role?.id, roleKey: role?.key, roleType: role?.role_type,
        governanceLevel: role?.governance_level, roleActive: role?.is_active, roleProtected: role?.is_protected,
        avatarInitials: initials, avatarBg: profile.avatar_background || 'bg-slate-600',
        department: profile.department, managerUserId: profile.manager_user_id ?? undefined,
        managerName: manager?.full_name, createdAt: profile.created_at, status: profile.status,
      };
    });
  },

  async categories(): Promise<Category[]> {
    const { data, error } = await getSupabaseBrowserClient().from('categories').select('*').order('name');
    return (requireData(data, error) as Row[]).map((row) => ({
      id: row.id, name: row.name, description: row.description, iconName: 'FolderKanban',
      status: row.status,
    }));
  },

  async audit(): Promise<AdminAuditRecord[]> {
    const { data, error } = await getSupabaseBrowserClient().from('admin_audit_events')
      .select('*').order('occurred_at', { ascending: false });
    return (requireData(data, error) as Row[]).map(mapAudit);
  },

  async packs(): Promise<AdminPack[]> {
    const client = getSupabaseBrowserClient();
    const [packsResult, versionsResult, itemsResult] = await Promise.all([
      client.from('standard_packs').select('*').order('updated_at', { ascending: false }),
      client.from('standard_pack_versions').select('*').order('created_at', { ascending: false }),
      client.from('standard_pack_items').select('*').order('display_order'),
    ]);
    const packs = requireData(packsResult.data, packsResult.error) as Row[];
    const versions = requireData(versionsResult.data, versionsResult.error) as Row[];
    const items = requireData(itemsResult.data, itemsResult.error) as Row[];
    return packs.map((pack) => {
      const publishedVersion = versions.find((candidate) => candidate.pack_id === pack.id && candidate.status === 'published');
      const draftVersion = versions.find((candidate) => candidate.pack_id === pack.id && candidate.status === 'draft');
      const editableVersion = draftVersion ?? publishedVersion;
      const mapItems = (version: Row | undefined) => version ? items.filter((item) => item.pack_version_id === version.id).map((item) => ({ id: item.id, packId: pack.id, sourceType: item.source_type,
        sourceKey: item.source_key ?? undefined, label: item.label, configuration: item.configuration_snapshot,
        displayOrder: item.display_order })) : [];
      const publishedItems = mapItems(publishedVersion);
      const draftItems = mapItems(draftVersion);
      const status = pack.status === 'published' ? 'Published' : pack.status === 'draft' ? 'Draft' : pack.status === 'archived' ? 'Archived' : 'Disabled';
      return {
        id: pack.id, name: editableVersion?.name_snapshot ?? pack.name,
        description: editableVersion?.description_snapshot ?? pack.description,
        categoryId: editableVersion?.category_id_snapshot ?? pack.category_id ?? undefined,
        categoryName: editableVersion?.category_name_snapshot ?? pack.category_name_snapshot ?? undefined, status,
        createdBy: pack.created_by_user_id ?? '', createdByName: pack.creator_name_snapshot,
        createdAt: pack.created_at, updatedAt: pack.updated_at,
        structure: Array.isArray(editableVersion?.structure_snapshot) ? editableVersion.structure_snapshot : undefined,
        items: draftVersion ? draftItems : publishedItems,
        publishedVersionId: publishedVersion?.id, draftVersionId: draftVersion?.id,
        versionLabel: publishedVersion?.version_label, draftVersionLabel: draftVersion?.version_label,
        hasDraft: Boolean(draftVersion),
        publishedStructure: Array.isArray(publishedVersion?.structure_snapshot) ? publishedVersion.structure_snapshot : undefined,
        draftStructure: Array.isArray(draftVersion?.structure_snapshot) ? draftVersion.structure_snapshot : undefined,
        publishedItems, draftItems,
      } as AdminPack;
    });
  },
};
