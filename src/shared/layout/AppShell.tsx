import { GraduationCap, LogOut, Menu, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth/auth-context';
import { UploadsPanel } from '../features/uploads/UploadsPanel';
import { cn } from '../lib/cn';
import { usePortal } from '../platform/platform-context';
import { IconButton } from '../ui/button';
import { Avatar } from '../ui/display';
import { Drawer } from '../ui/overlay';
import { LanguageSwitch } from './LanguageSwitch';

function Brand() {
  const { t } = useTranslation();
  const { portal } = usePortal();
  const Icon = portal === 'ADMIN_WEB' ? ShieldCheck : GraduationCap;
  return (
    <Link to="/" className="flex items-center gap-3 px-5 py-5">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-white">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="text-base font-bold text-text">{t(`portals.${portal}`)}</span>
    </Link>
  );
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const { nav } = usePortal();
  return (
    <nav aria-label={t('common.menu')} className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
              isActive ? 'bg-primary text-white shadow-sm' : 'text-secondary hover:bg-muted hover:text-text',
            )
          }
        >
          <item.icon className="size-5 shrink-0" aria-hidden />
          {t(`nav.${item.labelKey}`)}
        </NavLink>
      ))}
    </nav>
  );
}

function UserFooter() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  if (!user) return null;
  return (
    <div className="flex items-center gap-3 border-t border-border px-4 py-4">
      <Avatar name={user.name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text">{user.name}</p>
        <p className="truncate text-xs text-secondary">{t(`roles.${user.role}`)}</p>
      </div>
      <Link
        to="/profile"
        aria-label={t('nav.profile')}
        title={t('nav.profile')}
        className="rounded-lg p-1.5 text-secondary hover:bg-muted hover:text-text"
      >
        <UserRound className="size-4" />
      </Link>
      <IconButton label={t('common.logout')} onClick={() => void logout()}>
        <LogOut className="size-4" />
      </IconButton>
    </div>
  );
}

/** Responsive shell: fixed sidebar on large screens, drawer navigation on tablets/phones. */
export function AppShell() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col border-e border-border bg-surface lg:flex">
        <Brand />
        <Navigation />
        <UserFooter />
      </aside>

      <Drawer open={menuOpen} onOpenChange={setMenuOpen} title={t('common.menu')}>
        <Brand />
        <Navigation onNavigate={() => setMenuOpen(false)} />
        <UserFooter />
      </Drawer>

      <div className="lg:ps-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur lg:px-8">
          <IconButton label={t('common.menu')} className="lg:hidden" onClick={() => setMenuOpen(true)}>
            <Menu className="size-5" />
          </IconButton>
          <span className="flex-1" />
          <LanguageSwitch />
        </header>
        <main key={location.pathname} className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
          <Outlet />
        </main>
      </div>
      <UploadsPanel />
    </div>
  );
}
