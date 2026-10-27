import type { RecruiterApplicant } from '@/types';

export const BRAND = '#1E4845';
export const GREY = '#6B6B6B';
export const BORDER = '#E4E4E4';

export type Stage = RecruiterApplicant['stage'];

export const STAGES: { id: Stage; label: string; color: string; bg: string }[] = [
  { id: 'applied',      label: 'New',          color: '#6B6B6B', bg: '#F0F0F0' },
  { id: 'review',       label: 'In review',    color: '#2878B5', bg: '#E8F2FB' },
  { id: 'shortlisted',  label: 'Shortlisted',  color: '#977411', bg: '#FEF3B0' },
  { id: 'interviewing', label: 'Interviewing', color: '#E83567', bg: '#FEE8EF' },
  { id: 'offered',      label: 'Offered',      color: '#1F7D65', bg: '#E6F7F3' },
  { id: 'rejected',     label: 'Rejected',     color: '#8A8A8A', bg: '#EEE' },
];

export const stageMeta = (s: Stage) => STAGES.find((x) => x.id === s) ?? STAGES[0];

/** "3 days ago" style label for a timestamp. */
export function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  return days < 30 ? `${days} day${days === 1 ? '' : 's'} ago` : new Date(iso).toLocaleDateString();
}

/** Whole days until a date; negative when it has passed. */
export function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

// <input type="date"> wants "YYYY-MM-DD" in LOCAL time; toISOString() would
// roll the day back in timezones ahead of UTC.
export function toDateInputValue(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateInputValue(d);
}

export function publicJobUrl(slug: string): string {
  return `${window.location.origin}/jobs/${slug}`;
}

export const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]!.toUpperCase()).join('') || '?';
