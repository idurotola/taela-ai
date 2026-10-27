import type { CV, CVContent } from '@/types';

/** The editable part of a CV, in the shape PUT /api/cv/content expects. */
export function toContent(cv: CV): CVContent {
  return {
    fullName: cv.fullName,
    jobTitle: cv.jobTitle,
    email: cv.email,
    phone: cv.phone,
    location: cv.location,
    linkedin: cv.linkedin,
    summary: cv.summary,
    skills: cv.skills ?? [],
    experiences: cv.experiences.map(({ role, company, dates, bullets }) => ({ role, company, dates, bullets })),
    education: (cv.education ?? []).map(({ school, degree, dates }) => ({ school, degree, dates })),
  };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
