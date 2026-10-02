import { createContext } from 'react';
import type { AuthPrincipal, AuthSessionState, LoginCredentials } from './authTypes.js';

export interface AuthContextValue extends AuthSessionState {
  /** Changes on login/logout, actor changes, or authorization-principal changes; not on routine token refresh. */
  sessionGeneration: number;
  isAuthenticated: boolean;
  isProtectedAdmin: boolean;
  permissions: AuthPrincipal['effectivePermissions'];
  login: (credentials: LoginCredentials) => Promise<AuthPrincipal>;
  logout: () => Promise<void>;
  refreshPrincipal: () => Promise<AuthPrincipal | null>;
  isCurrentAuthenticatedSession: (userId: string, generation: number) => boolean;
  clearAuthError: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
