import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router';
import type { Permission } from '../platform/permissions';
import { Spinner } from '../ui/feedback';
import { useAuth } from './auth-context';

/**
 * Route guard: waits for session restoration, redirects guests to /login (remembering where
 * they were going) and optionally requires a permission. Backend authorization still applies.
 */
export function RequireAuth({ children, permission }: { children: ReactNode; permission?: Permission }) {
  const { state, can } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label={t('auth.checking')} />
      </div>
    );
  }
  if (state.status === 'guest') {
    return <Navigate to="/login" replace state={{ from: location.pathname, expired: state.reason === 'expired' }} />;
  }
  if (permission && !can(permission)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
