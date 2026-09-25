import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../src/shared/api/errors';
import type { AccessTree, StudentDetails } from '../src/shared/api/types';
import { LoginPage } from '../src/shared/auth/LoginPage';
import { StudentAccessPanel } from '../src/shared/features/access/StudentAccessPanel';
import { StudentDetailsPage } from '../src/shared/features/students/StudentDetailsPage';
import { StudentFormModal } from '../src/shared/features/students/StudentFormModal';
import { UploadTaskStatus } from '../src/shared/features/uploads/UploadsPanel';
import type { UploadTask } from '../src/shared/features/uploads/upload-manager';
import { adminConfig, fakeApi, ownerConfig, renderWithPlatform, user } from './helpers';

describe('login page', () => {
  it('validates required fields before calling the API', async () => {
    const api = fakeApi({});
    renderWithPlatform(<LoginPage />, { api, route: '/login' });
    await userEvent.click(await screen.findByRole('button', { name: 'دخول' }));
    expect(await screen.findAllByText('هذا الحقل مطلوب')).toHaveLength(2);
    expect(api.calls.filter((c) => c.url.includes('login'))).toHaveLength(0);
  });

  it('shows the backend error for invalid credentials on the owner portal', async () => {
    const api = fakeApi({
      'POST /auth/owner/login': () => new ApiError('INVALID_CREDENTIALS', 401, 'x'),
    });
    renderWithPlatform(<LoginPage />, { api, route: '/login' });
    await userEvent.type(await screen.findByLabelText(/رقم الهاتف/), '٠٩١١١١١١١١');
    await userEvent.type(screen.getByLabelText(/كلمة المرور/), 'Wrong1234');
    await userEvent.click(screen.getByRole('button', { name: 'دخول' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('رقم الهاتف أو كلمة المرور غير صحيحة');
    // Arabic digits were normalized before sending.
    expect(api.calls.find((c) => c.url === '/auth/owner/login')?.body).toEqual({
      phone: '0911111111',
      password: 'Wrong1234',
    });
  });

  it('uses the admin login endpoint on the admin portal', async () => {
    const api = fakeApi({ 'POST /auth/admin/login': () => new ApiError('INVALID_CREDENTIALS', 401, 'x') });
    renderWithPlatform(<LoginPage />, { api, config: adminConfig, route: '/login' });
    await userEvent.type(await screen.findByLabelText(/رقم الهاتف/), '0900000000');
    await userEvent.type(screen.getByLabelText(/كلمة المرور/), 'Admin12345');
    await userEvent.click(screen.getByRole('button', { name: 'دخول' }));
    await screen.findByRole('alert');
    expect(api.calls.some((c) => c.url === '/auth/admin/login')).toBe(true);
  });
});

const tree: AccessTree = {
  student: { id: 's1', name: 'سارة', phone: '0944444444' },
  grades: [
    {
      id: 'g1',
      name: 'البكالوريا',
      subjects: [
        {
          id: 'math',
          name: 'رياضيات',
          open: false,
          teachers: [
            { subjectTeacherId: 'st-ahmad', teacherId: 't1', name: 'أحمد', open: true, effective: false },
            { subjectTeacherId: 'st-mohammad', teacherId: 't2', name: 'محمد', open: false, effective: false },
          ],
        },
      ],
    },
  ],
};

describe('student access panel', () => {
  it('shows lock states and warns when a teacher is open but the subject is closed', async () => {
    const api = fakeApi({ 'GET /access/students/s1': () => tree }, { loggedIn: user('OWNER') });
    renderWithPlatform(<StudentAccessPanel studentId="s1" />, { api });
    expect(await screen.findByText('رياضيات')).toBeInTheDocument();
    expect(screen.getByText('مقفل')).toBeInTheDocument();
    expect(screen.getByText('افتح المادة ليصبح محتوى المدرس متاحاً')).toBeInTheDocument();
  });

  it('opens a teacher through the access API', async () => {
    const opened: AccessTree = structuredClone(tree);
    opened.grades[0]!.subjects[0]!.open = true;
    opened.grades[0]!.subjects[0]!.teachers[1] = {
      ...opened.grades[0]!.subjects[0]!.teachers[1]!,
      open: true,
      effective: true,
    };
    const api = fakeApi(
      {
        'GET /access/students/s1': () => tree,
        'PUT /access/students/s1/subject-teachers/st-mohammad': () => opened,
      },
      { loggedIn: user('OWNER') },
    );
    renderWithPlatform(<StudentAccessPanel studentId="s1" />, { api });
    await userEvent.click(await screen.findByRole('switch', { name: 'فتح المدرس محمد' }));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'فتح المدرس محمد' })).toBeChecked());
    expect(api.calls.find((c) => c.method === 'PUT')?.body).toEqual({ open: true });
  });
});

const student: StudentDetails = {
  id: 's1',
  name: 'سارة',
  phone: '0944444444',
  status: 'ACTIVE',
  archived: false,
  archivedAt: null,
  createdAt: '2026-09-01T10:00:00.000Z',
  lastLoginAt: '2026-09-20T10:00:00.000Z',
  passwordChangedAt: null,
  grade: null,
  notes: null,
  source: 'STAFF_CREATED',
  activeSessions: 1,
  device: {
    id: 'd1',
    platform: 'ANDROID',
    model: 'Pixel 8',
    osVersion: '15',
    appVersion: '1.0.0',
    firstSeenAt: '2026-09-01T10:00:00.000Z',
    lastSeenAt: '2026-09-20T10:00:00.000Z',
  },
  deviceHistory: [],
  openedSubjects: [],
  openedTeachers: [],
};

function renderStudentPage(role: 'OWNER' | 'SUPER_ADMIN') {
  const api = fakeApi({ 'GET /students/s1': () => student }, { loggedIn: user(role) });
  renderWithPlatform(
    <Routes>
      <Route path="/students/:id" element={<StudentDetailsPage />} />
    </Routes>,
    { api, config: role === 'OWNER' ? ownerConfig : adminConfig, route: '/students/s1' },
  );
  return api;
}

describe('student page permissions', () => {
  it('does not offer device reset to the institute owner', async () => {
    renderStudentPage('OWNER');
    expect(await screen.findByText('Pixel 8')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'إعادة ضبط الجهاز' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'النشاط' })).not.toBeInTheDocument();
  });

  it('offers device reset (with the required confirmation) to the super admin', async () => {
    const api = renderStudentPage('SUPER_ADMIN');
    await userEvent.click(await screen.findByRole('button', { name: 'إعادة ضبط الجهاز' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('هل أنت متأكد من إعادة ضبط جهاز الطالب؟')).toBeInTheDocument();
    expect(within(dialog).getByText('سيتمكن الطالب بعد ذلك من تسجيل الدخول من جهاز جديد.')).toBeInTheDocument();
    expect(api.calls.some((c) => c.url.includes('/device/reset'))).toBe(false);
  });
});

describe('student form', () => {
  it('rejects weak passwords and invalid phones client-side', async () => {
    const api = fakeApi({ 'GET /grades': () => [] }, { loggedIn: user('OWNER') });
    renderWithPlatform(<StudentFormModal open onOpenChange={() => undefined} />, { api });
    await userEvent.type(await screen.findByLabelText(/الاسم/), 'سارة');
    await userEvent.type(screen.getByLabelText(/رقم الهاتف/), '123');
    await userEvent.type(screen.getByLabelText(/كلمة المرور/), '12345678');
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    expect(await screen.findByText('رقم الهاتف غير صالح')).toBeInTheDocument();
    expect(screen.getByText('كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حروف وأرقام')).toBeInTheDocument();
    expect(api.calls.some((c) => c.method === 'POST')).toBe(false);
  });
});

describe('upload status (user never sees internal stages)', () => {
  const base: UploadTask = {
    key: 'k',
    kind: 'video',
    videoId: 'v',
    sessionId: 's',
    title: 'شرح',
    fileName: 'a.mp4',
    sizeBytes: 10,
    originalBytes: null,
    phase: 'uploading',
    percent: 64.4,
    background: false,
    error: null,
  };

  it('shows the upload percentage, and that the page must stay open', () => {
    renderWithPlatform(<UploadTaskStatus task={base} />, { api: fakeApi({}) });
    expect(screen.getByText('جاري الرفع 64%')).toBeInTheDocument();
    expect(screen.getByText('أبقِ هذه الصفحة مفتوحة')).toBeInTheDocument();
  });

  it('says the site can be closed once the browser uploads in the background', () => {
    renderWithPlatform(<UploadTaskStatus task={{ ...base, background: true }} />, { api: fakeApi({}) });
    expect(screen.getByText('يمكنك إغلاق الموقع، سيكمل الرفع وحده')).toBeInTheDocument();
  });

  it('shows the compression progress of a video', () => {
    renderWithPlatform(<UploadTaskStatus task={{ ...base, phase: 'compressing', percent: 30.2 }} />, {
      api: fakeApi({}),
    });
    expect(screen.getByText('جاري ضغط الفيديو 30%')).toBeInTheDocument();
  });

  it('shows "uploading" (not processing/encryption) while the server prepares the video', () => {
    renderWithPlatform(<UploadTaskStatus task={{ ...base, phase: 'processing', percent: 100 }} />, {
      api: fakeApi({}),
    });
    expect(screen.getByText('جاري الرفع...')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/تشفير|FFmpeg|HLS|معالجة/);
  });

  it('shows ready and failed states', () => {
    const { unmount } = renderWithPlatform(<UploadTaskStatus task={{ ...base, phase: 'done' }} />, {
      api: fakeApi({}),
    });
    expect(screen.getByText('جاهز')).toBeInTheDocument();
    unmount();
    renderWithPlatform(<UploadTaskStatus task={{ ...base, phase: 'error', error: null }} />, { api: fakeApi({}) });
    expect(screen.getByRole('alert')).toHaveTextContent('فشل رفع الفيديو');
  });
});
