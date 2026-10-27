'use client';

import { useEffect, useState } from 'react';
import { PLATFORM_COLORS } from '@/lib/utils';
import { api } from '@/lib/api';
import { Application } from '@/types';
import Button from '@/components/ui/Button';
import { Plus, X, ExternalLink } from 'lucide-react';
import { downloadCvPdf } from '@/lib/cvExport';

type Stage = Application['stage'];

const STAGES: { id: Stage; label: string; color: string; bg: string }[] = [
  { id: 'prepared',     label: 'Prepared',      color: '#2878B5', bg: '#E8F2FB' },
  { id: 'applied',      label: 'Applied',       color: '#6B6B6B', bg: '#F0F0F0' },
  { id: 'review',       label: 'Under Review',  color: '#2878B5', bg: '#E8F2FB' },
  { id: 'shortlisted',  label: 'Shortlisted',   color: '#977411', bg: '#FEF3B0' },
  { id: 'interviewing', label: 'Interviewing',  color: '#E83567', bg: '#FEE8EF' },
  { id: 'offered',      label: 'Offered',       color: '#1F7D65', bg: '#E6F7F3' },
];

const ADD_BLANK = { title: '', company: '', location: '', platform: '' };

export default function TrackerView() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(ADD_BLANK);
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);

  const [negotiatingId, setNegotiatingId] = useState<string | null>(null);
  const [negotiateNote, setNegotiateNote] = useState('');
  const [negotiating, setNegotiating] = useState(false);

  useEffect(() => {
    api.applications()
      .then(setApps)
      .catch(() => setError('Could not load your tracker right now.'))
      .finally(() => setLoading(false));
  }, []);

  const getByStage = (stage: Stage) => apps.filter(a => a.stage === stage);

  const moveApp = async (id: string, newStage: Stage) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, stage: newStage } : a));
    try {
      await api.updateApplication(id, { stage: newStage });
    } catch {
      // best-effort — a page refresh will resync with the server
    }
  };

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const downloadCv = async (id: string) => {
    setDownloadingId(id);
    try {
      await downloadCvPdf(await api.cv());
    } catch {
      // best-effort — the Profile page has the same export
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRemove = async (id: string) => {
    if (!window.confirm('Remove this application from your tracker?')) return;
    setApps(prev => prev.filter(a => a.id !== id));
    try {
      await api.deleteApplication(id);
    } catch {
      // best-effort — a page refresh will resync with the server
    }
  };

  const openNegotiate = (app: Application) => {
    setNegotiatingId(app.id);
    setNegotiateNote(app.nextStep || '');
  };

  const submitNegotiate = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    setNegotiating(true);
    try {
      await api.updateApplication(id, { nextStep: negotiateNote });
      setApps(prev => prev.map(a => a.id === id ? { ...a, nextStep: negotiateNote } : a));
      setNegotiatingId(null);
    } catch {
      // leave the form open so the user can retry
    } finally {
      setNegotiating(false);
    }
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!addForm.title.trim() || !addForm.company.trim()) {
      setAddError('Job title and company are required.');
      return;
    }
    setAdding(true);
    try {
      const app = await api.createApplication(addForm);
      setApps(prev => [app, ...prev]);
      setAddForm(ADD_BLANK);
      setShowAddForm(false);
    } catch {
      setAddError('Could not add this application right now.');
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <div style={{ padding: 20, color: '#6B6B6B', fontSize: 13 }}>Loading your tracker…</div>;
  if (error) return <div style={{ padding: 20, color: '#BA1F4F', fontSize: 13 }}>{error}</div>;

  return (
    <div>
      {/* Summary bar */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #E4E4E4',
          borderRadius: 12,
          padding: '14px 20px',
          marginBottom: 18,
        }}
      >
        <div style={{ display: 'flex', overflowX: 'auto', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{apps.filter(a => a.stage !== 'prepared').length}</div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B' }}>Total Applications</div>
          </div>
          <div style={{ width: 1, height: 36, background: '#E4E4E4' }} />
          {STAGES.map(s => (
            <div key={s.id}>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{getByStage(s.id).length}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: s.color, opacity: 0.8 }}>{s.label}</div>
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <Button
            size="sm" variant="primary" icon={<Plus size={12} />}
            onClick={() => { setShowAddForm(v => !v); setAddError(''); }}
          >
            {showAddForm ? 'Cancel' : 'Add Application'}
          </Button>
        </div>

        {showAddForm && (
          <form onSubmit={submitAdd} style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F0F0F0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="cv-fields">
              <Field label="Job title">
                <input required value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} placeholder="Senior Backend Engineer" style={inputStyle} />
              </Field>
              <Field label="Company">
                <input required value={addForm.company} onChange={e => setAddForm(f => ({ ...f, company: e.target.value }))} placeholder="Acme Inc." style={inputStyle} />
              </Field>
              <Field label="Location (optional)">
                <input value={addForm.location} onChange={e => setAddForm(f => ({ ...f, location: e.target.value }))} placeholder="Lagos, Nigeria" style={inputStyle} />
              </Field>
              <Field label="Platform (optional)">
                <input value={addForm.platform} onChange={e => setAddForm(f => ({ ...f, platform: e.target.value }))} placeholder="e.g. LinkedIn" style={inputStyle} />
              </Field>
            </div>
            {addError && <ErrorBanner>{addError}</ErrorBanner>}
            <Button type="submit" variant="primary" disabled={adding} style={{ alignSelf: 'flex-start' }}>
              {adding ? 'Adding…' : 'Save application'}
            </Button>
          </form>
        )}
      </div>

      {/* Kanban */}
      <div className="kanban-wrapper">
      <div className="kanban-grid">
        {STAGES.map((stage) => {
          const cards = getByStage(stage.id);
          return (
            <div
              key={stage.id}
              style={{
                background: '#F6F6F6',
                borderRadius: 12,
                padding: 12,
                minHeight: 300,
              }}
            >
              {/* Column header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    color: stage.color,
                  }}
                >
                  {stage.label}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#fff',
                    background: stage.color,
                    padding: '1px 7px',
                    borderRadius: 20,
                  }}
                >
                  {cards.length}
                </span>
              </div>

              {/* Cards */}
              {cards.map((app) => (
                <div
                  key={app.id}
                  style={{
                    background: '#fff',
                    borderRadius: 8,
                    padding: '10px 12px',
                    marginBottom: 8,
                    border: stage.id === 'offered' ? '1px solid #2EAA8A' : '1px solid #E4E4E4',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                    position: 'relative',
                  }}
                >
                  <button
                    onClick={() => handleRemove(app.id)}
                    aria-label="Remove application"
                    style={{
                      position: 'absolute', top: 6, right: 6, padding: 2,
                      border: 'none', background: 'transparent', cursor: 'pointer', color: '#aaa',
                    }}
                  >
                    <X size={12} />
                  </button>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#1A1A1A', paddingRight: 14 }}>{app.title}</div>
                  <div style={{ fontSize: 11, color: '#6B6B6B', marginTop: 1 }}>{app.company} · {app.location}</div>
                  <div style={{ fontSize: 10, color: '#aaa', marginTop: 5 }}>{app.date}</div>
                  {app.nextStep && negotiatingId !== app.id && (
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: stage.id === 'interviewing' ? '#E83567' : '#F5C535',
                        marginTop: 3,
                      }}
                    >
                      {app.nextStep}
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: PLATFORM_COLORS[app.platform] || '#ccc',
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#6B6B6B' }}>{app.platform}</span>
                  </div>
                  {stage.id === 'offered' && negotiatingId === app.id && (
                    <form onSubmit={(e) => submitNegotiate(e, app.id)} style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                      <textarea
                        value={negotiateNote}
                        onChange={e => setNegotiateNote(e.target.value)}
                        rows={2}
                        autoFocus
                        placeholder="e.g. Asked for 15% more base salary"
                        style={{ ...inputStyle, fontSize: 11, padding: '6px 8px', resize: 'vertical' as const }}
                      />
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <Button type="submit" size="sm" variant="teal" fullWidth disabled={negotiating} style={{ fontSize: 11 }}>
                          {negotiating ? 'Saving…' : 'Save'}
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => setNegotiatingId(null)} style={{ fontSize: 11 }}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                  {stage.id === 'offered' && negotiatingId !== app.id && (
                    <Button
                      size="sm"
                      variant="teal"
                      fullWidth
                      style={{ marginTop: 8, fontSize: 11 }}
                      onClick={() => openNegotiate(app)}
                    >
                      Negotiate Offer
                    </Button>
                  )}
                  {/* Prepared: the external application hasn't been sent yet */}
                  {stage.id === 'prepared' && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {app.sourceUrl && (
                        <a
                          href={app.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                            padding: '5px 0', borderRadius: 5, background: '#F5C535', color: '#1A1A1A',
                            fontSize: 11, fontWeight: 800, textDecoration: 'none',
                          }}
                        >
                          Open posting <ExternalLink size={10} />
                        </a>
                      )}
                      <Button size="sm" variant="outline" fullWidth disabled={downloadingId === app.id} style={{ fontSize: 11 }} onClick={() => downloadCv(app.id)}>
                        {downloadingId === app.id ? 'Preparing…' : 'Download CV'}
                      </Button>
                      <Button size="sm" variant="teal" fullWidth style={{ fontSize: 11 }} onClick={() => moveApp(app.id, 'applied')}>
                        I&rsquo;ve applied
                      </Button>
                    </div>
                  )}
                  {/* Move stage */}
                  {stage.id !== 'offered' && stage.id !== 'prepared' && (
                    <button
                      onClick={() => {
                        const idx = STAGES.findIndex(s => s.id === stage.id);
                        if (idx < STAGES.length - 1) moveApp(app.id, STAGES[idx + 1].id);
                      }}
                      style={{
                        marginTop: 8,
                        width: '100%',
                        padding: '4px 0',
                        background: 'transparent',
                        border: '1px dashed #E4E4E4',
                        borderRadius: 5,
                        fontSize: 10,
                        color: '#aaa',
                        cursor: 'pointer',
                        fontFamily: 'Nunito, sans-serif',
                        fontWeight: 700,
                      }}
                    >
                      Move →
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontWeight: 700, fontSize: 12.5, display: 'block', marginBottom: 6, color: '#1E4845' }}>{label}</label>
      {children}
    </div>
  );
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, color: '#BA1F4F', background: '#FEE8EF', borderRadius: 8, padding: '8px 12px' }}>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1.5px solid #E4E4E4', fontSize: 14,
  fontFamily: 'Nunito, sans-serif', outline: 'none',
  color: '#1A1A1A', background: '#fff',
};
