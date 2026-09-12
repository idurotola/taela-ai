export type NavView = 'dashboard' | 'cv' | 'jobs' | 'tracker' | 'analytics' | 'network';

export interface StatCard {
  label: string;
  value: string | number;
  trend: string;
  trendUp: boolean;
  accent: 'yellow' | 'pink' | 'teal' | 'blue';
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'Full-time' | 'Contract' | 'Remote' | 'Hybrid';
  salary: string;
  platform: 'LinkedIn' | 'Jobberman' | 'Indeed' | 'Glassdoor' | 'Direct' | 'MyJobMag';
  industry?: string;
  matchScore: number;
  logoInitials: string;
  logoColor: string;
  logoTextColor: string;
  posted: string;
  sourceUrl?: string;
  applied?: boolean;
}

export interface Application {
  id: string;
  title: string;
  company: string;
  location: string;
  platform: string;
  date: string;
  stage: 'applied' | 'review' | 'shortlisted' | 'interviewing' | 'offered' | 'rejected';
  nextStep?: string;
}

export interface NetworkContact {
  id: string;
  name: string;
  initials: string;
  role: string;
  company: string;
  mutualConnections: number;
  referralFit: 'high' | 'medium' | 'low';
  avatarColor: string;
  connected?: boolean;
}

export interface ATSCheck {
  id?: string;
  label: string;
  status: 'ok' | 'warn' | 'bad';
}

export interface MarketInsight {
  id?: string;
  title: string;
  text: string;
  accent: 'yellow' | 'teal' | 'blue' | 'pink';
}

// --- Backend-driven types (TaelaAI API) ---

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CVExperience {
  id: string;
  role: string;
  company: string;
  dates: string;
  bullets: string[];
}

export interface CV {
  id: string;
  fullName: string;
  jobTitle: string;
  email: string;
  location: string;
  phone: string;
  linkedin: string;
  summary: string;
  targetRole: string;
  targetCompany: string;
  autoTailor: boolean;
  jobDescription: string;
  score: number;
  experiences: CVExperience[];
  atsChecks: ATSCheck[];
}

export interface Activity {
  id: string;
  type: 'application' | 'interview' | 'network' | 'cv';
  title: string;
  sub: string;
}

export interface PipelineStage {
  label: string;
  count: number;
}

export interface DashboardSummary {
  stats: StatCard[];
  bestMatches: JobListing[];
  recentActivity: Activity[];
  pipeline: PipelineStage[];
}

export interface PlatformStat {
  name: string;
  count: number;
  pct: number;
}

export interface WeeklyPoint {
  day: string;
  count: number;
}

export interface FunnelStep {
  label: string;
  value: number;
  pct: number;
}

export interface AnalyticsSummary {
  stats: StatCard[];
  platformStats: PlatformStat[];
  weeklyActivity: WeeklyPoint[];
  funnel: FunnelStep[];
}
