'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Download, ExternalLink, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { api } from '@/lib/api';
import { downloadCvDocx, downloadCvPdf } from '@/lib/cvExport';
import JobFitPanel, { FitState } from '@/components/features/JobFitPanel';
import type { CV } from '@/types';

export interface ExternalJobRef {
  id: string;
  title: string;
  company: string;
  platform: string;
  sourceUrl?: string;
}

interface Props {
  job: ExternalJobRef;
  onClose: () => void;
  /** Called once the job has been added to the tracker as "Prepared". */
  onPrepared?: () => void;
}

/**
 * External jobs are applied for on the source site, so Taela can't submit
 * them. This walks the candidate through it: download your CV, continue to
 * the source site, and the job sits in the tracker as "Prepared" until they
 * confirm they've submitted.
 */
export default function ExternalApplyDialog({ job, onClose, onPrepared }: Props) {
  const [cv, setCv] = useState<CV | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'pdf' | 'docx' | null>(null);
  const [tailored, setTailored] = useState<FitState['tailored']>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.cv(), api.applyToJob(job.id)])
      .then(([loaded]) => {
        if (cancelled) return;
        setCv(loaded);
        onPrepared?.();
      })
      .catch(() => {
        if (!cancelled) setError('Could not prepare this application right now. Please try again.');
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  const cvIsEmpty = !!cv && !cv.summary.trim() && cv.experiences.length === 0;

  const download = async (kind: 'pdf' | 'docx') => {
    if (!cv) return;
    setBusy(kind);
    try {
      // Send the job-tailored version when there is one.
      const out: CV = tailored
        ? { ...cv, ...tailored.content, experiences: tailored.content.experiences.map((e, i) => ({ id: `t${i}`, ...e })), education: tailored.content.education }
        : cv;
      await (kind === 'pdf' ? downloadCvPdf(out) : downloadCvDocx(out));
    } finally {
      setBusy(null);
    }
  };

  // Only ever mounted after a click (never during SSR). Portalled so an
  // ancestor's overflow/transform can't clip or offset the fixed overlay.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Apply to ${job.title}`}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, width: '100%', maxWidth: 460, padding: '24px 24px 20px',
          fontFamily: 'Nunito, sans-serif', position: 'relative', maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: 12, right: 12, border: 'none', background: 'transparent', cursor: 'pointer', color: '#888' }}
        >
          <X size={18} />
        </button>

        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#2878B5' }}>
          External job · {job.platform}
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: '4px 0 2px', paddingRight: 24 }}>{job.title}</h2>
        <div style={{ fontSize: 13, color: '#6B6B6B', marginBottom: 16 }}>{job.company}</div>

        <p style={{ fontSize: 13, color: '#444', lineHeight: 1.55, margin: '0 0 16px' }}>
          This job is applied for on {job.platform}&rsquo;s site, so Taela can&rsquo;t submit it for you.
          Download your CV, then continue to the original posting.
        </p>

        {error && (
          <div style={{ fontSize: 13, color: '#BA1F4F', background: '#FEE8EF', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
            {error}
          </div>
        )}

        {cvIsEmpty && (
          <div style={{ fontSize: 13, color: '#977411', background: '#FEF3B0', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
            Your CV is still empty. Fill it in under <strong>Profile</strong> first so you have something to send.
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <JobFitPanel jobId={job.id} onChange={(f) => setTailored(f.tailored)} />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Button variant="outline" fullWidth disabled={!cv || busy !== null} icon={<Download size={13} />} onClick={() => download('pdf')}>
            {busy === 'pdf' ? 'Preparing…' : tailored ? 'Tailored CV (PDF)' : 'CV (PDF)'}
          </Button>
          <Button variant="outline" fullWidth disabled={!cv || busy !== null} icon={<Download size={13} />} onClick={() => download('docx')}>
            {busy === 'docx' ? 'Preparing…' : tailored ? 'Tailored CV (DOCX)' : 'CV (DOCX)'}
          </Button>
        </div>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 16 }}>
          {tailored ? 'This CV is tailored to this job — review it before you send it.' : 'This is your current CV. Use “Check my fit” above to tailor it to this job.'}
        </div>

        {job.sourceUrl ? (
          <a
            href={job.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 14px',
              borderRadius: 8, background: '#F5C535', color: '#1A1A1A', fontWeight: 800, fontSize: 14, textDecoration: 'none',
            }}
          >
            Continue to {job.platform} <ExternalLink size={14} />
          </a>
        ) : (
          <div style={{ fontSize: 13, color: '#6B6B6B' }}>The original posting link isn&rsquo;t available for this job.</div>
        )}

        <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 14, lineHeight: 1.5 }}>
          We&rsquo;ve added it to your tracker as <strong>Prepared</strong>. Once you&rsquo;ve submitted, mark it
          as applied in <Link href="/dashboard" onClick={onClose} style={{ color: '#2878B5' }}>Applications</Link>.
        </div>
      </div>
    </div>,
    document.body
  );
}
