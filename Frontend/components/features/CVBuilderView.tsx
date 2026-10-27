'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SectionHeader from '@/components/ui/SectionHeader';
import { api, ApiError } from '@/lib/api';
import { CV } from '@/types';
import { Check, AlertTriangle, X, Wand2, Download, Plus, Copy, Trash2, Pencil } from 'lucide-react';
import { buildCvText, downloadCvPdf, downloadCvDocx } from '@/lib/cvExport';
import { toContent } from '@/lib/cvContent';
import CVUploadCard from '@/components/features/CVUploadCard';
import CVExtrasCard from '@/components/features/CVExtrasCard';

const STATUS_ICON = {
  ok:   <Check size={14} color="#2EAA8A" />,
  warn: <AlertTriangle size={14} color="#F5C535" />,
  bad:  <X size={14} color="#E83567" />,
};

const INPUT_STYLE = {
  width: '100%',
  padding: '9px 12px',
  border: '1.5px solid #E4E4E4',
  borderRadius: 6,
  fontFamily: 'Nunito, sans-serif',
  fontSize: 13,
  color: '#1A1A1A',
  outline: 'none',
  background: '#fff',
};

type FieldKey = 'fullName' | 'jobTitle' | 'email' | 'location' | 'phone' | 'linkedin';

const PERSONAL_FIELDS: { key: FieldKey; label: string; type: string }[] = [
  { key: 'fullName', label: 'Full Name', type: 'text' },
  { key: 'jobTitle', label: 'Job Title', type: 'text' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'linkedin', label: 'LinkedIn', type: 'text' },
];

export default function CVBuilderView() {
  const [cv, setCv] = useState<CV | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [addingExp, setAddingExp] = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);
  const [expForm, setExpForm] = useState({ role: '', company: '', dates: '', bullets: '' });
  const [expError, setExpError] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ role: '', company: '', dates: '', bullets: '' });
  const [savingExp, setSavingExp] = useState(false);

  useEffect(() => {
    api.cv()
      .then(setCv)
      .catch(() => setError('Could not load your CV right now.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 20, color: '#6B6B6B', fontSize: 13 }}>Loading your CV…</div>;
  if (error || !cv) return <div style={{ padding: 20, color: '#BA1F4F', fontSize: 13 }}>{error || 'Something went wrong.'}</div>;

  const setField = <K extends keyof CV>(key: K, value: CV[K]) => setCv(prev => prev ? { ...prev, [key]: value } : prev);

  const persist = async (patch: Partial<CV>) => {
    setSaving(true);
    try {
      const updated = await api.updateCV(patch);
      setCv(prev => prev ? { ...prev, ...updated } : updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = () => persist({
    fullName: cv.fullName, jobTitle: cv.jobTitle, email: cv.email, location: cv.location,
    phone: cv.phone, linkedin: cv.linkedin, summary: cv.summary,
  });

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      // Persist the summary so the check scores what's on screen.
      await api.updateCV({ summary: cv.summary });
      const analyzed = await api.analyzeCV();
      setCv(analyzed);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to analyze CV.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpError('');
    if (!expForm.role.trim() || !expForm.company.trim()) {
      setExpError('Role and company are required.');
      return;
    }
    const bullets = expForm.bullets.split('\n').map(b => b.trim()).filter(Boolean);

    setAddingExp(true);
    try {
      const exp = await api.addCVExperience({ role: expForm.role, company: expForm.company, dates: expForm.dates, bullets });
      setCv(prev => prev ? { ...prev, experiences: [...prev.experiences, exp] } : prev);
      setExpForm({ role: '', company: '', dates: '', bullets: '' });
      setShowExpForm(false);
    } catch (err) {
      setExpError(err instanceof ApiError ? err.message : 'Failed to add experience.');
    } finally {
      setAddingExp(false);
    }
  };

  const handleDownloadPdf = async () => {
    setExportingPdf(true);
    try {
      await downloadCvPdf(cv);
    } catch {
      setError('Failed to generate PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDownloadDocx = async () => {
    setExportingDocx(true);
    try {
      await downloadCvDocx(cv);
    } catch {
      setError('Failed to generate Word document.');
    } finally {
      setExportingDocx(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(buildCvText(cv));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy to clipboard.');
    }
  };

  const startEditExperience = (exp: CV['experiences'][number]) => {
    setEditingExpId(exp.id);
    setEditForm({ role: exp.role, company: exp.company, dates: exp.dates, bullets: exp.bullets.join('\n') });
  };

  const saveEditedExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.role.trim() && !editForm.company.trim()) {
      setExpError('Role or company is required.');
      return;
    }
    setSavingExp(true);
    setExpError('');
    try {
      const content = toContent(cv);
      content.experiences = cv.experiences.map((x) =>
        x.id === editingExpId
          ? { role: editForm.role, company: editForm.company, dates: editForm.dates, bullets: editForm.bullets.split('\n').map(b => b.trim()).filter(Boolean) }
          : { role: x.role, company: x.company, dates: x.dates, bullets: x.bullets },
      );
      setCv(await api.saveCVContent(content));
      setEditingExpId(null);
    } catch (err) {
      setExpError(err instanceof ApiError ? err.message : 'Failed to save experience.');
    } finally {
      setSavingExp(false);
    }
  };

  const handleDeleteExperience = async (id: string) => {
    if (!window.confirm('Remove this experience?')) return;
    setCv(prev => prev ? { ...prev, experiences: prev.experiences.filter(e => e.id !== id) } : prev);
    try {
      await api.deleteCVExperience(id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove experience.');
    }
  };

  const score = cv.score;
  const scoreColor = score >= 90 ? '#2EAA8A' : score >= 75 ? '#F5C535' : '#E83567';

  return (
    <div>
      <div className="cv-grid">
        {/* Left — Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <CVUploadCard cv={cv} onCvChange={setCv} />

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <SectionHeader title="Personal Information" style={{ marginBottom: 0 }} />
              <Button size="sm" variant="outline" onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
            <div className="cv-fields">
              {PERSONAL_FIELDS.map((f) => (
                <div key={f.key}>
                  <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', display: 'block', marginBottom: 5 }}>
                    {f.label}
                  </label>
                  <input
                    value={cv[f.key] as string}
                    onChange={(e) => setField(f.key, e.target.value)}
                    type={f.type}
                    style={INPUT_STYLE}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', display: 'block', marginBottom: 5 }}>
                Professional Summary
              </label>
              <textarea
                value={cv.summary}
                onChange={(e) => setField('summary', e.target.value)}
                style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 80 }}
              />
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <SectionHeader title="Work Experience" style={{ marginBottom: 0 }} />
              <Button
                size="sm" variant="outline" icon={<Plus size={12} />}
                onClick={() => { setShowExpForm(v => !v); setExpError(''); }}
              >
                {showExpForm ? 'Cancel' : 'Add'}
              </Button>
            </div>

            {showExpForm && (
              <form onSubmit={handleAddExperience} style={{ background: '#F6F6F6', borderRadius: 10, padding: 14, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="cv-fields">
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', display: 'block', marginBottom: 5 }}>Role</label>
                    <input value={expForm.role} onChange={e => setExpForm(f => ({ ...f, role: e.target.value }))} placeholder="Senior Product Manager" style={INPUT_STYLE} />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', display: 'block', marginBottom: 5 }}>Company</label>
                    <input value={expForm.company} onChange={e => setExpForm(f => ({ ...f, company: e.target.value }))} placeholder="Acme Inc." style={INPUT_STYLE} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', display: 'block', marginBottom: 5 }}>Dates</label>
                  <input value={expForm.dates} onChange={e => setExpForm(f => ({ ...f, dates: e.target.value }))} placeholder="Jan 2022 – Present" style={INPUT_STYLE} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', display: 'block', marginBottom: 5 }}>Achievements (one per line)</label>
                  <textarea
                    value={expForm.bullets}
                    onChange={e => setExpForm(f => ({ ...f, bullets: e.target.value }))}
                    rows={3}
                    placeholder={'Shipped feature X\nLed a team of 4'}
                    style={{ ...INPUT_STYLE, resize: 'vertical' }}
                  />
                </div>
                {expError && <div style={{ fontSize: 12, color: '#BA1F4F' }}>{expError}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button type="submit" size="sm" variant="primary" disabled={addingExp}>
                    {addingExp ? 'Adding…' : 'Save experience'}
                  </Button>
                </div>
              </form>
            )}

            {cv.experiences.length === 0 && (
              <div style={{ fontSize: 12, color: '#6B6B6B' }}>No experience added yet — click &quot;Add&quot; to build your work history.</div>
            )}
            {cv.experiences.map((exp) => editingExpId === exp.id ? (
              <form key={exp.id} onSubmit={saveEditedExperience} style={{ background: '#F6F6F6', borderRadius: 10, padding: 14, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="cv-fields">
                  <input value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} placeholder="Role" aria-label="Role" style={INPUT_STYLE} />
                  <input value={editForm.company} onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))} placeholder="Company" aria-label="Company" style={INPUT_STYLE} />
                </div>
                <input value={editForm.dates} onChange={e => setEditForm(f => ({ ...f, dates: e.target.value }))} placeholder="Jan 2022 – Present" aria-label="Dates" style={INPUT_STYLE} />
                <textarea value={editForm.bullets} onChange={e => setEditForm(f => ({ ...f, bullets: e.target.value }))} rows={4} placeholder="One achievement per line" aria-label="Achievements" style={{ ...INPUT_STYLE, resize: 'vertical' }} />
                {expError && <div style={{ fontSize: 12, color: '#BA1F4F' }}>{expError}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button type="submit" size="sm" variant="primary" disabled={savingExp}>{savingExp ? 'Saving…' : 'Save'}</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setEditingExpId(null); setExpError(''); }}>Cancel</Button>
                </div>
              </form>
            ) : (
              <div key={exp.id} style={{ borderBottom: '1px solid #F0F0F0', paddingBottom: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>{exp.role}</div>
                    <div style={{ fontSize: 12, color: '#6B6B6B' }}>{exp.company}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 11, color: '#6B6B6B', textAlign: 'right' }}>{exp.dates}</div>
                    <button
                      onClick={() => startEditExperience(exp)}
                      aria-label="Edit experience"
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#aaa', padding: 2 }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteExperience(exp.id)}
                      aria-label="Remove experience"
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#aaa', padding: 2 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <ul style={{ paddingLeft: 14, margin: 0 }}>
                  {exp.bullets.map((b, i) => (
                    <li key={i} style={{ fontSize: 12, color: '#1A1A1A', marginBottom: 2 }}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </Card>

          <CVExtrasCard key={cv.id + (cv.education?.length ?? 0) + (cv.skills?.length ?? 0)} cv={cv} onCvChange={setCv} />
        </div>

        {/* Right — Score + Keywords */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card>
            <SectionHeader title="ATS Score" />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px 20px',
                background: '#F6F6F6',
                borderRadius: 10,
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 56, fontWeight: 800, color: scoreColor, lineHeight: 1, transition: 'color 0.3s' }}>
                {score}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', marginTop: 6 }}>
                ATS Compatibility Score
              </div>
              <div style={{ width: '100%', maxWidth: 200, height: 6, background: '#E4E4E4', borderRadius: 20, marginTop: 12, overflow: 'hidden' }}>
                <div style={{ width: `${score}%`, height: '100%', background: scoreColor, borderRadius: 20, transition: 'width 0.5s ease' }} />
              </div>
            </div>

            <Button variant="outline" fullWidth icon={<Wand2 size={13} />} onClick={handleAnalyze} disabled={analyzing} style={{ marginBottom: 12 }}>
              {analyzing ? 'Checking…' : 'Re-check my CV'}
            </Button>

            {cv.atsChecks.length === 0 ? (
              <div style={{ fontSize: 12, color: '#6B6B6B' }}>Run the check to see how ATS-friendly your CV is. To tailor it for a specific job, open that job in Job Search.</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {cv.atsChecks.map((check) => (
                  <li
                    key={check.id || check.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '7px 0',
                      borderBottom: '1px solid #F0F0F0',
                      fontSize: 13,
                    }}
                  >
                    {STATUS_ICON[check.status]}
                    {check.label}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <SectionHeader title="Export & Download" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button variant="teal" fullWidth icon={<Download size={14} />} onClick={handleDownloadPdf} disabled={exportingPdf}>
                {exportingPdf ? 'Generating…' : 'Download ATS-Optimised PDF'}
              </Button>
              <Button variant="outline" fullWidth icon={<Download size={14} />} onClick={handleDownloadDocx} disabled={exportingDocx}>
                {exportingDocx ? 'Generating…' : 'Download Word (.docx)'}
              </Button>
              <Button variant="outline" fullWidth icon={<Copy size={14} />} onClick={handleCopyToClipboard}>
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </Button>
            </div>
            <p style={{ fontSize: 11, color: '#6B6B6B', marginTop: 10, lineHeight: 1.5 }}>
              Your CV is automatically tailored for each application. Each download creates a unique version.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
