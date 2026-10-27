export type NavView = 'dashboard' | 'cv' | 'jobs' | 'tracker' | 'analytics' | 'settings';

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
  logoInitials: string;
  logoColor: string;
  logoTextColor: string;
  posted: string;
  sourceUrl?: string;
  sourceType: 'direct' | 'external';
  slug: string;
  applied?: boolean;
  saved?: boolean;
}

export interface Application {
  id: string;
  title: string;
  company: string;
  location: string;
  platform: string;
  sourceUrl?: string;
  date: string;
  stage: 'prepared' | 'applied' | 'review' | 'shortlisted' | 'interviewing' | 'offered' | 'rejected';
  nextStep?: string;
}

export interface ATSCheck {
  id?: string;
  label: string;
  status: 'ok' | 'warn' | 'bad';
}

// --- Backend-driven types (TaelaAI API) ---

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'jobseeker' | 'recruiter';
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UserSettings {
  jobMatchAlerts: boolean;
  applicationUpdates: boolean;
  weeklyDigest: boolean;
  networkSuggestions: boolean;
}

export interface CVExperience {
  id: string;
  role: string;
  company: string;
  dates: string;
  bullets: string[];
}

export interface CVEducation {
  id?: string;
  school: string;
  degree: string;
  dates: string;
}

/** What the server extracts from an uploaded file, or what a manual edit saves. */
export interface CVContent {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  summary: string;
  skills: string[];
  experiences: { role: string; company: string; dates: string; bullets: string[] }[];
  education: CVEducation[];
}

export interface CVUploadResult {
  cv: CV;
  parsed: CVContent | null;
  parseNote?: string;
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
  skills: string[];
  experiences: CVExperience[];
  education: CVEducation[];
  atsChecks: ATSCheck[];
  sourceFileName?: string;
  sourceFileSize?: number;
}

export interface Activity {
  id: string;
  type: 'application' | 'interview' | 'cv';
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

export type RecruiterKind = 'independent' | 'employer';

export interface RecruiterProfile {
  id: string;
  type: RecruiterKind;
  specialty?: string;
  bio?: string;
  companyName?: string;
  companyWebsite?: string;
  industry?: string;
  verificationStatus?: '' | 'unverified' | 'pending' | 'verified';
}

export interface RecruiterJob {
  id: string;
  slug: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  status: 'open' | 'expired';
  expiresAt: string;
  createdAt: string;
  applicantCount: number;
}

export interface RecruiterApplicant {
  id: string;
  name: string;
  email: string;
  stage: Exclude<Application['stage'], 'prepared'>;
  appliedAt: string;
  phone?: string;
  hasCv: boolean;
  rating: number;
}

export interface RecruiterApplicantDetail extends RecruiterApplicant {
  jobTitle: string;
  coverLetter: string;
  notes: string;
  cvFileName?: string;
  cv?: Partial<CV>;
}

export interface GuestConfirmResult extends AuthResponse {
  jobSlug: string;
  jobTitle: string;
  company: string;
  newAccount: boolean;
  alreadySent: boolean;
}

export interface PublicJob {
  id: string;
  slug: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  industry?: string;
  description: string;
  platform: string;
  sourceType: 'direct' | 'external';
  sourceUrl?: string;
  postedAt: string;
  expiresAt?: string;
  open: boolean;
}
