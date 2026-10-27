'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Tag, { TagVariant } from '@/components/ui/Tag';
import { PLATFORM_COLORS } from '@/lib/utils';
import ExternalApplyDialog from '@/components/features/ExternalApplyDialog';
import { api } from '@/lib/api';
import { JobListing } from '@/types';
import { RefreshCw, Bookmark, Zap, ExternalLink, Link2 } from 'lucide-react';

const PLATFORM_DOT_COLOR: Record<string, string> = PLATFORM_COLORS;

const TYPE_TAG: Record<string, TagVariant> = {
  'Full-time': 'teal',
  'Remote': 'teal',
  'Contract': 'yellow',
  'Hybrid': 'blue',
};

export default function JobSearchView() {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [platform, setPlatform] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [externalJob, setExternalJob] = useState<JobListing | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchJobs = () =>
    api.jobs()
      .then(setJobs)
      .catch(() => setError('Could not load jobs right now.'));

  useEffect(() => {
    fetchJobs().finally(() => setLoading(false));
  }, []);

  const filtered = platform === 'All' ? jobs : jobs.filter(j => j.platform === platform);

  const handleApply = async (job: JobListing) => {
    // External jobs are applied for on the source site: open the guided
    // dialog (CV download + link out) instead of recording a fake "applied".
    if (job.sourceType === 'external') {
      setExternalJob(job);
      return;
    }
    const id = job.id;
    setApplying(prev => new Set(prev).add(id));
    try {
      await api.applyToJob(id);
      setJobs(prev => prev.map(j => j.id === id ? { ...j, applied: true } : j));
    } catch {
      // leave the job unmarked so the user can retry
    } finally {
      setApplying(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
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

        <Button size="sm" variant="outline" icon={<RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />} onClick={handleRefresh}>
          {refreshing ? 'Refreshing…' : 'Refresh All'}
        </Button>
      </div>

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
          const isApplying = applying.has(job.id);
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
                      disabled={isApplying}
                      onClick={() => handleApply(job)}
                    >
                      {isApplying ? 'Applying…' : job.sourceType === 'external' ? 'CV & apply' : 'Apply'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {externalJob && (
        <ExternalApplyDialog
          job={externalJob}
          onClose={() => setExternalJob(null)}
          onPrepared={() => setJobs(prev => prev.map(j => j.id === externalJob.id ? { ...j, applied: true } : j))}
        />
      )}
    </div>
  );
}
