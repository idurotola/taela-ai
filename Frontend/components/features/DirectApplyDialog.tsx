'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from '@/components/ui/Button';
import JobFitPanel, { FitState } from '@/components/features/JobFitPanel';
import { api, ApiError } from '@/lib/api';

export interface DirectJobRef {
  id: string;
  title: string;
  company: string;
}

interface Props {
  job: DirectJobRef;
  onClose: () => void;
  onApplied: () => void;
  /** Called with the AI score when the candidate runs "Check my fit". */
  onScore?: (score: number) => void;
}

/**
 * Applying to a job posted on Taela: check your fit, optionally tailor your
 * CV and cover letter to this job's listing, then send. Tailoring is part of
 * each job rather than a setting on the profile.
 */
export default function DirectApplyDialog({ job, onClose, onApplied, onScore }: Props) {
  const [fit, setFit] = useState<FitState>({ tailored: null, coverLetter: '' });
  const [cover, setCover] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const letter = fit.tailored ? fit.coverLetter : cover;

  const send = async () => {
    setSending(true);
    setError('');
    try {
      await api.applyToJob(job.id, { coverLetter: letter, useTailored: !!fit.tailored });
      onApplied();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit your application. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Apply to ${job.title}`} onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, padding: '24px 24px 20px', fontFamily: 'Nunito, sans-serif', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 12, right: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: '#888' }}>
          <X size={18} />
        </button>

        <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 2px', paddingRight: 24 }}>{job.title}</h2>
        <div style={{ fontSize: 13, color: '#6B6B6B', marginBottom: 16 }}>{job.company}</div>

        <div style={{ marginBottom: 14 }}>
          <JobFitPanel jobId={job.id} onChange={setFit} onMatch={onScore} />
        </div>

        {!fit.tailored && (
          <textarea
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            maxLength={5000}
            rows={3}
            placeholder="Cover letter (optional)"
            aria-label="Cover letter"
            style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E4E4E4', borderRadius: 8, fontFamily: 'Nunito, sans-serif', fontSize: 13, resize: 'vertical', marginBottom: 12 }}
          />
        )}

        <div style={{ fontSize: 12, color: fit.tailored ? '#1F7D65' : '#6B6B6B', marginBottom: 10 }}>
          {fit.tailored ? 'Your CV tailored to this job and your cover letter will be sent.' : 'Your saved CV will be sent. Use the panel above to tailor it to this job first.'}
        </div>
        {error && <div style={{ fontSize: 13, color: '#BA1F4F', marginBottom: 10 }}>{error}</div>}
        <Button variant="primary" fullWidth disabled={sending} onClick={send}>{sending ? 'Sending…' : 'Send application'}</Button>
      </div>
    </div>,
    document.body,
  );
}
