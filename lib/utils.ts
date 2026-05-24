export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export const ACCENT_STYLES = {
  yellow: {
    bg: '#FEF3B0',
    text: '#977411',
    border: '#F5C535',
    solid: '#F5C535',
  },
  pink: {
    bg: '#FBC4D5',
    text: '#BA1F4F',
    border: '#E83567',
    solid: '#E83567',
  },
  teal: {
    bg: '#B3E8DC',
    text: '#1F7D65',
    border: '#2EAA8A',
    solid: '#2EAA8A',
  },
  blue: {
    bg: '#BAD9F3',
    text: '#1A5C8E',
    border: '#2878B5',
    solid: '#2878B5',
  },
};

export const PLATFORM_COLORS: Record<string, string> = {
  LinkedIn: '#2878B5',
  Jobberman: '#E83567',
  Indeed: '#6B6B6B',
  Glassdoor: '#2EAA8A',
  Direct: '#F5C535',
};

export const STAGE_CONFIG = {
  applied: { label: 'Applied', color: '#6B6B6B', bg: '#F0F0F0' },
  review: { label: 'Under Review', color: '#2878B5', bg: '#E8F2FB' },
  shortlisted: { label: 'Shortlisted', color: '#977411', bg: '#FEF3B0' },
  interviewing: { label: 'Interviewing', color: '#E83567', bg: '#FEE8EF' },
  offered: { label: 'Offered', color: '#1F7D65', bg: '#E6F7F3' },
  rejected: { label: 'Rejected', color: '#BA1F4F', bg: '#FEE8EF' },
};

export function getMatchColor(score: number): string {
  if (score >= 90) return '#2EAA8A';
  if (score >= 80) return '#F5C535';
  return '#E83567';
}
