'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Tag, { TagVariant } from '@/components/ui/Tag';
import { PLATFORM_COLORS } from '@/lib/utils';
import ExternalApplyDialog from '@/components/features/ExternalApplyDialog';
import DirectApplyDialog from '@/components/features/DirectApplyDialog';
import AtsMatch from '@/components/ui/AtsMatch';
import { api } from '@/lib/api';
import { JobListing, NavView } from '@/types';
import { RefreshCw, Bookmark, Zap, ExternalLink, Link2 } from 'lucide-react';

const PLATFORM_DOT_COLOR: Record<string, string> = PLATFORM_COLORS;

const TYPE_TAG: Record<string, TagVariant> = {
  'Full-time': 'teal',
  'Remote': 'teal',
  'Contract': 'yellow',
  'Hybrid': 'blue',
};

export default function JobSearchView({ onNavigate }: { onNavigate?: (view: NavView) => void } = {}) {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [platform, setPlatform] = useState('All');
  const [sort, setSort] = useState<'newest' | 'match'>('newest');
  const [refreshing, setRefreshing] = useState(false);
  const [externalJob, setExternalJob] = useState<JobListing | null>(null);
  const [directJob, setDirectJob] = useState<JobListing | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchJobs = () =>
    api.jobs()
      .then(setJobs)
      .catch(() => setError('Could not load jobs right now.'));

  useEffect(() => {
    fetchJobs().finally(() => setLoading(false));
  }, []);

  const byPlatform = platform === 'All' ? jobs : jobs.filter(j => j.platform === platform);
  const hasMatches = jobs.some(j => j.atsMatch !== undefined);
  // The server returns newest first; "best match" is a stable re-sort of that.
  const filtered = sort === 'match' && hasMatches
    ? [...byPlatform].sort((a, b) => (b.atsMatch ?? -1) - (a.atsMatch ?? -1))
    : byPlatform;

  const updateScore = (id: string, score: number) =>
    setJobs(prev => prev.map(j => j.id === id ? { ...j, atsMatch: score, atsMatchSource: 'ai' } : j));

  // Every job opens its own apply step, where the CV can be tailored to that
  // listing: external jobs get the download-and-continue dialog, Taela jobs
  // the send-here dialog.
  const handleApply = (job: JobListing) => {
    if (job.sourceType === 'external') setExternalJob(job);
    else setDirectJob(job);
  };

  const handleCopyLink = async (job: JobListing) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/jobs/${job.slug}`);
      setCopiedId(job.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // clipboard unavailable — the link is still reachable from the job page
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchJobs().finally(() => setRefreshing(false));
  };

  const handleToggleSave = async (job: JobListing) => {
    setSavingId(job.id);
    try {
      if (job.saved) {
        await api.unsaveJob(job.id);
      } else {
        await api.saveJob(job.id);
      }
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, saved: !job.saved } : j));
    } catch {
      // leave it unmarked so the user can retry
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div style={{ padding: 20, color: '#6B6B6B', fontSize: 13 }}>Loading jobs…</div>;
  if (error) return <div style={{ padding: 20, color: '#BA1F4F', fontSize: 13 }}>{error}</div>;

  return (
    <div>
      {/* Filter bar */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #E4E4E4',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 18,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {['All', 'LinkedIn', 'Jobberman', 'Indeed', 'Glassdoor', 'Direct', 'MyJobMag'].map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            style={{
              padding: '5px 12px',
              border: platform === p ? '1.5px solid #2EAA8A' : '1.5px solid #E4E4E4',
              background: platform === p ? '#E6F7F3' : '#fff',
              color: platform === p ? '#1F7D65' : '#6B6B6B',
              borderRadius: 20,
              fontFamily: 'Nunito, sans-serif',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {p === 'All' ? 'All Platforms' : p}
            {p !== 'All' && (
              <span
                style={{
                  display: 'inline-block',
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: PLATFORM_DOT_COLOR[p] || '#ccc',
                  marginLeft: 5,
                  verticalAlign: 'middle',
                }}
              />
            )}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {hasMatches && (
          <select value={sort} onChange={(e) => setSort(e.target.value as 'newest' | 'match')} aria-label="Sort jobs"
            style={{ padding: '6px 10px', borderRadius: 6, border: '1.5px solid #E4E4E4', fontSize: 12, fontWeight: 700, fontFamily: 'Nunito, sans-serif', background: '#fff' }}>
            <option value="newest">Newest first</option>
            <option value="match">Best ATS match</option>
          </select>
        )}

        <Button size="sm" variant="outline" icon={<RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />} onClick={handleRefresh}>
          {refreshing ? 'Refreshing…' : 'Refresh All'}
        </Button>
      </div>

      {!hasMatches && jobs.length > 0 && (
        <div style={{ background: '#FEF3B0', border: '1px solid #F5C535', borderRadius: 12, padding: '12px 16px', marginBottom: 14, fontSize: 13, lineHeight: 1.5, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: 220 }}>
            <strong>See how well you match every job.</strong> Add your experience or a summary to your Profile (or upload your CV) and each job will show its ATS match.
          </span>
          {onNavigate && <Button size="sm" variant="primary" onClick={() => onNavigate('cv')}>Go to Profile</Button>}
        </div>
      )}

      <div style={{ fontSize: 12, color: '#6B6B6B', marginBottom: 14 }}>
        Showing <strong style={{ color: '#1A1A1A' }}>{filtered.length} matches</strong>
      </div>

      {/* Job List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ fontSize: 13, color: '#6B6B6B', padding: '20px 0', textAlign: 'center' }}>No jobs match this filter.</div>
        )}
        {filtered.map((job: JobListing) => {
          const isApplied = !!job.applied;
          const isSaved = !!job.saved;
          const isSaving = savingId === job.id;
          return (
            <div
              key={job.id}
              style={{
                background: '#fff',
                border: isApplied ? '1px solid #2EAA8A' : '1px solid #E4E4E4',
                borderLeft: isApplied ? '3px solid #2EAA8A' : '1px solid #E4E4E4',
                borderRadius: 12,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                transition: 'border-color 0.15s',
              }}
            >
              {/* Logo */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: job.logoColor,
                  color: job.logoTextColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {job.logoInitials}
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A' }}>{job.title}</div>
                <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 1 }}>
                  {job.company}{job.location && ` · ${job.location}`}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {job.sourceType === 'external' && <Tag variant="blue">External</Tag>}
                  <Tag variant={TYPE_TAG[job.type] || 'grey'}>{job.type}</Tag>
                  {job.salary && <Tag variant="grey">{job.salary}</Tag>}
                  {job.industry && <Tag variant="blue">{job.industry}</Tag>}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 8px',
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 700,
                      background: '#F0F0F0',
                      color: '#6B6B6B',
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: PLATFORM_COLORS[job.platform] || '#ccc',
                        display: 'inline-block',
                      }}
                    />
                    {job.platform}
                  </span>
                  <span style={{ fontSize: 10, color: '#aaa' }}>{job.posted}</span>
                  <a
                    href={`/jobs/${job.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 10, fontWeight: 700, color: '#2878B5', textDecoration: 'none' }}
                  >
                    Job page
                  </a>
                  <button
                    onClick={() => handleCopyLink(job)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700,
                      color: '#2878B5', background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                      fontFamily: 'Nunito, sans-serif',
                    }}
                  >
                    <Link2 size={10} /> {copiedId === job.id ? 'Copied!' : 'Copy link'}
                  </button>
                  {job.sourceUrl && (
                    <a
                      href={job.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#2878B5',
                        textDecoration: 'none',
                      }}
                    >
                      View original <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>

              {/* Match + Actions */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ marginBottom: 8 }}><AtsMatch job={job} /></div>
                {isApplied ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#1F7D65',
                      background: '#B3E8DC',
                      padding: '5px 10px',
                      borderRadius: 6,
                    }}
                  >
                    {job.sourceType === 'external' ? '✓ In tracker' : '✓ Applied'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleToggleSave(job)}
                      disabled={isSaving}
                      style={{
                        padding: '5px 8px',
                        border: '1.5px solid #E4E4E4',
                        borderRadius: 6,
                        background: isSaved ? '#FEF3B0' : '#fff',
                        cursor: isSaving ? 'default' : 'pointer',
                        color: isSaved ? '#977411' : '#6B6B6B',
                        opacity: isSaving ? 0.6 : 1,
                      }}
                    >
                      <Bookmark size={13} fill={isSaved ? '#977411' : 'none'} />
                    </button>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<Zap size={12} />}
                      onClick={() => handleApply(job)}
                    >
                      {job.sourceType === 'external' ? 'CV & apply' : 'Tailor & apply'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {directJob && (
        <DirectApplyDialog
          job={directJob}
          onClose={() => setDirectJob(null)}
          onScore={(s) => updateScore(directJob.id, s)}
          onApplied={() => setJobs(prev => prev.map(j => j.id === directJob.id ? { ...j, applied: true } : j))}
        />
      )}

      {externalJob && (
        <ExternalApplyDialog
          job={externalJob}
          onClose={() => setExternalJob(null)}
          onScore={(s) => updateScore(externalJob.id, s)}
          onPrepared={() => setJobs(prev => prev.map(j => j.id === externalJob.id ? { ...j, applied: true } : j))}
        />
      )}
    </div>
  );
}
