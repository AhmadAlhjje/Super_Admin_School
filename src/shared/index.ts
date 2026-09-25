/** Public surface of the shared layer (design system, API client, shared screens) used by this app. */
import './i18n/i18n';

export { adminApi } from './api/endpoints/admin';
export { ApiError, errorMessage } from './api/errors';
export type * from './api/types';
export { RequireAuth } from './auth/RequireAuth';
export { useAuth } from './auth/auth-context';
export { InstituteOverview } from './features/dashboard/InstituteOverview';
export { ResetPasswordModal } from './features/students/ResetPasswordModal';
export { useListParams } from './hooks/use-list-params';
export { runAction } from './lib/actions';
export { cn } from './lib/cn';
export { formatBytes, formatDate, formatDateTime, formatNumber } from './lib/format';
export { fieldError, translateKey } from './lib/translate';
export { isStrongPassword, normalizePhone, phoneField, requiredText, strongPasswordField } from './lib/validation';
export { PlatformProvider } from './platform/PlatformProvider';
export { can, type Permission } from './platform/permissions';
export { useApi, usePortal } from './platform/platform-context';
export type { NavItem, PortalConfig } from './platform/portal';
export { createDashboardRouter, InstituteOverviewPage, Page, sharedPages } from './platform/routes';
export { Button, IconButton } from './ui/button';
export { ActionsMenu, SearchInput, Switch, Tabs } from './ui/controls';
export { DataTable, Pagination, QueryView, type Column } from './ui/data-table';
export { Avatar, Badge, Card, CardHeader, DetailList, PageHeader, StatCard } from './ui/display';
export { EmptyState, ErrorState, ProgressBar, Skeleton, SkeletonList, Spinner } from './ui/feedback';
export { Checkbox, Field, Input, Select, Textarea } from './ui/form';
export { ConfirmDialog, Modal } from './ui/overlay';
