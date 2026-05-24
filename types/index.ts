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
  platform: 'LinkedIn' | 'Jobberman' | 'Indeed' | 'Glassdoor' | 'Direct';
  matchScore: number;
  logoInitials: string;
  logoColor: string;
  logoTextColor: string;
  posted: string;
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
}

export interface ATSCheck {
  label: string;
  status: 'ok' | 'warn' | 'bad';
}

export interface MarketInsight {
  title: string;
  text: string;
  accent: 'yellow' | 'teal' | 'blue' | 'pink';
}
