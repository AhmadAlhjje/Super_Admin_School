import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/endpoints/people';
import type { CurrentUser } from '../api/types';
import { can, type Permission } from '../platform/permissions';
import { useApi, usePortal } from '../platform/platform-context';

type AuthState =
  { status: 'loading' } | { status: 'guest'; reason?: 'expired' } | { status: 'authenticated'; user: CurrentUser };

interface AuthContextValue {
  state: AuthState;
  user: CurrentUser | null;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Fired by the API client when a session cannot be refreshed any more. */
export const sessionEvents = new EventTarget();
export const SESSION_ENDED = 'session-ended';

export function AuthProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const { portal } = usePortal();
  const queryClient = useQueryClient();
  const auth = useMemo(() => authApi(api, portal), [api, portal]);
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  // Restore the session from the httpOnly refresh cookie on page load.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = await api.refresh();
      if (cancelled) return;
      if (!token) {
        setState({ status: 'guest' });
        return;
      }
      try {
        const user = await auth.me();
        if (!cancelled) setState({ status: 'authenticated', user });
      } catch {
        if (!cancelled) setState({ status: 'guest' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, auth]);

  useEffect(() => {
    const onEnded = () => {
      api.setAccessToken(null);
      queryClient.clear();
      setState((current) => (current.status === 'authenticated' ? { status: 'guest', reason: 'expired' } : current));
    };
    sessionEvents.addEventListener(SESSION_ENDED, onEnded);
    return () => sessionEvents.removeEventListener(SESSION_ENDED, onEnded);
  }, [api, queryClient]);

  const login = useCallback(
    async (phone: string, password: string) => {
      const result = await auth.login(phone, password);
      api.setAccessToken(result.accessToken);
      const user = await auth.me();
      setState({ status: 'authenticated', user });
    },
    [api, auth],
  );

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } catch {
      // The session may already be gone; local logout still proceeds.
    }
    api.setAccessToken(null);
    queryClient.clear();
    setState({ status: 'guest' });
  }, [api, auth, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      user: state.status === 'authenticated' ? state.user : null,
      login,
      logout,
      can: (permission) => can(state.status === 'authenticated' ? state.user.role : undefined, permission),
    }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
