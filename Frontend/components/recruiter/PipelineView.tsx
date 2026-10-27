'use client';

import { useState } from 'react';
import { FileText, LayoutGrid, Star, Table2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import { api } from '@/lib/api';
import { GREY, STAGES, Stage, initials, stageMeta, timeAgo } from '@/lib/recruiter';
import type { RecruiterApplicant, RecruiterJob } from '@/types';

interface Props {
  jobs: RecruiterJob[];
  applicants: RecruiterApplicant[];
  setApplicants: React.Dispatch<React.SetStateAction<RecruiterApplicant[]>>;
  jobFilter: string;
  onJobFilter: (jobId: string) => void;
  onOpen: (id: string) => void;
}

const control: React.CSSProperties = {
  padding: '8px 12px', border: '1.5px solid #E4E4E4', borderRadius: 8, fontFamily: 'Nunito, sans-serif',
  fontSize: 13, background: '#fff', color: '#1A1A1A',
};

export default function PipelineView({ jobs, applicants, setApplicants, jobFilter, onJobFilter, onOpen }: Props) {
  const [mode, setMode] = useState<'board' | 'table'>('board');
  const [query, setQuery] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [error, setError] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);

  const q = query.trim().toLowerCase();
  const shown = applicants.filter((a) =>
    (!jobFilter || a.jobId === jobFilter) &&
    a.rating >= minRating &&
    (!q || `${a.name} ${a.email} ${a.jobTitle}`.toLowerCase().includes(q)));

  const move = async (id: string, stage: Stage) => {
    const current = applicants.find((a) => a.id === id);
    if (!current || current.stage === stage) return;
    if (stage === 'rejected' && !window.confirm(`Reject ${current.name}? They will be emailed.`)) return;

    setError('');
    const previous = current.stage;
    setApplicants((prev) => prev.map((a) => (a.id === id ? { ...a, stage } : a)));
    try {
      await api.recruiter.updateApplicant(id, { stage });
    } catch {
      setApplicants((prev) => prev.map((a) => (a.id === id ? { ...a, stage: previous } : a)));
      setError(`Couldn't move ${current.name}. Please try again.`);
    }
  };

  if (applicants.length === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: '56px 24px', color: GREY }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#1A1A1A', marginBottom: 6 }}>No applicants yet</div>
        <p style={{ fontSize: 13, margin: 0 }}>Copy a job&rsquo;s link from the Jobs tab and share it. Applicants appear here as soon as they apply.</p>
      </Card>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <select value={jobFilter} onChange={(e) => onJobFilter(e.target.value)} aria-label="Filter by job" style={{ ...control, maxWidth: 260 }}>
          <option value="">All jobs</option>
          {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" aria-label="Search applicants" style={{ ...control, minWidth: 200 }} />
        <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} aria-label="Minimum rating" style={control}>
          <option value={0}>Any rating</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+ stars</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <div role="group" aria-label="View" style={{ display: 'inline-flex', border: '1.5px solid #E4E4E4', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
          {([['board', <LayoutGrid key="b" size={14} />, 'Board'], ['table', <Table2 key="t" size={14} />, 'Table']] as const).map(([id, icon, label]) => (
            <button key={id} onClick={() => setMode(id)} aria-pressed={mode === id}
              style={{ display: 'inline-flex', gap: 6, alignItems: 'center', padding: '7px 12px', border: 'none', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontSize: 12.5, fontWeight: 700, background: mode === id ? '#1E4845' : '#fff', color: mode === id ? '#fff' : GREY }}>
              {icon}{label}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{ fontSize: 13, color: '#BA1F4F', background: '#FEE8EF', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>{error}</div>}
      <div style={{ fontSize: 11.5, color: '#999', marginBottom: 10 }}>
        {shown.length} applicant{shown.length === 1 ? '' : 's'}. Moving someone to a new stage emails them.
      </div>

      {mode === 'board' ? (
        <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STAGES.length}, minmax(210px, 1fr))`, gap: 10, minWidth: STAGES.length * 220 }}>
            {STAGES.map((stage) => {
              const cards = shown.filter((a) => a.stage === stage.id);
              const over = overStage === stage.id;
              return (
                <div key={stage.id}
                  onDragOver={(e) => { if (dragId) { e.preventDefault(); setOverStage(stage.id); } }}
                  onDragLeave={() => setOverStage((s) => (s === stage.id ? null : s))}
                  onDrop={(e) => { e.preventDefault(); if (dragId) move(dragId, stage.id); setDragId(null); setOverStage(null); }}
                  style={{ background: over ? '#E6F7F3' : '#F6F6F6', borderRadius: 12, padding: 10, minHeight: 220, outline: over ? '2px dashed #2EAA8A' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: stage.color }}>{stage.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', background: stage.color, borderRadius: 20, padding: '1px 8px' }}>{cards.length}</span>
                  </div>
                  {cards.map((a) => (
                    <div key={a.id} draggable onDragStart={() => setDragId(a.id)} onDragEnd={() => { setDragId(null); setOverStage(null); }}
                      style={{ background: '#fff', border: '1px solid #E4E4E4', borderRadius: 10, padding: '10px 12px', marginBottom: 8, opacity: dragId === a.id ? 0.5 : 1 }}>
                      <button onClick={() => onOpen(a.id)} style={{ display: 'block', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#EFF6F5', color: '#1E4845', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{initials(a.name)}</span>
                          <span style={{ fontSize: 13, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: GREY, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.jobTitle}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 11, color: '#999' }}>
                          <span>{timeAgo(a.appliedAt)}</span>
                          {a.hasCv && <span title="CV attached" style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}><FileText size={11} /> CV</span>}
                          {a.rating > 0 && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: '#977411', fontWeight: 800 }}><Star size={11} fill="#F5C535" color="#F5C535" />{a.rating}</span>}
                        </div>
                      </button>
                      <select value={a.stage} onChange={(e) => move(a.id, e.target.value as Stage)} aria-label={`Move ${a.name}`}
                        style={{ width: '100%', marginTop: 8, padding: '4px 6px', border: '1px dashed #D5D5D5', borderRadius: 6, fontSize: 11, fontFamily: 'Nunito, sans-serif', color: GREY, background: '#fff' }}>
                        {STAGES.map((s) => <option key={s.id} value={s.id}>Move to: {s.label}</option>)}
                      </select>
                    </div>
                  ))}
                  {cards.length === 0 && <div style={{ fontSize: 11.5, color: '#bbb', textAlign: 'center', padding: '14px 0' }}>Drop here</div>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <Card style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #E4E4E4', color: GREY, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {['Candidate', 'Job', 'Applied', 'Rating', 'Stage'].map((h) => <th key={h} style={{ padding: '12px 16px', fontWeight: 700 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => {
                const m = stageMeta(a.stage);
                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <button onClick={() => onOpen(a.id)} style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'Nunito, sans-serif' }}>
                        <span style={{ display: 'block', fontWeight: 800, color: '#2878B5' }}>{a.name}{a.hasCv && <span style={{ marginLeft: 6, fontSize: 10, color: GREY }}>CV</span>}</span>
                        <span style={{ display: 'block', fontSize: 11.5, color: GREY }}>{a.email}</span>
                      </button>
                    </td>
                    <td style={{ padding: '10px 16px' }}>{a.jobTitle}</td>
                    <td style={{ padding: '10px 16px', color: GREY }}>{new Date(a.appliedAt).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 16px' }}>{a.rating > 0 ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700 }}><Star size={12} fill="#F5C535" color="#F5C535" />{a.rating}</span> : <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <select value={a.stage} onChange={(e) => move(a.id, e.target.value as Stage)} aria-label={`Stage for ${a.name}`}
                        style={{ padding: '5px 8px', borderRadius: 6, border: '1.5px solid #E4E4E4', fontWeight: 700, fontSize: 12, fontFamily: 'Nunito, sans-serif', background: m.bg, color: m.color }}>
                        {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: GREY }}>No applicants match these filters.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
