'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import Button from '@/components/ui/Button';
import ExternalApplyDialog from '@/components/features/ExternalApplyDialog';
import { ApiError, api, clearToken, getToken } from '@/lib/api';
import type { User } from '@/types';

interface Props {
  job: {
    id: string;
    slug: string;
    title: string;
    company: string;
    platform: string;
    sourceType: 'direct' | 'external';
    sourceUrl?: string;
    open: boolean;
  };
}

type Session = { state: 'loading' } | { state: 'guest' } | { state: 'user'; user: User };

export default function JobApplyPanel({ job }: Props) {
  const [session, setSession] = useState<Session>({ state: 'loading' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Both outcomes resolve asynchronously, so state is only set from callbacks.
    const lookup = getToken() ? api.me() : Promise.reject(new ApiError(401, 'signed out'));
    lookup
      .then((user) => setSession({ state: 'user', user }))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) clearToken();
        setSession({ state: 'guest' });
      });
  }, []);

  if (!job.open) {
    return (
      <div style={{ background: '#F0F0F0', borderRadius: 10, padding: '14px 16px', fontSize: 14, color: '#555' }}>
        <strong>This job is no longer accepting applications.</strong>{' '}
        <Link href="/signup" style={{ color: '#2878B5' }}>Create an account</Link> to find similar roles.
      </div>
    );
  }

  const next = encodeURIComponent(`/jobs/${job.slug}`);
  const external = job.sourceType === 'external';

  const applyDirect = async () => {
    setApplying(true);
    setError('');
    try {
      await api.applyToJob(job.id);
      setApplied(true);
    } catch {
      setError('Could not submit your application right now. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  const originalLink = external && job.sourceUrl && (
    <a
      href={job.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: '#2878B5', textDecoration: 'none' }}
    >
      View original posting on {job.platform} <ExternalLink size={12} />
    </a>
  );

  if (session.state === 'loading') {
    return <div style={{ height: 44 }} aria-hidden />;
  }

  if (session.state === 'user' && session.user.role === 'recruiter') {
    return (
      <div style={{ fontSize: 13, color: '#6B6B6B' }}>
        You&rsquo;re signed in as a recruiter, so you can&rsquo;t apply to jobs.{' '}
        <Link href="/recruiter/dashboard" style={{ color: '#2878B5' }}>Back to your dashboard</Link>
      </div>
    );
  }

  if (session.state === 'guest') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href={`/signin?next=${next}`} style={primaryLink}>
            {external ? 'Sign in for a ready-to-send CV' : 'Sign in to apply'}
          </Link>
          <Link href={`/signup?next=${next}`} style={outlineLink}>Create a free account</Link>
        </div>
        {originalLink}
      </div>
    );
  }

  // Signed-in job seeker.
  if (external) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <Button variant="primary" onClick={() => setDialogOpen(true)}>Get my CV &amp; apply</Button>
        </div>
        {originalLink}
        {dialogOpen && (
          <ExternalApplyDialog
            job={{ id: job.id, title: job.title, company: job.company, platform: job.platform, sourceUrl: job.sourceUrl }}
            onClose={() => setDialogOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {applied ? (
        <div style={{ background: '#B3E8DC', color: '#1F7D65', borderRadius: 10, padding: '12px 16px', fontSize: 14, fontWeight: 700 }}>
          ✓ Application sent. Track it in your{' '}
          <Link href="/dashboard" style={{ color: '#1F7D65' }}>dashboard</Link>.
        </div>
      ) : (
        <div>
          <Button variant="primary" disabled={applying} onClick={applyDirect}>
            {applying ? 'Applying…' : 'Apply with my Taela CV'}
          </Button>
        </div>
      )}
      {error && <div style={{ fontSize: 13, color: '#BA1F4F' }}>{error}</div>}
    </div>
  );
}

const primaryLink: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 8, background: '#F5C535', color: '#1A1A1A',
  fontWeight: 800, fontSize: 14, textDecoration: 'none',
};
const outlineLink: React.CSSProperties = {
  padding: '10px 18px', borderRadius: 8, border: '1.5px solid #E4E4E4', color: '#1A1A1A',
  fontWeight: 700, fontSize: 14, textDecoration: 'none', background: '#fff',
};
