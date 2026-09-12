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
  User,
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

  jobs: () => request<JobListing[]>('/api/jobs'),
  applyToJob: (id: string) => request<Application>(`/api/jobs/${id}/apply`, { method: 'POST' }),

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
};
