import type { JobListing } from '@/types';

export function atsColor(score: number) {
  return score >= 70 ? '#2EAA8A' : score >= 45 ? '#C99A12' : '#E83567';
}

/** The ATS match of one job against the candidate's CV. */
export default function AtsMatch({ job, size = 'md' }: { job: Pick<JobListing, 'atsMatch' | 'atsMatchSource'>; size?: 'sm' | 'md' }) {
  if (job.atsMatch === undefined) return null;
  const est = job.atsMatchSource !== 'ai';
  return (
    <div
      style={{ textAlign: 'right' }}
      title={est
        ? 'Quick keyword estimate of how well your CV matches this job. Open the job and run "Check my fit" for an AI score.'
        : 'AI fit score for your current CV'}
    >
      <div style={{ fontSize: size === 'sm' ? 18 : 22, fontWeight: 800, color: atsColor(job.atsMatch), lineHeight: 1.1 }}>{job.atsMatch}%</div>
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B' }}>
        ATS match{est ? ' · est.' : ''}
      </div>
    </div>
  );
}
