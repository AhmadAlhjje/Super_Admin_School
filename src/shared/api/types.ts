/** DTOs returned by the backend API (see the backend project, src/modules/**). */

export type Role = 'SUPER_ADMIN' | 'OWNER' | 'STUDENT';
export type WebPortal = 'ADMIN_WEB' | 'OWNER_WEB';
export type AccountStatus = 'ACTIVE' | 'DISABLED';
export type LifecycleFilter = 'active' | 'archived' | 'all';

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Account {
  id: string;
  role: Role;
  name: string;
  phone: string;
  status: AccountStatus;
  archived: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CurrentUser extends Account {
  grade: { id: string; name: string } | null;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: Account;
}

interface Archivable {
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Grade extends Archivable {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  subjectsCount?: number;
}

export interface Subject extends Archivable {
  id: string;
  gradeId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  grade?: { id: string; name: string; archivedAt: string | null };
  teachersCount?: number;
}

export interface GradeDetails extends Grade {
  subjects: Subject[];
}

export interface TeacherRef {
  id: string;
  name: string;
  hasImage: boolean;
  archivedAt: string | null;
  phone?: string | null;
}

export interface SubjectTeacherRow {
  id: string;
  subjectId: string;
  teacherId: string;
  sortOrder: number;
  archivedAt: string | null;
  teacher: TeacherRef;
  topicsCount: number;
}

export interface SubjectDetails extends Subject {
  grade: { id: string; name: string; archivedAt: string | null };
  teachers: SubjectTeacherRow[];
}

export interface Teacher extends Archivable {
  id: string;
  name: string;
  phone: string | null;
  description: string | null;
  hasImage: boolean;
  imageUrl: string | null;
  subjects: {
    subjectTeacherId: string;
    subjectId: string;
    subjectName: string;
    gradeName: string;
  }[];
}

export interface TeacherDetails extends Omit<Teacher, 'subjects'> {
  subjects: {
    id: string;
    subjectId: string;
    archivedAt: string | null;
    subject: {
      id: string;
      name: string;
      archivedAt: string | null;
      grade: { id: string; name: string };
    };
    topicsCount: number;
  }[];
}

export interface TopicRow extends Archivable {
  id: string;
  subjectTeacherId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  sessionsCount: number;
}

export interface SubjectTeacherSpace {
  id: string;
  subjectId: string;
  teacherId: string;
  archivedAt: string | null;
  subject: {
    id: string;
    name: string;
    gradeId: string;
    archivedAt: string | null;
    grade: { id: string; name: string };
  };
  teacher: TeacherRef;
  topics: TopicRow[];
}

export interface SessionRow extends Archivable {
  id: string;
  topicId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  videosCount: number;
  filesCount: number;
}

interface SpaceRef {
  id: string;
  subject: { id: string; name: string; gradeId: string };
  teacher: { id: string; name: string };
}

export interface TopicDetails extends Archivable {
  id: string;
  subjectTeacherId: string;
  title: string;
  description: string | null;
  subjectTeacher: SpaceRef;
  sessions: SessionRow[];
}

export type VideoStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED';
export type VideoDisplayStatus = 'UPLOADING' | 'READY' | 'FAILED';

export interface UploadInfo {
  id: string;
  status: 'UPLOADING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  originalFileName?: string;
  sizeBytes: number;
  chunkSize: number;
  totalChunks: number;
  receivedChunks?: number[];
}

export interface Video extends Archivable {
  id: string;
  sessionId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  status: VideoStatus;
  displayStatus: VideoDisplayStatus;
  durationSeconds: number | null;
  readyAt: string | null;
  upload: UploadInfo | null;
}

export type FileScope = 'SUBJECT' | 'TEACHER' | 'TOPIC' | 'SESSION';
export type FileKind = 'PDF' | 'DOCUMENT' | 'PRESENTATION' | 'SPREADSHEET' | 'ARCHIVE' | 'IMAGE' | 'OTHER';

export interface ContentFile extends Archivable {
  id: string;
  scope: FileScope;
  title: string;
  kind: FileKind;
  originalFileName: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  sortOrder: number;
}

export interface SessionDetails extends Archivable {
  id: string;
  topicId: string;
  title: string;
  description: string | null;
  topic: { id: string; title: string; subjectTeacher: SpaceRef };
  videos: Video[];
  files: ContentFile[];
}

export interface StudentListItem {
  id: string;
  name: string;
  phone: string;
  status: AccountStatus;
  archived: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  grade: { id: string; name: string } | null;
  device: {
    id: string;
    platform: 'ANDROID' | 'IOS';
    model: string | null;
    lastSeenAt: string;
  } | null;
  openSubjectsCount: number;
  openTeachersCount: number;
}

export interface StudentDetails {
  id: string;
  name: string;
  phone: string;
  status: AccountStatus;
  archived: boolean;
  archivedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  passwordChangedAt: string | null;
  grade: { id: string; name: string } | null;
  notes: string | null;
  source: 'STAFF_CREATED' | 'SELF_REGISTERED';
  activeSessions: number;
  device: {
    id: string;
    platform: 'ANDROID' | 'IOS';
    model: string | null;
    osVersion: string | null;
    appVersion: string | null;
    firstSeenAt: string;
    lastSeenAt: string;
  } | null;
  deviceHistory: {
    id: string;
    platform: 'ANDROID' | 'IOS';
    model: string | null;
    status: 'ACTIVE' | 'RESET';
    firstSeenAt: string;
    lastSeenAt: string;
    resetAt: string | null;
  }[];
  openedSubjects: {
    subjectId: string;
    name: string;
    gradeName: string;
    grantedAt: string;
  }[];
  openedTeachers: {
    subjectTeacherId: string;
    subjectName: string;
    teacherName: string;
    grantedAt: string;
  }[];
}

export interface AuditLogRow {
  id: string;
  actorId: string | null;
  actorRole: Role | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: string;
  actor: { id: string; name: string; phone?: string; role: Role } | null;
}

export interface StudentActivity {
  sessions: {
    id: string;
    portal: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
    lastSeenAt: string;
    expiresAt: string;
    revokedAt: string | null;
    revokeReason: string | null;
  }[];
  events: AuditLogRow[];
}

export interface AccessTree {
  student: { id: string; name: string; phone: string };
  grades: {
    id: string;
    name: string;
    subjects: {
      id: string;
      name: string;
      open: boolean;
      teachers: {
        subjectTeacherId: string;
        teacherId: string;
        name: string;
        open: boolean;
        effective: boolean;
      }[];
    }[];
  }[];
}

export interface InstituteStats {
  counts: {
    students: number;
    disabledStudents: number;
    teachers: number;
    subjects: number;
    grades: number;
    topics: number;
    sessions: number;
    videos: number;
    videosInProgress: number;
    videosFailed: number;
    files: number;
  };
  recentVideos: (Video & { sessionTitle: string; topicTitle: string })[];
  recentStudents: {
    id: string;
    name: string;
    phone: string;
    createdAt: string;
    status: AccountStatus;
  }[];
  uploadsPerDay: { date: string; count: number }[];
}

export interface SystemStats {
  storage: {
    videosBytes: number;
    filesBytes: number;
    diskTotalBytes: number | null;
    diskFreeBytes: number | null;
  };
  activeDeviceBindings: number;
  activeSessions: Partial<Record<'ADMIN_WEB' | 'OWNER_WEB' | 'STUDENT_APP', number>>;
  uploadJobs: Partial<Record<UploadInfo['status'], number>>;
  failedJobs: {
    id: string;
    videoId: string;
    originalFileName: string;
    errorMessage: string | null;
    attempts: number;
    updatedAt: string;
    video: { title: string };
  }[];
  recentActivity: AuditLogRow[];
}

export interface DeviceRow {
  id: string;
  platform: 'ANDROID' | 'IOS';
  model: string | null;
  osVersion: string | null;
  appVersion: string | null;
  status: 'ACTIVE' | 'RESET';
  firstSeenAt: string;
  lastSeenAt: string;
  resetAt: string | null;
  student: { id: string; name: string; phone: string; status: AccountStatus };
}

export interface SystemSettings {
  instituteName: string;
  institutePhone: string | null;
  studentSelfRegistration: boolean;
  offlineDownloadsEnabled: boolean;
  offlineLicenseDays: number;
}

export interface OwnerAccount extends Account {
  activeSessions?: number;
}

export type NotificationType = 'NEW_LESSON' | 'NEW_VIDEO' | 'NEW_FILE' | 'ACCOUNT' | 'SYSTEM';

export interface SentNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  createdBy: { id: string; name: string; role: Role } | null;
  recipients: number;
  reads: number;
}

export type NotificationAudience =
  | { kind: 'ALL_STUDENTS' }
  | { kind: 'GRADE'; gradeId: string }
  | { kind: 'SUBJECT'; subjectId: string }
  | { kind: 'SUBJECT_TEACHER'; subjectTeacherId: string };

export interface PlaybackGrant {
  videoId: string;
  title: string;
  durationSeconds: number | null;
  manifestUrl: string;
  expiresAt: string;
}
