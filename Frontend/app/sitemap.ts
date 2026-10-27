import type { MetadataRoute } from 'next';
import { SITE_URL, fetchPublicJobRefs } from '@/lib/publicJobs';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const jobs = await fetchPublicJobRefs();
  return [
    { url: SITE_URL, changeFrequency: 'weekly' },
    ...jobs.map((j) => ({
      url: `${SITE_URL}/jobs/${j.slug}`,
      lastModified: new Date(j.updatedAt),
      changeFrequency: 'daily' as const,
    })),
  ];
}
