import { describe, expect, it } from 'vitest';
import { can } from '../src/shared/platform/permissions';
import { isStrongPassword, normalizePhone, phoneField } from '../src/shared/lib/validation';
import { formatDuration } from '../src/shared/lib/format';

describe('client-side validation (mirrors backend rules)', () => {
  it('normalizes Arabic-Indic digits and separators in phone numbers', () => {
    expect(normalizePhone('٠٩١١ ٢٢٢-٣٣٣')).toBe('0911222333');
    expect(normalizePhone('۰۹۱۱۲۲۲۳۳۳')).toBe('0911222333');
    expect(normalizePhone('00963 911 222 333')).toBe('+963911222333');
  });

  it('validates phone numbers', () => {
    expect(phoneField().safeParse('0911222333').success).toBe(true);
    expect(phoneField().safeParse('12').success).toBe(false);
    expect(phoneField().safeParse('abc').success).toBe(false);
  });

  it('requires 8+ characters with letters and digits', () => {
    expect(isStrongPassword('Student123')).toBe(true);
    expect(isStrongPassword('طالب12345')).toBe(true);
    expect(isStrongPassword('12345678')).toBe(false);
    expect(isStrongPassword('abcdefgh')).toBe(false);
    expect(isStrongPassword('Ab1')).toBe(false);
  });

  it('formats long durations', () => {
    expect(formatDuration(3 * 3600 + 5)).toBe('3:00:05');
    expect(formatDuration(125)).toBe('2:05');
  });
});

describe('UI permissions mirror backend RBAC', () => {
  it('lets only the super admin reset devices, read audit logs and change settings', () => {
    for (const permission of [
      'device.reset',
      'audit.read',
      'settings.manage',
      'owner.manage',
      'student.activity',
    ] as const) {
      expect(can('SUPER_ADMIN', permission)).toBe(true);
      expect(can('OWNER', permission)).toBe(false);
    }
  });

  it('lets both staff roles manage content, students and access', () => {
    for (const permission of ['content.manage', 'students.manage', 'access.manage'] as const) {
      expect(can('SUPER_ADMIN', permission)).toBe(true);
      expect(can('OWNER', permission)).toBe(true);
      expect(can('STUDENT', permission)).toBe(false);
    }
  });
});
