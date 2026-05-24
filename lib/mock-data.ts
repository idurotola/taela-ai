import type { JobListing, Application, NetworkContact, MarketInsight, ATSCheck } from '@/types';

export const MOCK_JOBS: JobListing[] = [
  {
    id: '1',
    title: 'Senior Product Manager',
    company: 'Flutterwave',
    location: 'Lagos, Nigeria',
    type: 'Full-time',
    salary: '₦4.5M–₦6M/yr',
    platform: 'LinkedIn',
    matchScore: 94,
    logoInitials: 'FL',
    logoColor: '#FEF3B0',
    logoTextColor: '#977411',
    posted: '2 days ago',
  },
  {
    id: '2',
    title: 'Product Lead — Payments',
    company: 'Paystack',
    location: 'Lagos, Nigeria',
    type: 'Full-time',
    salary: '₦5M–₦7M/yr',
    platform: 'Jobberman',
    matchScore: 91,
    logoInitials: 'PS',
    logoColor: '#FBC4D5',
    logoTextColor: '#BA1F4F',
    posted: '1 day ago',
  },
  {
    id: '3',
    title: 'UX Researcher',
    company: 'Andela',
    location: 'Remote (Africa)',
    type: 'Remote',
    salary: '$2,000–$3,200/mo',
    platform: 'Indeed',
    matchScore: 88,
    logoInitials: 'AN',
    logoColor: '#BAD9F3',
    logoTextColor: '#1A5C8E',
    posted: '3 days ago',
  },
  {
    id: '4',
    title: 'Growth Product Manager',
    company: 'Opay',
    location: 'Lagos, Nigeria',
    type: 'Full-time',
    salary: '₦3.5M–₦5M/yr',
    platform: 'LinkedIn',
    matchScore: 85,
    logoInitials: 'OP',
    logoColor: '#B3E8DC',
    logoTextColor: '#1F7D65',
    posted: '4 days ago',
  },
  {
    id: '5',
    title: 'Product Manager II',
    company: 'Kuda Bank',
    location: 'Lagos, Nigeria',
    type: 'Hybrid',
    salary: '₦3M–₦4.5M/yr',
    platform: 'Glassdoor',
    matchScore: 81,
    logoInitials: 'KD',
    logoColor: '#E8F2FB',
    logoTextColor: '#1A5C8E',
    posted: '5 days ago',
  },
  {
    id: '6',
    title: 'Head of Product',
    company: 'Kobo360',
    location: 'Nairobi, Kenya',
    type: 'Full-time',
    salary: '$3,500–$5,000/mo',
    platform: 'LinkedIn',
    matchScore: 79,
    logoInitials: 'KB',
    logoColor: '#FBC4D5',
    logoTextColor: '#BA1F4F',
    posted: '1 week ago',
  },
];

export const MOCK_APPLICATIONS: Application[] = [
  { id: 'a1', title: 'Data Analyst', company: 'Carbon', location: 'Lagos', platform: 'LinkedIn', date: 'May 22', stage: 'applied' },
  { id: 'a2', title: 'PM Associate', company: 'Kuda Bank', location: 'Remote', platform: 'Jobberman', date: 'May 21', stage: 'applied' },
  { id: 'a3', title: 'Strategy Analyst', company: 'MTN', location: 'Lagos', platform: 'Indeed', date: 'May 20', stage: 'applied' },
  { id: 'a4', title: 'Product Manager', company: 'Flutterwave', location: 'Lagos', platform: 'LinkedIn', date: 'May 18', stage: 'review' },
  { id: 'a5', title: 'Growth PM', company: 'Opay', location: 'Lagos', platform: 'LinkedIn', date: 'May 17', stage: 'review' },
  { id: 'a6', title: 'Product Lead', company: 'Paystack', location: 'Lagos', platform: 'Jobberman', date: 'May 15', stage: 'shortlisted' },
  { id: 'a7', title: 'Senior PM', company: 'Interswitch', location: 'Lagos', platform: 'Direct', date: 'May 12', stage: 'shortlisted' },
  { id: 'a8', title: 'Head of Product', company: 'Andela', location: 'Remote', platform: 'Indeed', date: 'May 10', stage: 'interviewing', nextStep: 'Round 2 — May 26' },
  { id: 'a9', title: 'PM — Marketplace', company: 'Jumia', location: 'Cairo', platform: 'LinkedIn', date: 'May 8', stage: 'interviewing', nextStep: 'Final — May 28' },
  { id: 'a10', title: 'Senior PM', company: 'Kobo360', location: 'Lagos', platform: 'LinkedIn', date: 'May 2', stage: 'offered' },
];

export const MOCK_CONTACTS: NetworkContact[] = [
  { id: 'n1', name: 'Wura Adeyemi', initials: 'WA', role: 'Head of Product', company: 'Opay', mutualConnections: 3, referralFit: 'high', avatarColor: '#2EAA8A' },
  { id: 'n2', name: 'Kofi Owusu', initials: 'KO', role: 'VP Engineering', company: 'Flutterwave', mutualConnections: 5, referralFit: 'high', avatarColor: '#E83567' },
  { id: 'n3', name: 'Tosin Musa', initials: 'TM', role: 'Talent Partner', company: 'Andela', mutualConnections: 2, referralFit: 'medium', avatarColor: '#2878B5' },
  { id: 'n4', name: 'Aisha Balogun', initials: 'AB', role: 'Product Director', company: 'Paystack', mutualConnections: 7, referralFit: 'high', avatarColor: '#F5C535' },
  { id: 'n5', name: 'Emeka Chukwu', initials: 'EC', role: 'Senior PM', company: 'Kuda Bank', mutualConnections: 1, referralFit: 'medium', avatarColor: '#888' },
  { id: 'n6', name: 'Fatima Ibrahim', initials: 'FI', role: 'Hiring Manager', company: 'Carbon', mutualConnections: 4, referralFit: 'high', avatarColor: '#2EAA8A' },
];

export const ATS_CHECKS: ATSCheck[] = [
  { label: 'Keywords matched: 18/22', status: 'ok' },
  { label: 'Standard headings detected', status: 'ok' },
  { label: 'No images or tables (ATS safe)', status: 'ok' },
  { label: 'Missing: "agile", "OKRs"', status: 'warn' },
  { label: 'Quantified results: 4/8 bullets', status: 'warn' },
  { label: 'Skills section too broad', status: 'bad' },
];

export const KEYWORD_SUGGESTIONS = ['Agile', 'OKRs', 'Roadmapping', 'A/B Testing', 'Jira', 'Confluence', 'Stakeholder Mgmt', 'SQL', 'Data-driven', 'Go-to-market'];

export const MARKET_INSIGHTS: MarketInsight[] = [
  { title: 'Peak Hiring Season', text: 'Product roles up 34% this month. Apply now before competition increases.', accent: 'yellow' },
  { title: 'Skill Gap Detected', text: 'SQL mentioned in 78% of PM job descriptions. Consider a short course.', accent: 'teal' },
  { title: 'Salary Benchmark', text: 'Senior PM in Lagos: ₦4.5M–₦7.2M/yr. You\'re in the right bracket.', accent: 'blue' },
  { title: 'Best Performing CV', text: 'Your Paystack-tailored CV has 2.3x more opens than your generic version.', accent: 'pink' },
];

export const PLATFORM_STATS = [
  { name: 'LinkedIn', count: 35, color: '#2878B5', pct: 74 },
  { name: 'Jobberman', count: 14, color: '#E83567', pct: 30 },
  { name: 'Indeed', count: 8, color: '#6B6B6B', pct: 17 },
  { name: 'Direct', count: 6, color: '#F5C535', pct: 13 },
  { name: 'Glassdoor', count: 4, color: '#2EAA8A', pct: 8 },
];
