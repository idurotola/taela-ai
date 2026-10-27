'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Clock, ExternalLink, Link2, MapPin, Banknote, Briefcase, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { api, ApiError } from '@/lib/api';
import { GREY, addDays, publicJobUrl, toDateInputValue } from '@/lib/recruiter';
import type { RecruiterJob } from '@/types';

const TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote', 'Hybrid'];

const TEMPLATE = `About the role
Describe what this person will do and why the role exists.

Responsibilities
- 
- 

Requirements
- 
- 

Nice to have
- `;

interface Props {
  mode: 'create' | 'edit';
  job?: RecruiterJob;
  defaultCompany: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

const field: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1.5px solid #E4E4E4', borderRadius: 8,
  fontFamily: 'Nunito, sans-serif', fontSize: 14, color: '#1A1A1A', background: '#fff', outline: 'none',
};
const label: React.CSSProperties = { fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: GREY, display: 'block', marginBottom: 5 };

/**
 * Create or edit a job in a panel that slides over the dashboard, with a live
 * preview of how the public job page will read.
 */
export default function JobSlideOver({ mode, job, defaultCompany, onClose, onSaved }: Props) {
  const expired = job?.status === 'expired';
  const [form, setForm] = useState({
    title: job?.title ?? '',
    company: job?.company ?? defaultCompany,
    location: job?.location ?? '',
    type: job?.type || 'Full-time',
    salary: job?.salary ?? '',
    description: job?.description ?? '',
    expiresAt: job && !expired && job.expiresAt ? toDateInputValue(new Date(job.expiresAt)) : addDays(30),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [published, setPublished] = useState<RecruiterJob | null>(null);
  const [copied, setCopied] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || !form.company.trim()) {
      setError('A job title and company are required.');
      return;
    }
    if (!form.expiresAt) {
      setError('Choose when this posting closes.');
      return;
    }
    setSaving(true);
    try {
      // End of the chosen day in local time, so the date doesn't roll back in other timezones.
      const expiresAt = new Date(`${form.expiresAt}T23:59:59`).toISOString();
      const saved = mode === 'edit' && job
        ? await api.recruiter.updateJob(job.id, { ...form, expiresAt })
        : await api.recruiter.createJob({ ...form, expiresAt });
      await onSaved();
      if (mode === 'edit') onClose();
      else setPublished(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    if (!published) return;
    try {
      await navigator.clipboard.writeText(publicJobUrl(published.slug));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — the link is shown above to copy by hand
    }
  };

  const reset = () => {
    setPublished(null);
    setForm({ title: '', company: defaultCompany, location: '', type: 'Full-time', salary: '', description: '', expiresAt: addDays(30) });
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={mode === 'edit' ? 'Edit job' : 'Post a job'} onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
      <aside onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', width: '100%', maxWidth: 1040, height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'Nunito, sans-serif', boxShadow: '-8px 0 32px rgba(0,0,0,0.15)' }}>
        <header style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #E4E4E4' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{published ? 'Job published' : mode === 'edit' ? (expired ? 'Reopen job' : 'Edit job') : 'Post a job'}</div>
            {!published && <div style={{ fontSize: 12, color: GREY }}>{expired ? 'Pick a new closing date to reopen it.' : 'Candidates will see exactly what’s previewed on the right.'}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#888' }}><X size={20} /></button>
        </header>

        {published ? (
          <div style={{ padding: 32, maxWidth: 560 }}>
            <div style={{ display: 'inline-flex', width: 44, height: 44, borderRadius: '50%', background: '#E6F7F3', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}><Check size={22} color="#1F7D65" /></div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 6px' }}>{published.title} is live</h2>
            <p style={{ fontSize: 14, color: GREY, lineHeight: 1.6, margin: '0 0 16px' }}>Share this link anywhere. Candidates can apply with or without an account, and their applications will appear in your Applicants pipeline.</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#F6F6F6', border: '1px solid #E4E4E4', borderRadius: 8, padding: '10px 12px', fontSize: 13, wordBreak: 'break-all', marginBottom: 14 }}>
              {publicJobUrl(published.slug)}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="primary" icon={<Link2 size={13} />} onClick={copy}>{copied ? 'Copied!' : 'Copy link'}</Button>
              <a href={`/jobs/${published.slug}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}><Button variant="outline" icon={<ExternalLink size={13} />}>View public page</Button></a>
              <Button variant="outline" onClick={reset}>Post another</Button>
              <Button variant="ghost" onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="rec-slide-grid" style={{ flex: 1, overflow: 'hidden' }}>
            <form onSubmit={submit} style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={label} htmlFor="job-title">Job title</label>
                <input id="job-title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Senior Backend Engineer" style={field} autoFocus />
              </div>
              <div className="cv-fields">
                <div>
                  <label style={label} htmlFor="job-company">Company</label>
                  <input id="job-company" value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="Acme Inc." style={field} />
                </div>
                <div>
                  <label style={label} htmlFor="job-location">Location</label>
                  <input id="job-location" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Lagos, Nigeria" style={field} />
                </div>
              </div>
              <div className="cv-fields">
                <div>
                  <label style={label} htmlFor="job-type">Type</label>
                  <select id="job-type" value={form.type} onChange={(e) => set('type', e.target.value)} style={field}>
                    {TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label} htmlFor="job-salary">Salary (optional)</label>
                  <input id="job-salary" value={form.salary} onChange={(e) => set('salary', e.target.value)} placeholder="₦400k – ₦600k / month" style={field} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={label} htmlFor="job-desc">Description</label>
                  {!form.description.trim() && (
                    <button type="button" onClick={() => set('description', TEMPLATE)} style={{ border: 'none', background: 'transparent', color: '#2878B5', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginBottom: 5, fontFamily: 'Nunito, sans-serif' }}>
                      Use a template
                    </button>
                  )}
                </div>
                <textarea id="job-desc" value={form.description} onChange={(e) => set('description', e.target.value)} rows={12} placeholder="What will they do? What do they need to succeed?" style={{ ...field, resize: 'vertical', lineHeight: 1.55 }} />
              </div>
              <div>
                <label style={label} htmlFor="job-expiry">Applications close</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <input id="job-expiry" type="date" value={form.expiresAt} min={toDateInputValue(new Date())} onChange={(e) => set('expiresAt', e.target.value)} style={{ ...field, width: 'auto' }} />
                  {[14, 30, 60].map((d) => (
                    <button key={d} type="button" onClick={() => set('expiresAt', addDays(d))}
                      style={{ padding: '6px 12px', borderRadius: 20, border: '1.5px solid #E4E4E4', background: form.expiresAt === addDays(d) ? '#E6F7F3' : '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}>
                      {d} days
                    </button>
                  ))}
                </div>
              </div>

              {error && <div style={{ fontSize: 13, color: '#BA1F4F', background: '#FEE8EF', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : mode === 'edit' ? (expired ? 'Reopen job' : 'Save changes') : 'Publish job'}</Button>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              </div>
            </form>

            <div className="rec-slide-preview" style={{ background: '#F5EFE8', overflowY: 'auto', padding: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: GREY, marginBottom: 10 }}>Live preview</div>
              <div style={{ background: '#fff', border: '1px solid #E4E4E4', borderRadius: 14, padding: 22 }}>
                <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 2px', letterSpacing: '-0.4px' }}>{form.title || 'Job title'}</h3>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#444', marginBottom: 10 }}>{form.company || 'Company'}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12.5, color: GREY, marginBottom: 14 }}>
                  {form.location && <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><MapPin size={13} />{form.location}</span>}
                  <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><Briefcase size={13} />{form.type}</span>
                  {form.salary && <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><Banknote size={13} />{form.salary}</span>}
                  {form.expiresAt && <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><Clock size={13} />Closes {new Date(`${form.expiresAt}T12:00:00`).toLocaleDateString()}</span>}
                </div>
                <div style={{ display: 'inline-block', padding: '9px 16px', borderRadius: 8, background: '#F5C535', fontWeight: 800, fontSize: 13, marginBottom: 16 }}>Apply now</div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: GREY, marginBottom: 6 }}>About this role</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {form.description.trim() || <span style={{ color: '#aaa' }}>Your description appears here.</span>}
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}
