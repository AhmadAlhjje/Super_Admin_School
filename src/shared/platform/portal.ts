import type { ComponentType } from 'react';
import type { Translation } from '../i18n/locales/ar';
import type { Role, WebPortal } from '../api/types';

export type NavLabelKey = keyof Translation['nav'];

export interface NavItem {
  to: string;
  labelKey: NavLabelKey;
  icon: ComponentType<{ className?: string }>;
  /** Match only the exact path (for the dashboard "/"). */
  end?: boolean;
}

/** Everything that differs between the two dashboards. */
export interface PortalConfig {
  portal: WebPortal;
  role: Extract<Role, 'SUPER_ADMIN' | 'OWNER'>;
  apiBaseUrl: string;
  nav: NavItem[];
}
