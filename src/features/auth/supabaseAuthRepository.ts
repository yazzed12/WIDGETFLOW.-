import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
  User as SupabaseAuthUser,
} from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '../../lib/supabase/client.js';
import type { CurrentPrincipalRow, LoginCredentials } from './authTypes.js';

export type AuthStateListener = (event: AuthChangeEvent, session: Session | null) => void;
export type SignInResult = { session: Session; user: SupabaseAuthUser };

export interface AuthRepository {
  signIn(credentials: LoginCredentials): Promise<SignInResult>;
  signOut(): Promise<void>;
  currentSession(): Promise<Session | null>;
  currentPrincipal(): Promise<CurrentPrincipalRow | null>;
  onAuthStateChange(listener: AuthStateListener): () => void;
}

export function createSupabaseAuthRepository(
  clientFactory: () => SupabaseClient = getSupabaseBrowserClient,
): AuthRepository {
  return {
    async signIn(credentials) {
      const { data, error } = await clientFactory().auth.signInWithPassword(credentials);
      if (error) throw error;
      if (!data.session || !data.user) throw new Error('AUTH_SESSION_MISSING');
      return { session: data.session, user: data.user };
    },

    async signOut() {
      const { error } = await clientFactory().auth.signOut();
      if (error) throw error;
    },

    async currentSession() {
      const { data, error } = await clientFactory().auth.getSession();
      if (error) throw error;
      return data.session;
    },

    async currentPrincipal() {
      const { data, error } = await clientFactory().rpc('current_principal');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as CurrentPrincipalRow | null;
    },

    onAuthStateChange(listener) {
      const { data } = clientFactory().auth.onAuthStateChange((event, session) => {
        listener(event, session);
      });
      return () => data.subscription.unsubscribe();
    },
  };
}

export const supabaseAuthRepository = createSupabaseAuthRepository();
