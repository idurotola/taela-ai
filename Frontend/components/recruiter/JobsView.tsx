'use client';

import { useState } from 'react';
import { ExternalLink, Link2, Pencil, Plus, RotateCcw, Users } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { GREY, daysUntil, publicJobUrl } from '@/lib/recruiter';
import type { RecruiterJob } from '@/types';

interface Props {
  jobs: RecruiterJob[];
  canPost: boolean;
  onPost: () => void;
  onEdit: (job: RecruiterJob) => void;
  onApplicants: (jobId: string) => void;
}

export default function JobsView({ jobs, canPost, onPost, onEdit, onApplicants }: Props) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'open' | 'expired'>('all');
  const [copied, setCopied] = useState<string | null>(null);

  const shown = jobs.filter((j) =>
    (status === 'all' || j.status === status) &&
    (!query.trim() || `${j.title} ${j.location} ${j.company}`.toLowerCase().includes(query.trim().toLowerCase())));

  const copy = async (job: RecruiterJob) => {
    try {
      await navigator.clipboard.writeText(publicJobUrl(job.slug));
      setCopied(job.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard unavailable — "View" still opens the public page
    }
  };

  if (jobs.length === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: '56px 24px', color: GREY }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#1A1A1A', marginBottom: 6 }}>No jobs yet</div>
        <p style={{ fontSize: 13, margin: '0 0 16px' }}>Postings you create appear here with their status and applicant counts.</p>
        <Button variant="primary" icon={<Plus size={14} />} disabled={!canPost} onClick={onPost}>Post a job</Button>
      </Card>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search jobs" aria-label="Search jobs"
          style={{ padding: '8px 12px', border: '1.5px solid #E4E4E4', borderRadius: 8, fontFamily: 'Nunito, sans-serif', fontSize: 13, minWidth: 220, background: '#fff' }} />
        {(['all', 'open', 'expired'] as const).map((s) => (
          <button key={s} onClick={() => setStatus(s)}
            style={{ padding: '6px 14px', borderRadius: 20, border: status === s ? '1.5px solid #2EAA8A' : '1.5px solid #E4E4E4', background: status === s ? '#E6F7F3' : '#fff', color: status === s ? '#1F7D65' : GREY, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}>
            {s === 'all' ? 'All' : s === 'open' ? 'Open' : 'Expired'}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: GREY }}>{shown.length} of {jobs.length}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {shown.length === 0 && <div style={{ fontSize: 13, color: GREY, padding: '16px 0' }}>No jobs match.</div>}
        {shown.map((job) => {
          const open = job.status === 'open';
          const left = job.expiresAt ? daysUntil(job.expiresAt) : null;
          return (
            <div key={job.id} style={{ background: '#fff', border: '1px solid #E4E4E4', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>{job.title}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 9px', borderRadius: 20, background: open ? '#E6F7F3' : '#EEE', color: open ? '#1F7D65' : '#777' }}>{open ? 'Open' : 'Expired'}</span>
                </div>
                <div style={{ fontSize: 12.5, color: GREY, marginTop: 3 }}>
                  {[job.company, job.location, job.type, job.salary].filter(Boolean).join(' · ')}
                </div>
                <div style={{ fontSize: 11.5, color: '#999', marginTop: 3 }}>
                  {left === null ? '' : open ? `Closes in ${left} day${left === 1 ? '' : 's'} (${new Date(job.expiresAt).toLocaleDateString()})` : `Expired ${new Date(job.expiresAt).toLocaleDateString()}`}
                </div>
              </div>

              <button onClick={() => onApplicants(job.id)} aria-label={`${job.applicantCount} applicants`}
                style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #E4E4E4', borderRadius: 10, padding: '8px 14px', background: '#fff', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 14 }}>
                <Users size={14} color="#2878B5" /> {job.applicantCount}
                <span style={{ fontSize: 11, color: GREY, fontWeight: 600 }}>applicants</span>
              </button>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Button size="sm" variant="outline" icon={<Link2 size={12} />} onClick={() => copy(job)}>{copied === job.id ? 'Copied!' : 'Copy link'}</Button>
                <a href={`/jobs/${job.slug}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <Button size="sm" variant="outline" icon={<ExternalLink size={12} />}>View</Button>
                </a>
                <Button size="sm" variant="outline" icon={open ? <Pencil size={12} /> : <RotateCcw size={12} />} onClick={() => onEdit(job)}>{open ? 'Edit' : 'Reopen'}</Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
