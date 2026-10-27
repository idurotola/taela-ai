'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Star, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { api, ApiError } from '@/lib/api';
import type { RecruiterApplicant, RecruiterApplicantDetail } from '@/types';

const STAGES: RecruiterApplicant['stage'][] = ['applied', 'review', 'shortlisted', 'interviewing', 'offered', 'rejected'];

interface Props {
  applicantId: string;
  onClose: () => void;
  /** Lets the list reflect stage/rating changes made in the panel. */
  onChange: (updated: RecruiterApplicantDetail) => void;
}

/** Everything a recruiter sees about one applicant, plus their private notes. */
export default function ApplicantPanel({ applicantId, onClose, onChange }: Props) {
  const [data, setData] = useState<RecruiterApplicantDetail | null>(null);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.recruiter.applicant(applicantId)
      .then((d) => { if (!cancelled) { setData(d); setNotes(d.notes); } })
      .catch(() => { if (!cancelled) setError('Could not load this applicant.'); });
    return () => { cancelled = true; };
  }, [applicantId]);

  const update = async (patch: { stage?: string; notes?: string; rating?: number }) => {
    setBusy(true);
    setError('');
    try {
      const d = await api.recruiter.updateApplicant(applicantId, patch);
      setData(d);
      onChange(d);
      if (patch.notes !== undefined) { setSaved(true); setTimeout(() => setSaved(false), 1500); }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const cv = data?.cv;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Applicant" onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
      <aside onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', width: '100%', maxWidth: 520, height: '100%', overflowY: 'auto', padding: 24, fontFamily: 'Nunito, sans-serif', position: 'relative' }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 14, right: 14, border: 'none', background: 'transparent', cursor: 'pointer', color: '#888' }}>
          <X size={18} />
        </button>

        {!data && !error && <div style={{ color: '#6B6B6B' }}>Loading…</div>}
        {error && <div style={{ color: '#BA1F4F', fontSize: 13, marginBottom: 10 }}>{error}</div>}

        {data && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 2px', paddingRight: 24 }}>{data.name}</h2>
            <div style={{ fontSize: 13, color: '#6B6B6B' }}>
              <a href={`mailto:${data.email}`} style={{ color: '#2878B5' }}>{data.email}</a>
              {data.phone && <> · {data.phone}</>}
            </div>
            <div style={{ fontSize: 12, color: '#999', margin: '2px 0 16px' }}>
              Applied {new Date(data.appliedAt).toLocaleDateString()} for {data.jobTitle}
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
              <select value={data.stage} disabled={busy} onChange={(e) => update({ stage: e.target.value })} aria-label="Stage"
                style={{ padding: '7px 10px', borderRadius: 6, border: '1.5px solid #E4E4E4', fontWeight: 700, fontSize: 13, fontFamily: 'Nunito, sans-serif' }}>
                {STAGES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
              </select>
              <div role="group" aria-label="Rating" style={{ display: 'inline-flex', gap: 2 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} disabled={busy} onClick={() => update({ rating: data.rating === n ? 0 : n })} aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2 }}>
                    <Star size={18} color="#F5C535" fill={n <= data.rating ? '#F5C535' : 'none'} />
                  </button>
                ))}
              </div>
              {data.hasCv && data.cvFileName && (
                <Button size="sm" variant="outline" icon={<Download size={12} />}
                  onClick={() => api.recruiter.downloadApplicantCV(applicantId).catch(() => setError('Could not download the CV.'))}>
                  {data.cvFileName}
                </Button>
              )}
            </div>
            {data.stage === 'rejected' || ['review', 'shortlisted', 'interviewing', 'offered'].includes(data.stage) ? (
              <div style={{ fontSize: 11, color: '#6B6B6B', marginBottom: 14 }}>Changing the stage emails the candidate.</div>
            ) : null}

            {data.coverLetter && (
              <Section title="Cover letter"><div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6 }}>{data.coverLetter}</div></Section>
            )}

            {cv && (
              <>
                {cv.summary && <Section title="Summary"><div style={{ fontSize: 13, lineHeight: 1.6 }}>{cv.summary}</div></Section>}
                {!!cv.experiences?.length && (
                  <Section title="Experience">
                    {cv.experiences.map((e, i) => (
                      <div key={i} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 800 }}>{[e.role, e.company].filter(Boolean).join(' — ')} <span style={{ fontWeight: 400, color: '#888' }}>{e.dates}</span></div>
                        <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>{e.bullets.map((b, j) => <li key={j} style={{ fontSize: 12 }}>{b}</li>)}</ul>
                      </div>
                    ))}
                  </Section>
                )}
                {!!cv.education?.length && (
                  <Section title="Education">
                    {cv.education.map((e, i) => <div key={i} style={{ fontSize: 13 }}>{[e.degree, e.school].filter(Boolean).join(' — ')} <span style={{ color: '#888' }}>{e.dates}</span></div>)}
                  </Section>
                )}
                {!!cv.skills?.length && <Section title="Skills"><div style={{ fontSize: 13 }}>{cv.skills.join(', ')}</div></Section>}
              </>
            )}
            {!cv?.experiences?.length && data.hasCv && (
              <div style={{ fontSize: 12, color: '#6B6B6B', marginBottom: 14 }}>Open the attached CV file above to see this candidate&rsquo;s full CV.</div>
            )}

            <Section title="Your private notes">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={5000} aria-label="Private notes"
                placeholder="Only you can see these."
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E4E4E4', borderRadius: 6, fontFamily: 'Nunito, sans-serif', fontSize: 13, resize: 'vertical' }} />
              <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                <Button size="sm" variant="primary" disabled={busy || notes === data.notes} onClick={() => update({ notes })}>Save notes</Button>
                {saved && <span style={{ fontSize: 12, color: '#1F7D65' }}>Saved</span>}
              </div>
            </Section>
          </>
        )}
      </aside>
    </div>,
    document.body,
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#6B6B6B', marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}
