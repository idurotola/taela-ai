import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, Briefcase, Banknote, Clock } from 'lucide-react';
import { SITE_URL, fetchPublicJob, toPlainText } from '@/lib/publicJobs';
import type { PublicJob } from '@/types';
import JobApplyPanel from './JobApplyPanel';

type Props = { params: Promise<{ slug: string }> };

// External feed jobs are third-party content: keep them out of search
// indexes (and so out of Google Jobs), and don't index closed postings.
const indexable = (job: PublicJob) => job.sourceType === 'direct' && job.open;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const job = await fetchPublicJob(slug);
  if (!job) return { title: 'Job not found — TaelaAI', robots: { index: false } };

  const title = `${job.title} at ${job.company}`;
  const description = toPlainText(job.description).replace(/\s+/g, ' ').slice(0, 160) || `${title} — apply on TaelaAI.`;
  const url = `${SITE_URL}/jobs/${job.slug}`;
  return {
    title: `${title} — TaelaAI`,
    description,
    alternates: { canonical: url },
    robots: indexable(job) ? undefined : { index: false, follow: true },
    openGraph: { title, description, url, type: 'website', siteName: 'TaelaAI' },
  };
}

const EMPLOYMENT_TYPE: Record<string, string> = { 'Full-time': 'FULL_TIME', Contract: 'CONTRACTOR' };

function jobPostingJsonLd(job: PublicJob) {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: toPlainText(job.description) || job.title,
    datePosted: job.postedAt,
    ...(job.expiresAt && { validThrough: job.expiresAt }),
    ...(EMPLOYMENT_TYPE[job.type] && { employmentType: EMPLOYMENT_TYPE[job.type] }),
    hiringOrganization: { '@type': 'Organization', name: job.company },
    ...(job.location && {
      jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: job.location } },
    }),
    directApply: true,
  };
}

export default async function JobPage({ params }: Props) {
  const { slug } = await params;
  const job = await fetchPublicJob(slug);
  if (!job) notFound();

  const description = toPlainText(job.description);
  const external = job.sourceType === 'external';
  const posted = new Date(job.postedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={{ fontFamily: 'Nunito, sans-serif', background: '#F5EFE8', minHeight: '100vh', color: '#1A1A1A' }}>
      {indexable(job) && (
        <script
          type="application/ld+json"
          // `<` escaped so a description can't close the script tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingJsonLd(job)).replace(/</g, '\\u003c') }}
        />
      )}

      <header style={{ background: '#1E4845', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <Link href="/" style={{ fontWeight: 800, fontSize: 20, color: '#fff', textDecoration: 'none', letterSpacing: '-0.5px' }}>
          Taela<span style={{ color: '#F5C535' }}>AI</span>
        </Link>
        <Link href="/signin" style={{ color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Sign in</Link>
      </header>

      <main style={{ maxWidth: 780, margin: '0 auto', padding: '32px 16px 64px' }}>
        <div style={{ background: '#fff', border: '1px solid #E4E4E4', borderRadius: 16, padding: '28px 28px 24px' }}>
          {external && (
            <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#1A5C8E', background: '#E8F2FB', borderRadius: 20, padding: '3px 10px', marginBottom: 10 }}>
              External job · {job.platform}
            </div>
          )}
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 4px' }}>{job.title}</h1>
          <div style={{ fontSize: 16, color: '#444', fontWeight: 700, marginBottom: 14 }}>{job.company}</div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: '#6B6B6B', marginBottom: 20 }}>
            {job.location && <Meta icon={<MapPin size={14} />}>{job.location}</Meta>}
            {job.type && <Meta icon={<Briefcase size={14} />}>{job.type}</Meta>}
            {job.salary && <Meta icon={<Banknote size={14} />}>{job.salary}</Meta>}
            <Meta icon={<Clock size={14} />}>Posted {posted}</Meta>
          </div>

          <JobApplyPanel
            job={{
              id: job.id, slug: job.slug, title: job.title, company: job.company,
              platform: job.platform, sourceType: job.sourceType, sourceUrl: job.sourceUrl, open: job.open,
            }}
          />
        </div>

        <div style={{ background: '#fff', border: '1px solid #E4E4E4', borderRadius: 16, padding: '24px 28px', marginTop: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 12px' }}>About this role</h2>
          {description ? (
            <div style={{ fontSize: 14, lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{description}</div>
          ) : (
            <div style={{ fontSize: 14, color: '#6B6B6B' }}>
              No description was provided{job.sourceUrl ? ' here — see the original posting for details.' : '.'}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Meta({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {icon}
      {children}
    </span>
  );
}
