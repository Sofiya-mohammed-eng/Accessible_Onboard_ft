export type CareerSupport = 'screen' | 'step' | 'flexible' | 'written' | 'sign';

export interface CareerJob {
  id: string;
  title: string;
  organization: string;
  location: string;
  summary: string;
  supports: CareerSupport[];
  otherSupport: string;
  source?: string;
}

export interface SavedApplication {
  id: string;
  reference: string;
  jobId: string | null;
  jobTitle: string;
  employer: string;
}

export interface Account {
  id: string;
  name: string;
  email: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError('The AllWays service is not available. Start the backend and try again.', 0);
  }
  const body = (await response.json().catch(() => null)) as { message?: unknown } | T | null;
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'message' in body ? body.message : undefined;
    const text = Array.isArray(message)
      ? message.filter((item) => typeof item === 'string').join(' ')
      : typeof message === 'string'
        ? message
        : '';
    if (!text) {
      throw new ApiError('The AllWays service is not available. Start the backend and try again.', response.status);
    }
    throw new ApiError(text, response.status);
  }
  return body as T;
}

export function listJobs(): Promise<CareerJob[]> {
  return request<CareerJob[]>('/jobs');
}

export function createJob(input: Omit<CareerJob, 'id' | 'source'>): Promise<CareerJob> {
  return request<CareerJob>('/jobs', { method: 'POST', body: JSON.stringify(input) });
}

export function createCareerApplication(
  jobId: string,
  input: { name: string; phone: string; experience: string },
): Promise<SavedApplication> {
  return request<SavedApplication>(`/jobs/${encodeURIComponent(jobId)}/applications`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function submitApplication(input: {
  jobId?: string;
  jobTitle: string;
  employer: string;
  name: string;
  phone: string;
  experience: string;
  education?: string;
  skills?: string;
  cvName?: string;
}): Promise<SavedApplication> {
  return request<SavedApplication>('/applications', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function registerAccount(input: { name: string; email: string; password: string }): Promise<Account> {
  return request<Account>('/accounts', { method: 'POST', body: JSON.stringify(input) });
}

export function signIn(input: { email: string; password: string }): Promise<Account> {
  return request<Account>('/sessions', { method: 'POST', body: JSON.stringify(input) });
}
