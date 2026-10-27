import type {
  Application,
  AuthResponse,
  CV,
  CVExperience,
  DashboardSummary,
  AnalyticsSummary,
  JobListing,
  MarketInsight,
  NetworkContact,
  RecruiterApplicant,
  RecruiterJob,
  RecruiterProfile,
  User,
  UserSettings,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const TOKEN_KEY = 'taela_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // response wasn't JSON — fall back to statusText
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  signup: (name: string, email: string, password: string) =>
    request<AuthResponse>('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  signin: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/signin', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request<User>('/api/auth/me'),
  updateAccount: (data: { name?: string; email?: string }) =>
    request<User>('/api/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
  updatePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<void>('/api/auth/password', { method: 'PUT', body: JSON.stringify(data) }),
  forgotPassword: (email: string) =>
    request<{ message: string }>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, newPassword: string) =>
    request<void>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),

  settings: () => request<UserSettings>('/api/settings'),
  updateSettings: (data: Partial<UserSettings>) =>
    request<UserSettings>('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),

  jobs: () => request<JobListing[]>('/api/jobs'),
  applyToJob: (id: string) => request<Application>(`/api/jobs/${id}/apply`, { method: 'POST' }),
  saveJob: (id: string) => request<void>(`/api/jobs/${id}/save`, { method: 'POST' }),
  unsaveJob: (id: string) => request<void>(`/api/jobs/${id}/save`, { method: 'DELETE' }),

  applications: () => request<Application[]>('/api/applications'),
  createApplication: (data: { title: string; company: string; location?: string; platform?: string }) =>
    request<Application>('/api/applications', { method: 'POST', body: JSON.stringify(data) }),
  updateApplication: (id: string, data: { stage?: Application['stage']; nextStep?: string }) =>
    request<Application>(`/api/applications/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteApplication: (id: string) => request<void>(`/api/applications/${id}`, { method: 'DELETE' }),

  contacts: () => request<NetworkContact[]>('/api/contacts'),
  connectContact: (id: string) => request<NetworkContact>(`/api/contacts/${id}/connect`, { method: 'POST' }),

  cv: () => request<CV>('/api/cv'),
  updateCV: (data: Partial<Omit<CV, 'id' | 'score' | 'experiences' | 'atsChecks'>>) =>
    request<CV>('/api/cv', { method: 'PUT', body: JSON.stringify(data) }),
  analyzeCV: () => request<CV>('/api/cv/analyze', { method: 'POST' }),
  addCVExperience: (data: { role: string; company: string; dates: string; bullets: string[] }) =>
    request<CVExperience>('/api/cv/experiences', { method: 'POST', body: JSON.stringify(data) }),
  deleteCVExperience: (id: string) => request<void>(`/api/cv/experiences/${id}`, { method: 'DELETE' }),
  keywords: () => request<string[]>('/api/meta/keywords'),

  insights: () => request<MarketInsight[]>('/api/insights'),

  dashboardSummary: () => request<DashboardSummary>('/api/dashboard/summary'),
  analyticsSummary: () => request<AnalyticsSummary>('/api/analytics/summary'),

  recruiter: {
    signup: (name: string, email: string, password: string) =>
      request<AuthResponse>('/api/recruiter/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
    profile: () => request<RecruiterProfile>('/api/recruiter/profile'),
    updateProfile: (data: Partial<Omit<RecruiterProfile, 'id'>>) =>
      request<RecruiterProfile>('/api/recruiter/profile', { method: 'PUT', body: JSON.stringify(data) }),
    jobs: () => request<RecruiterJob[]>('/api/recruiter/jobs'),
    createJob: (data: { title: string; company: string; location?: string; type?: string; salary?: string; description?: string; expiresAt: string }) =>
      request<RecruiterJob>('/api/recruiter/jobs', { method: 'POST', body: JSON.stringify(data) }),
    updateJob: (id: string, data: Partial<{ title: string; company: string; location: string; type: string; salary: string; description: string; expiresAt: string }>) =>
      request<RecruiterJob>(`/api/recruiter/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    applicants: (jobId: string) => request<RecruiterApplicant[]>(`/api/recruiter/jobs/${jobId}/applicants`),
    updateApplicantStage: (applicationId: string, stage: string) =>
      request<RecruiterApplicant>(`/api/recruiter/applications/${applicationId}`, { method: 'PATCH', body: JSON.stringify({ stage }) }),
  },
};
