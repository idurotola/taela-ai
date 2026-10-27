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
  const [cover, setCover] = useState('');

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
      await api.applyToJob(job.id, cover);
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
        {!external && <GuestApplyForm slug={job.slug} />}
        <div style={{ fontSize: 12, color: '#6B6B6B', fontWeight: 700 }}>{external ? '' : 'Or, with an account:'}</div>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
          <textarea
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            maxLength={5000}
            rows={3}
            placeholder="Cover letter (optional)"
            aria-label="Cover letter"
            style={{ ...fieldStyle, resize: 'vertical' }}
          />
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

const fieldStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1.5px solid #E4E4E4', borderRadius: 8,
  fontFamily: 'Nunito, sans-serif', fontSize: 14, color: '#1A1A1A', background: '#fff', outline: 'none',
};

/** Apply without an account: held until the applicant confirms their email. */
function GuestApplyForm({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', coverLetter: '' });
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  if (done) {
    return (
      <div style={{ background: '#E6F7F3', color: '#1F7D65', borderRadius: 10, padding: '14px 16px', fontSize: 14, lineHeight: 1.5 }}>
        <strong>Almost done.</strong> {done}
      </div>
    );
  }
  if (!open) {
    return (
      <div>
        <Button variant="primary" onClick={() => setOpen(true)}>Apply now — no account needed</Button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!file) {
      setError('Please attach your CV (PDF or DOCX).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Your CV is over 5 MB. Please attach a smaller file.');
      return;
    }
    const body = new FormData();
    Object.entries(form).forEach(([k, v]) => body.append(k, v));
    body.append('file', file);
    setSending(true);
    try {
      const res = await api.guestApply(slug, body);
      setDone(res.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#F6F6F6', borderRadius: 12, padding: 16 }}>
      <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Full name" aria-label="Full name" autoComplete="name" style={fieldStyle} />
      <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email" aria-label="Email" autoComplete="email" style={fieldStyle} />
      <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Phone (optional)" aria-label="Phone" autoComplete="tel" style={fieldStyle} />
      <textarea value={form.coverLetter} onChange={(e) => setForm((f) => ({ ...f, coverLetter: e.target.value }))} maxLength={5000} rows={3} placeholder="Cover letter (optional)" aria-label="Cover letter" style={{ ...fieldStyle, resize: 'vertical' }} />
      <label style={{ fontSize: 13, fontWeight: 700 }}>
        CV (PDF or DOCX, up to 5 MB)
        <input
          required
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          style={{ display: 'block', marginTop: 6, fontSize: 13 }}
        />
      </label>
      {/* Honeypot: hidden from people, tempting to bots. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden onChange={() => {}} style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }} />
      {error && <div style={{ fontSize: 13, color: '#BA1F4F' }}>{error}</div>}
      <div style={{ fontSize: 11, color: '#6B6B6B', lineHeight: 1.5 }}>
        We&rsquo;ll email you a link to confirm your address before your application is sent to the employer.
        Your CV and details are shared with this employer only.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button type="submit" variant="primary" disabled={sending}>{sending ? 'Sending…' : 'Send application'}</Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
