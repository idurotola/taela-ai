import type { PublicJob } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

/** Server-side fetch of a public job; null when it doesn't exist. */
export async function fetchPublicJob(slug: string): Promise<PublicJob | null> {
  const res = await fetch(`${API_BASE}/api/public/jobs/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`public job fetch failed: ${res.status}`);
  return (await res.json()) as PublicJob;
}

export async function fetchPublicJobRefs(): Promise<{ slug: string; updatedAt: string }[]> {
  try {
    const res = await fetch(`${API_BASE}/api/public/jobs`, { next: { revalidate: 300 } });
    return res.ok ? await res.json() : [];
  } catch {
    return [];
  }
}

/**
 * Feed descriptions can contain HTML. We render descriptions as plain text
 * (never as markup), so strip tags and decode the common entities.
 */
export function toPlainText(input: string): string {
  return input
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
