export type FeatureUserOverride = 'inherit' | 'allow' | 'deny';

export type FeatureAccessState = {
  featureKey: string;
  enabled: boolean;
  allowed: boolean;
  protectedAdmin: boolean;
};

export type InsightsAccessResolution = {
  status: 'loading' | 'ready' | 'error';
  enabled: boolean;
  insightsAllowed: boolean;
  protectedAdmin: boolean;
};

export type FeatureAccessPagination = {
  limit: number;
  offset: number;
  total: number;
};

export type FeatureRoleAccessRow = {
  roleId: string;
  roleKey: string;
  roleName: string;
  roleType: string;
  governanceLevel: string | null;
  isActive: boolean;
  isProtected: boolean;
  memberCount: number;
  allowed: boolean;
  effectiveAllowed: boolean;
  configurable: boolean;
};

export type FeatureUserAccessRow = {
  userId: string;
  profileCode: string | null;
  fullName: string;
  email: string | null;
  status: string;
  roleId: string | null;
  roleKey: string | null;
  roleName: string | null;
  roleActive: boolean;
  roleAllowed: boolean;
  override: FeatureUserOverride;
  effectiveAllowed: boolean;
  protectedAdmin: boolean;
  configurable: boolean;
};

export type FeatureAccessPage<T> = {
  featureKey: string;
  featureEnabled: boolean;
  items: T[];
  pagination: FeatureAccessPagination;
};
