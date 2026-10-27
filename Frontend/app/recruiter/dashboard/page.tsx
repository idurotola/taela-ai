'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RecruiterJob } from '@/types';
import { api, getToken, clearToken, ApiError } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import { Plus, RotateCcw, Pencil, Users, Link2, ExternalLink } from 'lucide-react';

const TEAL = '#1E4845';
const GREY = '#6B6B6B';
const BORDER = '#E4E4E4';

type FormState = {
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  expiresAt: string;
};

const BLANK_FORM: FormState = { title: '', company: '', location: '', type: 'Full-time', salary: '', description: '', expiresAt: '' };

// <input type="date"> needs "YYYY-MM-DD" in LOCAL time, not UTC — building
// it from local date parts avoids the timezone roll-back that toISOString() causes.
function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function RecruiterDashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [jobs, setJobs] = useState<RecruiterJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadJobs = () => {
    setLoading(true);
    return api.recruiter.jobs()
      .then(setJobs)
      .catch(() => setError('Could not load your postings right now.'))
      .finally(() => setLoading(false));
  };

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copyLink = async (job: RecruiterJob) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/jobs/${job.slug}`);
      setCopiedId(job.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // clipboard unavailable — "View" still opens the public page
    }
  };

  useEffect(() => {
    if (!getToken()) {
      router.replace('/signin');
      return;
    }
    api.recruiter.profile()
      .then(() => loadJobs())
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          router.replace('/signin');
        } else if (err instanceof ApiError && err.status === 404) {
          router.replace('/recruiter/profile');
        }
      })
      .finally(() => setChecking(false));
  }, [router]);

  const openCreate = () => {
    setForm(BLANK_FORM);
    setFormError('');
    setEditingId(null);
    setFormMode(formMode === 'create' ? null : 'create');
  };

  const openEdit = (job: RecruiterJob) => {
    setForm({
      title: job.title, company: job.company, location: job.location,
      type: job.type || 'Full-time', salary: job.salary, description: job.description,
      expiresAt: job.expiresAt ? toDateInputValue(job.expiresAt) : '',
    });
    setFormError('');
    setEditingId(job.id);
    setFormMode('edit');
  };

  const closeForm = () => setFormMode(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.expiresAt) {
      setFormError('An expiry date is required.');
      return;
    }
    setSaving(true);
    try {
      // Anchor to end-of-day local time, not UTC midnight, so the date
      // doesn't roll back a day once displayed in other timezones.
      const expiresAt = new Date(`${form.expiresAt}T23:59:59`).toISOString();
      if (formMode === 'edit' && editingId) {
        const updated = await api.recruiter.updateJob(editingId, { ...form, expiresAt });
        setJobs(prev => prev.map(j => (j.id === editingId ? updated : j)));
      } else {
        const job = await api.recruiter.createJob({ ...form, expiresAt });
        setJobs(prev => [job, ...prev]);
      }
      setForm(BLANK_FORM);
      setFormMode(null);
      setEditingId(null);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    clearToken();
    router.replace('/signin');
  };

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Nunito, sans-serif', color: GREY }}>
        Loading…
      </div>
    );
  }

  const openCount = jobs.filter(j => j.status === 'open').length;
  const expiredCount = jobs.length - openCount;
  const totalApplicants = jobs.reduce((sum, j) => sum + j.applicantCount, 0);

  return (
    <div style={{ minHeight: '100vh', background: '#F0F0F0', fontFamily: 'Nunito, sans-serif', padding: '32px 24px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.5px', margin: 0 }}>My postings</h1>
            <p style={{ color: GREY, fontSize: 14, margin: '4px 0 0' }}>Track every job you&apos;ve posted and its status.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="outline" size="md" onClick={handleSignOut}>Sign out</Button>
            <Button variant="primary" size="md" icon={<Plus size={14} />} onClick={openCreate}>
              {formMode === 'create' ? 'Close' : 'Post a job'}
            </Button>
          </div>
        </div>

        {!loading && jobs.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            <StatTile label="Total postings" value={jobs.length} />
            <StatTile label="Open" value={openCount} accent="#2EAA8A" />
            <StatTile label="Expired" value={expiredCount} accent="#6B6B6B" />
            <StatTile label="Total applicants" value={totalApplicants} accent="#2878B5" />
          </div>
        )}

        {formMode && (
          <Card style={{ marginBottom: 24 }}>
            <h2 style={{ fontWeight: 800, fontSize: 15, margin: '0 0 14px' }}>
              {formMode === 'edit'
                ? (jobs.find(j => j.id === editingId)?.status === 'expired' ? 'Reopen posting — set a new expiry date' : 'Edit posting')
                : 'Post a new job'}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Job title">
                  <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Senior Backend Engineer" style={inputStyle} />
                </Field>
                <Field label="Company">
                  <input required value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Acme Inc." style={inputStyle} />
                </Field>
                <Field label="Location">
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Lagos, Nigeria" style={inputStyle} />
                </Field>
                <Field label="Type">
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                    <option>Full-time</option>
                    <option>Contract</option>
                    <option>Remote</option>
                    <option>Hybrid</option>
                  </select>
                </Field>
                <Field label="Salary (optional)">
                  <input value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} placeholder="₦400,000 – ₦600,000" style={inputStyle} />
                </Field>
                <Field label="Expires on">
                  <input required type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} style={inputStyle} />
                </Field>
              </div>
              <Field label="Description (optional)">
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} style={{ ...inputStyle, resize: 'vertical' as const }} />
              </Field>

              {formError && (
                <div style={{ fontSize: 13, color: '#BA1F4F', background: '#FEE8EF', borderRadius: 8, padding: '8px 12px' }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving…' : formMode === 'edit' ? 'Save changes' : 'Publish job'}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm} disabled={saving}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}

        {loading && <div style={{ color: GREY, fontSize: 13 }}>Loading your postings…</div>}
        {error && <div style={{ color: '#BA1F4F', fontSize: 13 }}>{error}</div>}

        {!loading && !error && jobs.length === 0 && (
          <Card style={{ textAlign: 'center', padding: '48px 24px', color: GREY }}>
            You haven&apos;t posted any jobs yet.
          </Card>
        )}

        {!loading && jobs.length > 0 && (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: `1px solid ${BORDER}`, color: GREY, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Company</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Expires</th>
                  <th style={thStyle}>Applicants</th>
                  <th style={thStyle} />
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={tdStyle}><span style={{ fontWeight: 700 }}>{job.title}</span></td>
                    <td style={tdStyle}>{job.company}</td>
                    <td style={tdStyle}>
                      <Tag variant={job.status === 'open' ? 'teal' : 'grey'}>{job.status === 'open' ? 'Open' : 'Expired'}</Tag>
                    </td>
                    <td style={tdStyle}>{job.expiresAt ? new Date(job.expiresAt).toLocaleDateString() : '—'}</td>
                    <td style={tdStyle}>
                      <Link href={`/recruiter/jobs/${job.id}/applicants`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: TEAL, fontWeight: 700, textDecoration: 'none' }}>
                        <Users size={12} /> {job.applicantCount}
                      </Link>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <Button size="sm" variant="outline" icon={<Link2 size={12} />} onClick={() => copyLink(job)}>
                          {copiedId === job.id ? 'Copied!' : 'Copy link'}
                        </Button>
                        <a href={`/jobs/${job.slug}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                          <Button size="sm" variant="outline" icon={<ExternalLink size={12} />}>View</Button>
                        </a>
                        <Button size="sm" variant="outline" icon={<Pencil size={12} />} onClick={() => openEdit(job)}>Edit</Button>
                        {job.status === 'expired' && (
                          <Button
                            size="sm" variant="outline" icon={<RotateCcw size={12} />}
                            onClick={() => openEdit(job)}
                          >
                            Reopen
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Card style={{ padding: '16px 18px' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: accent || '#1A1A1A' }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: GREY, marginTop: 2 }}>{label}</div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontWeight: 700, fontSize: 12.5, display: 'block', marginBottom: 6, color: TEAL }}>{label}</label>
      {children}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px 16px', fontWeight: 700 };
const tdStyle: React.CSSProperties = { padding: '12px 16px', color: '#1A1A1A' };

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: `1.5px solid ${BORDER}`, fontSize: 14,
  fontFamily: 'Nunito, sans-serif', outline: 'none',
  color: '#1A1A1A', background: '#fff',
};
