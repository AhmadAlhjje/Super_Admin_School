import type { Role } from '../api/types';

/**
 * UI permissions mirror the backend RBAC so staff only see actions they can perform.
 * They are a convenience, never a security boundary: the API enforces every rule.
 */
export type Permission =
  | 'device.reset'
  | 'student.activity'
  | 'audit.read'
  | 'settings.manage'
  | 'owner.manage'
  | 'system.stats'
  | 'content.manage'
  | 'students.manage'
  | 'access.manage';

const GRANTS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: [
    'device.reset',
    'student.activity',
    'audit.read',
    'settings.manage',
    'owner.manage',
    'system.stats',
    'content.manage',
    'students.manage',
    'access.manage',
  ],
  OWNER: ['content.manage', 'students.manage', 'access.manage'],
  STUDENT: [],
};

export function can(role: Role | undefined, permission: Permission): boolean {
  return role !== undefined && GRANTS[role].includes(permission);
}
