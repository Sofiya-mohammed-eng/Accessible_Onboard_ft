const ACCOUNT_KEY = 'allways-account-draft';
const ACCOUNT_SECRET_KEY = 'allways-account-secret';
const APPLICATION_KEY = 'allways-application-fill';
const CAREER_APPLY_KEY = 'allways-career-apply-fill';
const VIEW_KEY = 'allways-current-view';

export interface AccountDraft {
  mode: 'login' | 'register';
  stage: 'choose' | 'form';
  name: string;
  email: string;
}

export interface AccountSecret {
  password: string;
  confirmPassword: string;
}

export interface ApplicationFill {
  step: number;
  answers: Record<string, string>;
  agreed: boolean;
}

export interface CareerApplyFill {
  jobId: string;
  step: number;
  answers: { name: string; phone: string; experience: string };
}

function browserStorage(kind: 'local' | 'session'): Storage | null {
  try {
    const storage = kind === 'local' ? globalThis.localStorage : globalThis.sessionStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}

function readJson<T>(storage: Storage | null, key: string): T | null {
  try {
    const raw = storage?.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(storage: Storage | null, key: string, value: unknown): void {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // The browser can reject storage when it is full or blocked.
  }
}

export function loadAccountDraft(): AccountDraft | null {
  const draft = readJson<AccountDraft>(browserStorage('local'), ACCOUNT_KEY);
  if (!draft || (draft.mode !== 'login' && draft.mode !== 'register')) return null;
  if (draft.stage !== 'choose' && draft.stage !== 'form') return null;
  return {
    mode: draft.mode,
    stage: draft.stage,
    name: typeof draft.name === 'string' ? draft.name : '',
    email: typeof draft.email === 'string' ? draft.email : '',
  };
}

export function saveAccountDraft(draft: AccountDraft): void {
  writeJson(browserStorage('local'), ACCOUNT_KEY, draft);
}

export function clearStoredPasswords(): void {
  try {
    browserStorage('local')?.removeItem(ACCOUNT_SECRET_KEY);
    browserStorage('session')?.removeItem(ACCOUNT_SECRET_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function loadAccountSecret(): AccountSecret {
  clearStoredPasswords();
  return { password: '', confirmPassword: '' };
}

export function saveAccountSecret(_secret?: AccountSecret): void {
  clearStoredPasswords();
}

export function clearAccountFill(): void {
  try {
    browserStorage('local')?.removeItem(ACCOUNT_KEY);
  } catch {
    // Ignore storage failures.
  }
  clearStoredPasswords();
}

export function loadApplicationFill(): ApplicationFill | null {
  const fill = readJson<ApplicationFill>(browserStorage('local'), APPLICATION_KEY);
  if (!fill || typeof fill.step !== 'number' || !fill.answers) return null;
  return fill;
}

export function saveApplicationFill(fill: ApplicationFill): void {
  writeJson(browserStorage('local'), APPLICATION_KEY, fill);
}

export function clearApplicationFill(): void {
  try {
    browserStorage('local')?.removeItem(APPLICATION_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function loadCareerApplyFill(): CareerApplyFill | null {
  const fill = readJson<CareerApplyFill>(browserStorage('local'), CAREER_APPLY_KEY);
  if (!fill || typeof fill.jobId !== 'string' || !fill.answers) return null;
  return fill;
}

export function saveCareerApplyFill(fill: CareerApplyFill): void {
  writeJson(browserStorage('local'), CAREER_APPLY_KEY, fill);
}

export function clearCareerApplyFill(): void {
  try {
    browserStorage('local')?.removeItem(CAREER_APPLY_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function loadSavedView(): string {
  try {
    return browserStorage('session')?.getItem(VIEW_KEY) || '';
  } catch {
    return '';
  }
}

export function saveSavedView(view: string): void {
  try {
    browserStorage('session')?.setItem(VIEW_KEY, view);
  } catch {
    // Ignore storage failures.
  }
}
