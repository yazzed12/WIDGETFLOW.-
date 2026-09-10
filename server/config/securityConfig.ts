export type SameSitePolicy = 'lax' | 'strict' | 'none';

export type SecurityConfig = {
  nodeEnv: string;
  isProduction: boolean;
  clientOrigins: string[];
  demoIdentityEnabled: boolean;
  legacySqliteEnabled: boolean;
  sessionCookie: { name: string; secure: boolean; sameSite: SameSitePolicy };
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

function parseSameSite(value: string | undefined): SameSitePolicy {
  const normalized = (value || 'lax').toLowerCase();
  if (!['lax', 'strict', 'none'].includes(normalized)) throw new Error('SESSION_COOKIE_SAMESITE must be lax, strict, or none.');
  return normalized as SameSitePolicy;
}

export function getSecurityConfig(overrides: Partial<Pick<SecurityConfig, 'nodeEnv' | 'clientOrigins' | 'demoIdentityEnabled'>> = {}): SecurityConfig {
  const nodeEnv = overrides.nodeEnv || process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const clientOrigins = overrides.clientOrigins || (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',').map((origin) => origin.trim()).filter(Boolean);
  const sameSite = parseSameSite(process.env.SESSION_COOKIE_SAMESITE);
  const secure = parseBoolean(process.env.SESSION_COOKIE_SECURE, isProduction);
  if (isProduction && clientOrigins.length === 0) throw new Error('CLIENT_ORIGIN is required in production.');
  if (sameSite === 'none' && !secure) throw new Error('SESSION_COOKIE_SECURE must be true when SameSite=None.');
  return {
    nodeEnv,
    isProduction,
    clientOrigins,
    demoIdentityEnabled: !isProduction && (
      overrides.demoIdentityEnabled ?? parseBoolean(process.env.DEMO_IDENTITY_ENABLED, false)
    ),
    legacySqliteEnabled: !isProduction || parseBoolean(process.env.LEGACY_SQLITE_ENABLED, false),
    sessionCookie: { name: process.env.SESSION_COOKIE_NAME || (isProduction ? '__Host-widgetflow_session' : 'widgetflow_session'), secure, sameSite },
  };
}
