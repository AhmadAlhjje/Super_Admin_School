import { lazy, Suspense, type ReactElement, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { createBrowserRouter, Link, type RouteObject, useRouteError } from 'react-router';
import { toApiError } from '../api/errors';
import { LoginPage } from '../auth/LoginPage';
import { RequireAuth } from '../auth/RequireAuth';
import { AppShell } from '../layout/AppShell';
import { Button } from '../ui/button';
import { EmptyState, ErrorState, SkeletonList } from '../ui/feedback';

// Pages are code-split: each loads on first visit, keeping the initial bundle small.
const AccessPage = lazy(() =>
  import('../features/access/AccessPage').then((m) => ({
    default: m.AccessPage,
  })),
);
const ContentHomePage = lazy(() =>
  import('../features/content/ContentHomePage').then((m) => ({
    default: m.ContentHomePage,
  })),
);
const SessionPage = lazy(() =>
  import('../features/content/SessionPage').then((m) => ({
    default: m.SessionPage,
  })),
);
const SubjectContentPage = lazy(() =>
  import('../features/content/SubjectContentPage').then((m) => ({
    default: m.SubjectContentPage,
  })),
);
const TeacherSpacePage = lazy(() =>
  import('../features/content/TeacherSpacePage').then((m) => ({
    default: m.TeacherSpacePage,
  })),
);
const TopicPage = lazy(() =>
  import('../features/content/TopicPage').then((m) => ({
    default: m.TopicPage,
  })),
);
const GradesPage = lazy(() =>
  import('../features/grades/GradesPage').then((m) => ({
    default: m.GradesPage,
  })),
);
const NotificationsPage = lazy(() =>
  import('../features/notifications/NotificationsPage').then((m) => ({
    default: m.NotificationsPage,
  })),
);
const ProfilePage = lazy(() =>
  import('../features/profile/ProfilePage').then((m) => ({
    default: m.ProfilePage,
  })),
);
const StudentDetailsPage = lazy(() =>
  import('../features/students/StudentDetailsPage').then((m) => ({
    default: m.StudentDetailsPage,
  })),
);
const StudentsPage = lazy(() =>
  import('../features/students/StudentsPage').then((m) => ({
    default: m.StudentsPage,
  })),
);
const SubjectsPage = lazy(() =>
  import('../features/subjects/SubjectsPage').then((m) => ({
    default: m.SubjectsPage,
  })),
);
const TeachersPage = lazy(() =>
  import('../features/teachers/TeachersPage').then((m) => ({
    default: m.TeachersPage,
  })),
);

/** Dashboard home (lazy: it carries the charting library). */
export const InstituteOverviewPage = lazy(() =>
  import('../features/dashboard/InstituteOverview').then((m) => ({
    default: m.InstituteOverview,
  })),
);

function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <EmptyState
      title={t('errors.NOT_FOUND')}
      action={
        <Link to="/">
          <Button variant="outline">{t('nav.dashboard')}</Button>
        </Link>
      }
    />
  );
}

/** Render errors never leave a blank screen. */
function RouteError() {
  const error = useRouteError();
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <ErrorState error={toApiError(error)} onRetry={() => window.location.reload()} />
    </div>
  );
}

/** Suspense boundary for lazily loaded pages. */
export function Page({ children }: { children: ReactNode }) {
  return <Suspense fallback={<SkeletonList rows={6} />}>{children}</Suspense>;
}

/** Pages both dashboards share (both roles may use them; the API enforces each action). */
export const sharedPages: RouteObject[] = [
  {
    path: 'students',
    element: (
      <Page>
        <StudentsPage />
      </Page>
    ),
  },
  {
    path: 'students/:id',
    element: (
      <Page>
        <StudentDetailsPage />
      </Page>
    ),
  },
  {
    path: 'teachers',
    element: (
      <Page>
        <TeachersPage />
      </Page>
    ),
  },
  {
    path: 'grades',
    element: (
      <Page>
        <GradesPage />
      </Page>
    ),
  },
  {
    path: 'subjects',
    element: (
      <Page>
        <SubjectsPage />
      </Page>
    ),
  },
  {
    path: 'content',
    element: (
      <Page>
        <ContentHomePage />
      </Page>
    ),
  },
  {
    path: 'content/subjects/:subjectId',
    element: (
      <Page>
        <SubjectContentPage />
      </Page>
    ),
  },
  {
    path: 'content/spaces/:subjectTeacherId',
    element: (
      <Page>
        <TeacherSpacePage />
      </Page>
    ),
  },
  {
    path: 'content/topics/:topicId',
    element: (
      <Page>
        <TopicPage />
      </Page>
    ),
  },
  {
    path: 'content/sessions/:sessionId',
    element: (
      <Page>
        <SessionPage />
      </Page>
    ),
  },
  {
    path: 'access',
    element: (
      <Page>
        <AccessPage />
      </Page>
    ),
  },
  {
    path: 'access/:studentId',
    element: (
      <Page>
        <AccessPage />
      </Page>
    ),
  },
  {
    path: 'notifications',
    element: (
      <Page>
        <NotificationsPage />
      </Page>
    ),
  },
  {
    path: 'profile',
    element: (
      <Page>
        <ProfilePage />
      </Page>
    ),
  },
];

/** Builds the router: public login page + guarded app shell with shared and portal pages. */
export function createDashboardRouter({ home, extraPages = [] }: { home: ReactElement; extraPages?: RouteObject[] }) {
  return createBrowserRouter([
    { path: '/login', element: <LoginPage />, errorElement: <RouteError /> },
    {
      path: '/',
      element: (
        <RequireAuth>
          <AppShell />
        </RequireAuth>
      ),
      errorElement: <RouteError />,
      children: [
        { index: true, element: <Page>{home}</Page> },
        ...sharedPages,
        ...extraPages,
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ]);
}
