import type { ApplicationRecord, ApplicationStatus, MasterResume } from '@/lib/resume-types';
import { swallowStorageError } from '@/lib/safe-client-storage';

const STORAGE_KEY = 'durgasos_resume_matcher_v1';

type ResumeStoreV1 = {
  version: 1;
  masterResumes: MasterResume[];
  applications: ApplicationRecord[];
};

const emptyStore = (): ResumeStoreV1 => ({
  version: 1,
  masterResumes: [],
  applications: [],
});

function isApplicationStatus(v: unknown): v is ApplicationStatus {
  return (
    v === 'saved' || v === 'applied' || v === 'interviewing' || v === 'rejected' || v === 'offer'
  );
}

function parseMasterResume(v: unknown): MasterResume | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (
    typeof o.id === 'string' &&
    typeof o.title === 'string' &&
    typeof o.content === 'string' &&
    typeof o.createdAt === 'string' &&
    typeof o.updatedAt === 'string'
  ) {
    return {
      id: o.id,
      title: o.title,
      content: o.content,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  }
  return null;
}

function parseApplication(v: unknown): ApplicationRecord | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (
    typeof o.id === 'string' &&
    typeof o.masterResumeId === 'string' &&
    typeof o.jobTitle === 'string' &&
    typeof o.company === 'string' &&
    typeof o.jobDescription === 'string' &&
    isApplicationStatus(o.status) &&
    typeof o.matchScore === 'number' &&
    typeof o.tailoredResumeContent === 'string' &&
    typeof o.coverLetterContent === 'string' &&
    typeof o.createdAt === 'string' &&
    typeof o.updatedAt === 'string'
  ) {
    return {
      id: o.id,
      masterResumeId: o.masterResumeId,
      jobTitle: o.jobTitle,
      company: o.company,
      jobDescription: o.jobDescription,
      status: o.status,
      matchScore: o.matchScore,
      tailoredResumeContent: o.tailoredResumeContent,
      coverLetterContent: o.coverLetterContent,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  }
  return null;
}

function migrate(raw: unknown): ResumeStoreV1 {
  if (!raw || typeof raw !== 'object') return emptyStore();
  const o = raw as Record<string, unknown>;
  const version = o.version;
  if (version !== 1) return emptyStore();

  const mastersRaw = o.masterResumes;
  const appsRaw = o.applications;
  const masterResumes = Array.isArray(mastersRaw)
    ? mastersRaw.map(parseMasterResume).filter((x): x is MasterResume => x !== null)
    : [];
  const applications = Array.isArray(appsRaw)
    ? appsRaw.map(parseApplication).filter((x): x is ApplicationRecord => x !== null)
    : [];

  return { version: 1, masterResumes, applications };
}

export function loadResumeStore(): ResumeStoreV1 {
  if (typeof window === 'undefined') return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    return migrate(JSON.parse(raw) as unknown);
  } catch {
    return emptyStore();
  }
}

export function saveResumeStore(store: ResumeStoreV1): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    swallowStorageError('resume-storage.save', err);
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function addMasterResume(
  store: ResumeStoreV1,
  title: string,
  content: string
): ResumeStoreV1 {
  const t = nowIso();
  const next: MasterResume = {
    id: crypto.randomUUID(),
    title,
    content,
    createdAt: t,
    updatedAt: t,
  };
  return {
    ...store,
    masterResumes: [next, ...store.masterResumes],
  };
}

export function updateMasterResume(
  store: ResumeStoreV1,
  id: string,
  patch: Partial<Pick<MasterResume, 'title' | 'content'>>
): ResumeStoreV1 {
  const t = nowIso();
  return {
    ...store,
    masterResumes: store.masterResumes.map((r) =>
      r.id === id ? { ...r, ...patch, updatedAt: t } : r
    ),
  };
}

export function deleteMasterResume(store: ResumeStoreV1, id: string): ResumeStoreV1 {
  return {
    ...store,
    masterResumes: store.masterResumes.filter((r) => r.id !== id),
  };
}

export function addApplication(
  store: ResumeStoreV1,
  input: Omit<ApplicationRecord, 'id' | 'createdAt' | 'updatedAt'>
): { store: ResumeStoreV1; id: string } {
  const t = nowIso();
  const id = crypto.randomUUID();
  const app: ApplicationRecord = {
    ...input,
    id,
    createdAt: t,
    updatedAt: t,
  };
  return {
    id,
    store: {
      ...store,
      applications: [app, ...store.applications],
    },
  };
}

export function updateApplication(
  store: ResumeStoreV1,
  id: string,
  patch: Partial<
    Pick<
      ApplicationRecord,
      | 'status'
      | 'tailoredResumeContent'
      | 'coverLetterContent'
      | 'matchScore'
      | 'jobTitle'
      | 'company'
      | 'jobDescription'
    >
  >
): ResumeStoreV1 {
  const t = nowIso();
  return {
    ...store,
    applications: store.applications.map((a) =>
      a.id === id ? { ...a, ...patch, updatedAt: t } : a
    ),
  };
}

export function deleteApplication(store: ResumeStoreV1, id: string): ResumeStoreV1 {
  return {
    ...store,
    applications: store.applications.filter((a) => a.id !== id),
  };
}
