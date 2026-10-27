import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/publicJobs';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: ['/', '/jobs/'], disallow: ['/dashboard', '/recruiter', '/reset-password'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
