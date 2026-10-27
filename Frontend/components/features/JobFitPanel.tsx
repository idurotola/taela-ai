'use client';

import { useEffect, useState } from 'react';
import { Check, AlertTriangle, Sparkles, Copy } from 'lucide-react';
import Button from '@/components/ui/Button';
import { api, ApiError } from '@/lib/api';
import type { JobMatch, TailoredCV } from '@/types';

export interface FitState {
  tailored: TailoredCV | null;
  /** The cover letter as the candidate has edited it. */
  coverLetter: string;
}

interface Props {
  jobId: string;
  onChange?: (state: FitState) => void;
  /** Reports the AI score so a job list can swap its estimate for it. */
  onMatch?: (score: number) => void;
}

function scoreColor(score: number) {
  return score >= 75 ? '#2EAA8A' : score >= 50 ? '#C99A12' : '#E83567';
}

/**
 * "How well do I fit this job, and can the CV be improved for it?" — a fit
 * score with matched/missing keywords, then a one-click tailored CV and cover
 * letter. Tailoring only rewords what's already in the CV (the server enforces
 * that), and everything is shown for the candidate to review.
 */
export default function JobFitPanel({ jobId, onChange, onMatch }: Props) {
  const [match, setMatch] = useState<JobMatch | null>(null);
  const [tailored, setTailored] = useState<TailoredCV | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [busy, setBusy] = useState<'match' | 'tailor' | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Pick up an earlier tailoring for this job; a 404 just means there isn't one.
  useEffect(() => {
    let cancelled = false;
    api.tailoredForJob(jobId)
      .then((t) => {
        if (cancelled) return;
        setTailored(t);
        setCoverLetter(t.coverLetter);
        onChange?.({ tailored: t, coverLetter: t.coverLetter });
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const run = async (kind: 'match' | 'tailor') => {
    setBusy(kind);
    setError('');
    try {
      if (kind === 'match') {
        const m = await api.matchJob(jobId);
        setMatch(m);
        onMatch?.(m.score);
      } else {
        const t = await api.tailorJob(jobId);
        setTailored(t);
        setCoverLetter(t.coverLetter);
        onChange?.({ tailored: t, coverLetter: t.coverLetter });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const editLetter = (text: string) => {
    setCoverLetter(text);
    onChange?.({ tailored, coverLetter: text });
  };

  const copyLetter = async () => {
    try {
      await navigator.clipboard.writeText(coverLetter);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — the text is selectable in the box
    }
  };

  return (
    <div style={{ border: '1px solid #E4E4E4', borderRadius: 12, padding: 14, background: '#FAFAF8', fontFamily: 'Nunito, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Sparkles size={15} color="#2EAA8A" />
        <strong style={{ fontSize: 14 }}>How well do you fit this job?</strong>
        {!match && (
          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => run('match')}>
            {busy === 'match' ? 'Checking…' : 'Check my fit'}
          </Button>
        )}
      </div>

      {error && <div style={{ fontSize: 12.5, color: '#BA1F4F', background: '#FEE8EF', borderRadius: 8, padding: '8px 12px', marginTop: 10 }}>{error}</div>}

      {match && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: scoreColor(match.score), lineHeight: 1 }}>
              {match.score}<span style={{ fontSize: 14, color: '#999' }}>/100</span>
            </div>
            <div style={{ fontSize: 13, color: '#444', lineHeight: 1.5 }}>{match.summary}</div>
          </div>

          {(match.matched.length > 0 || match.missing.length > 0) && (
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {match.matched.map((k) => <Chip key={'m' + k} ok>{k}</Chip>)}
              {match.missing.map((k) => <Chip key={'x' + k}>{k}</Chip>)}
            </div>
          )}
          {match.missing.length > 0 && (
            <div style={{ fontSize: 11.5, color: '#6B6B6B', marginTop: 6 }}>
              Highlighted terms are missing from your CV. Add them under Skills or your experience only if they&rsquo;re true for you.
            </div>
          )}

          {match.gaps.length > 0 && (
            <ul style={{ margin: '10px 0 0', paddingLeft: 18, fontSize: 12.5, color: '#444' }}>
              {match.gaps.map((g, i) => <li key={i}>{g}</li>)}
            </ul>
          )}

          {match.formatChecks.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {match.formatChecks.map((c) => (
                <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: c.status === 'ok' ? '#1F7D65' : '#977411' }}>
                  {c.status === 'ok' ? <Check size={13} /> : <AlertTriangle size={13} />} {c.label}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(match || tailored) && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #E4E4E4' }}>
          {!tailored ? (
            <Button size="sm" variant="primary" disabled={busy !== null} onClick={() => run('tailor')}>
              {busy === 'tailor' ? 'Tailoring…' : 'Tailor my CV & write a cover letter'}
            </Button>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>Tailored for this job</div>
              {tailored.stale && (
                <div style={{ fontSize: 12, color: '#977411', background: '#FEF3B0', borderRadius: 8, padding: '6px 10px', marginBottom: 8 }}>
                  Your CV has changed since this was written.{' '}
                  <button onClick={() => run('tailor')} disabled={busy !== null} style={linkBtn}>Redo it</button>
                </div>
              )}
              <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 12.5, color: '#444' }}>
                {tailored.changes.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
              <label style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#6B6B6B' }}>
                Cover letter (edit as you like)
              </label>
              <textarea
                value={coverLetter}
                onChange={(e) => editLetter(e.target.value)}
                rows={7}
                maxLength={5000}
                aria-label="Cover letter"
                style={{ width: '100%', marginTop: 4, padding: '9px 12px', border: '1.5px solid #E4E4E4', borderRadius: 8, fontFamily: 'Nunito, sans-serif', fontSize: 13, lineHeight: 1.5, resize: 'vertical' }}
              />
              <button onClick={copyLetter} style={{ ...linkBtn, marginTop: 4, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                <Copy size={12} /> {copied ? 'Copied!' : 'Copy cover letter'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
      background: ok ? '#E6F7F3' : '#FEE8EF', color: ok ? '#1F7D65' : '#BA1F4F',
      border: `1px solid ${ok ? '#B3E8DC' : '#FBC4D5'}`,
    }}>
      {ok ? '✓ ' : '+ '}{children}
    </span>
  );
}

const linkBtn: React.CSSProperties = {
  border: 'none', background: 'transparent', color: '#2878B5', fontWeight: 700, fontSize: 12,
  cursor: 'pointer', padding: 0, fontFamily: 'Nunito, sans-serif',
};
