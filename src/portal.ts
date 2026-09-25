import type { PortalConfig } from './shared';
import {
  BellRing,
  BookOpen,
  Building2,
  FolderTree,
  KeyRound,
  LayoutDashboard,
  Layers,
  ScrollText,
  Settings,
  Smartphone,
  UserRound,
  Users,
  UserSquare2,
} from 'lucide-react';

/** Super admin dashboard (spec §41, §76): everything the owner has, plus system administration. */
export const portalConfig: PortalConfig = {
  portal: 'ADMIN_WEB',
  role: 'SUPER_ADMIN',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000',
  nav: [
    { to: '/', labelKey: 'dashboard', icon: LayoutDashboard, end: true },
    { to: '/students', labelKey: 'students', icon: Users },
    { to: '/teachers', labelKey: 'teachers', icon: UserSquare2 },
    { to: '/grades', labelKey: 'grades', icon: Layers },
    { to: '/subjects', labelKey: 'subjects', icon: BookOpen },
    { to: '/content', labelKey: 'content', icon: FolderTree },
    { to: '/access', labelKey: 'access', icon: KeyRound },
    { to: '/devices', labelKey: 'devices', icon: Smartphone },
    { to: '/audit-logs', labelKey: 'auditLogs', icon: ScrollText },
    { to: '/notifications', labelKey: 'notifications', icon: BellRing },
    { to: '/owner', labelKey: 'owner', icon: Building2 },
    { to: '/settings', labelKey: 'settings', icon: Settings },
    { to: '/profile', labelKey: 'profile', icon: UserRound },
  ],
};
