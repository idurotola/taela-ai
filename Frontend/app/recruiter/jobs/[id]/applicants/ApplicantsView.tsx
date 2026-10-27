'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RecruiterApplicant, RecruiterJob } from '@/types';
import { api, getToken, clearToken, ApiError } from '@/lib/api';
import Card from '@/components/ui/Card';
import { ArrowLeft, Star } from 'lucide-react';
import ApplicantPanel from '@/components/features/ApplicantPanel';

const GREY = '#6B6B6B';
const BORDER = '#E4E4E4';

const STAGES: RecruiterApplicant['stage'][] = ['applied', 'review', 'shortlisted', 'interviewing', 'offered', 'rejected'];

export default function ApplicantsView({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [job, setJob] = useState<RecruiterJob | null>(null);
  const [applicants, setApplicants] = useState<RecruiterApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/signin');
      return;
    }
    Promise.all([api.recruiter.jobs(), api.recruiter.applicants(jobId)])
      .then(([jobs, apps]) => {
        setJob(jobs.find(j => j.id === jobId) || null);
        setApplicants(apps);
        // Email links deep-link to one applicant via ?open=<application id>.
        const open = new URLSearchParams(window.location.search).get('open');
        if (open && apps.some(a => a.id === open)) setOpenId(open);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          router.replace('/signin');
        } else if (err instanceof ApiError && err.status === 404) {
          setError('This posting could not be found.');
        } else {
          setError('Could not load applicants right now.');
        }
      })
      .finally(() => {
        setChecking(false);
        setLoading(false);
      });
  }, [router, jobId]);

  const handleStageChange = async (applicantId: string, stage: RecruiterApplicant['stage']) => {
    setUpdatingId(applicantId);
    setActionError('');
    try {
      const updated = await api.recruiter.updateApplicant(applicantId, { stage });
      setApplicants(prev => prev.map(a => (a.id === applicantId ? updated : a)));
    } catch {
      setActionError('Could not update this applicant right now.');
    } finally {
      setUpdatingId(null);
    }
  };

  if (checking || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Nunito, sans-serif', color: GREY }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F0F0F0', fontFamily: 'Nunito, sans-serif', padding: '32px 24px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <Link href="/recruiter/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: GREY, fontSize: 13, fontWeight: 700, textDecoration: 'none', marginBottom: 16 }}>
          <ArrowLeft size={14} /> Back to postings
        </Link>

        <h1 style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.5px', margin: 0 }}>
          Applicants{job ? ` — ${job.title}` : ''}
        </h1>
        <p style={{ color: GREY, fontSize: 14, margin: '4px 0 24px' }}>
          {job ? `${job.company} · ` : ''}{applicants.length} {applicants.length === 1 ? 'candidate' : 'candidates'} so far.
        </p>

        {error && <div style={{ color: '#BA1F4F', fontSize: 13 }}>{error}</div>}
        {actionError && (
          <div style={{ fontSize: 13, color: '#BA1F4F', background: '#FEE8EF', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
            {actionError}
          </div>
        )}

        {!error && applicants.length === 0 && (
          <Card style={{ textAlign: 'center', padding: '48px 24px', color: GREY }}>
            No one has applied to this posting yet.
          </Card>
        )}

        {!error && applicants.length > 0 && (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: `1px solid ${BORDER}`, color: GREY, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Applied</th>
                  <th style={thStyle}>Rating</th>
                  <th style={thStyle}>Stage</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map(a => (
                  <tr key={a.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={tdStyle}>
                      <button onClick={() => setOpenId(a.id)} style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontWeight: 800, color: '#2878B5', fontFamily: 'Nunito, sans-serif', fontSize: 13 }}>
                        {a.name}
                      </button>
                      {a.hasCv && <span style={{ marginLeft: 6, fontSize: 10, color: GREY }}>CV</span>}
                    </td>
                    <td style={tdStyle}>{a.email}</td>
                    <td style={tdStyle}>{new Date(a.appliedAt).toLocaleDateString()}</td>
                    <td style={tdStyle}>
                      {a.rating > 0 ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 700 }}><Star size={12} color="#F5C535" fill="#F5C535" />{a.rating}</span> : <span style={{ color: '#bbb' }}>—</span>}
                    </td>
                    <td style={tdStyle}>
                      <select
                        value={a.stage}
                        disabled={updatingId === a.id}
                        onChange={e => handleStageChange(a.id, e.target.value as RecruiterApplicant['stage'])}
                        style={selectStyle}
                      >
                        {STAGES.map(s => (
                          <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {openId && (
        <ApplicantPanel
          applicantId={openId}
          onClose={() => setOpenId(null)}
          onChange={(u) => setApplicants(prev => prev.map(a => (a.id === u.id ? { ...a, stage: u.stage, rating: u.rating } : a)))}
        />
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '12px 16px', fontWeight: 700 };
const tdStyle: React.CSSProperties = { padding: '12px 16px', color: '#1A1A1A' };

const selectStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6,
  border: `1.5px solid ${BORDER}`, fontSize: 12.5, fontWeight: 700,
  fontFamily: 'Nunito, sans-serif', outline: 'none',
  color: '#1A1A1A', background: '#fff',
};
