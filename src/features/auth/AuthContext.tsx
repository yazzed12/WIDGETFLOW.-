import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { authService } from './authService.js';
import { AuthContext, type AuthContextValue } from './authContextDefinition.js';
import { toAuthError } from './authErrors.js';
import { isProtectedAdmin } from './authTypes.js';
import type {
  AuthError,
  AuthPrincipal,
  AuthSessionState,
  LoginCredentials,
} from './authTypes.js';
import { measureDev } from '../../shared/devPerformance.js';

const INITIAL_STATE: AuthSessionState = {
  status: 'initializing',
  session: null,
  authUser: null,
  principal: null,
  error: null,
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthSessionState>(INITIAL_STATE);
  const stateRef = useRef(state);
  const generationRef = useRef(0);
  const blockedErrorRef = useRef<AuthError | null>(null);
  const latestSessionRef = useRef<Session | null>(null);
  const sessionGenerationRef = useRef(0);
  const [sessionGeneration, setSessionGeneration] = useState(0);

  const advanceSessionGeneration = useCallback(() => {
    sessionGenerationRef.current += 1;
    setSessionGeneration(sessionGenerationRef.current);
  }, []);

  const samePrincipal = (left: AuthPrincipal | null, right: AuthPrincipal): boolean => {
    if (!left) return false;
    const leftPermissions = [...left.effectivePermissions].sort();
    const rightPermissions = [...right.effectivePermissions].sort();
    return left.userId === right.userId
      && left.fullName === right.fullName
      && left.email === right.email
      && left.profileCode === right.profileCode
      && left.profileStatus === right.profileStatus
      && left.roleId === right.roleId
      && left.roleKey === right.roleKey
      && left.roleName === right.roleName
      && left.roleType === right.roleType
      && left.governanceLevel === right.governanceLevel
      && left.roleActive === right.roleActive
      && left.roleProtected === right.roleProtected
      && leftPermissions.length === rightPermissions.length
      && leftPermissions.every((permission, index) => permission === rightPermissions[index]);
  };

  const commitState = useCallback((next: AuthSessionState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const establishSession = useCallback(async (session: Session, forceNewSession = false): Promise<AuthPrincipal> => {
    latestSessionRef.current = session;
    const previous = stateRef.current;
    const sameActor = previous.principal?.userId === session.user.id;
    const boundaryAdvanced = previous.status === 'authenticated' && (!sameActor || forceNewSession);
    if (boundaryAdvanced) {
      advanceSessionGeneration();
      commitState({ status: 'initializing', session: null, authUser: null, principal: null, error: null });
    } else if (previous.status !== 'authenticated') {
      commitState({ ...previous, session, authUser: session.user, principal: null });
    }

    const generation = ++generationRef.current;
    try {
      const principal = await measureDev('auth.resolvePrincipal', () => authService.resolvePrincipal());
      if (generation !== generationRef.current) return principal;
      if (principal.userId !== session.user.id) throw new Error('AUTH_SESSION_PRINCIPAL_MISMATCH');

      blockedErrorRef.current = null;
      const currentSession = latestSessionRef.current?.user.id === session.user.id
        ? latestSessionRef.current
        : session;
      if (!boundaryAdvanced && (!sameActor || !samePrincipal(previous.principal, principal) || previous.status !== 'authenticated')) {
        advanceSessionGeneration();
      }
      commitState({
        status: 'authenticated',
        session: currentSession,
        authUser: currentSession.user,
        principal: samePrincipal(previous.principal, principal) ? previous.principal : principal,
        error: null,
      });
      return principal;
    } catch (error) {
      const authError = toAuthError(error);
      if (generation === generationRef.current) {
        blockedErrorRef.current = authError;
        commitState({
          status: 'blocked',
          session: null,
          authUser: null,
          principal: null,
          error: authError,
        });
        try {
          await authService.signOut();
        } catch {
          // The application is already failed closed locally. A later Auth event
          // or refresh will re-evaluate the persisted session and block again.
        }
      }
      throw error;
    }
  }, [advanceSessionGeneration, commitState]);

  useEffect(() => {
    let disposed = false;
    try {
      const unsubscribe = authService.onAuthStateChange((event, session) => {
        if (import.meta.env.DEV) console.info('[WidgetFlow auth event]', {
          event,
          sessionPresent: Boolean(session),
          action: event === 'TOKEN_REFRESHED' ? 'refresh-session' : event === 'SIGNED_OUT' ? 'clear-session' : 'resolve-principal',
        });
        // Supabase recommends keeping this callback synchronous. Database work
        // is deferred outside the Auth client's internal callback lock.
        window.setTimeout(() => {
          if (disposed) return;
          if (event === 'SIGNED_OUT' || !session) {
            generationRef.current += 1;
            const previous = stateRef.current;
            latestSessionRef.current = null;
            if (previous.status === 'authenticated' || previous.session || previous.authUser) advanceSessionGeneration();
            const blockedError = blockedErrorRef.current;
            commitState({
              status: blockedError ? 'blocked' : 'unauthenticated',
              session: null,
              authUser: null,
              principal: null,
              error: blockedError,
            });
            return;
          }

          latestSessionRef.current = session;
          const current = stateRef.current;
          if (event === 'SIGNED_IN' && current.status === 'authenticating') return;
          if (event === 'SIGNED_IN'
            && current.status === 'authenticated'
            && current.session?.user.id === session.user.id
            && current.session.access_token === session.access_token) {
            // login() may have completed before this deliberately deferred Auth
            // event runs. Do not resolve current_principal or remount the workspace twice.
            commitState({ ...current, session, authUser: session.user });
            return;
          }
          if (event === 'TOKEN_REFRESHED'
            && current.status === 'authenticated'
            && current.principal?.userId === session.user.id) {
            // Auth state is already established. Keep the same principal and
            // workspace generation; a routine token rotation is not a login.
            commitState({ ...current, session, authUser: session.user });
            return;
          }
          if (event === 'TOKEN_REFRESHED'
            && current.status === 'initializing'
            && current.session?.user.id === session.user.id) {
            commitState({ ...current, session, authUser: session.user });
            return;
          }
          if (['INITIAL_SESSION', 'SIGNED_IN', 'USER_UPDATED'].includes(event)) {
            void establishSession(session, event === 'SIGNED_IN').catch(() => undefined);
          }
        }, 0);
      });
      return () => {
        disposed = true;
        generationRef.current += 1;
        unsubscribe();
      };
    } catch (error) {
      const authError = toAuthError(error);
      queueMicrotask(() => {
        if (disposed) return;
        commitState({
          status: 'blocked',
          session: null,
          authUser: null,
          principal: null,
          error: authError,
        });
      });
      return () => {
        disposed = true;
        generationRef.current += 1;
      };
    }
  }, [advanceSessionGeneration, commitState, establishSession]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    blockedErrorRef.current = null;
    commitState({
      status: 'authenticating',
      session: null,
      authUser: null,
      principal: null,
      error: null,
    });

    try {
      const { session } = await authService.signIn(credentials);
      return await establishSession(session);
    } catch (error) {
      if (stateRef.current.status === 'authenticating') {
        const authError = toAuthError(error);
        commitState({
          status: 'unauthenticated',
          session: null,
          authUser: null,
          principal: null,
          error: authError,
        });
      }
      throw error;
    }
  }, [advanceSessionGeneration, commitState, establishSession]);

  const logout = useCallback(async () => {
    generationRef.current += 1;
    blockedErrorRef.current = null;
    latestSessionRef.current = null;
    if (stateRef.current.status === 'authenticated' || stateRef.current.session || stateRef.current.authUser) advanceSessionGeneration();
    commitState({
      status: 'unauthenticated',
      session: null,
      authUser: null,
      principal: null,
      error: null,
    });
    await authService.signOut();
  }, [advanceSessionGeneration, commitState]);

  const refreshPrincipal = useCallback(async () => {
    const requestGeneration = generationRef.current;
    let session: Session | null;
    try {
      session = await authService.currentSession();
    } catch {
      return null;
    }
    if (requestGeneration !== generationRef.current) return null;
    if (!session) {
      generationRef.current += 1;
      latestSessionRef.current = null;
      if (stateRef.current.status === 'authenticated' || stateRef.current.session || stateRef.current.authUser) advanceSessionGeneration();
      commitState({ status: 'unauthenticated', session: null, authUser: null, principal: null, error: null });
      return null;
    }
    latestSessionRef.current = session;
    // establishSession advances generation synchronously before its first await.
    // Capture that attempt's generation, not the pre-resolution value, so a
    // successful same-session recovery remains usable while logout/replacement
    // still invalidates late completions.
    const resolution = establishSession(session);
    const resolutionGeneration = generationRef.current;
    const principal = await resolution;
    return resolutionGeneration === generationRef.current ? principal : null;
  }, [advanceSessionGeneration, commitState, establishSession]);

  const isCurrentAuthenticatedSession = useCallback((userId: string, generation: number) => {
    const current = stateRef.current;
    return sessionGenerationRef.current === generation
      && current.status === 'authenticated'
      && current.session?.user.id === userId
      && current.principal?.userId === userId;
  }, []);

  const clearAuthError = useCallback(() => {
    blockedErrorRef.current = null;
    const current = stateRef.current;
    commitState({
      ...current,
      status: current.status === 'blocked' ? 'unauthenticated' : current.status,
      error: null,
    });
  }, [commitState]);

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    sessionGeneration,
    isAuthenticated: state.status === 'authenticated' && Boolean(state.principal),
    isProtectedAdmin: isProtectedAdmin(state.principal),
    permissions: state.principal?.effectivePermissions ?? [],
    login,
    logout,
    refreshPrincipal,
    isCurrentAuthenticatedSession,
    clearAuthError,
  }), [clearAuthError, isCurrentAuthenticatedSession, login, logout, refreshPrincipal, sessionGeneration, state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
