'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Tag, { TagVariant } from '@/components/ui/Tag';
import { getMatchColor, PLATFORM_COLORS } from '@/lib/utils';
import { api } from '@/lib/api';
import { JobListing } from '@/types';
import { RefreshCw, Bookmark, Zap, ExternalLink } from 'lucide-react';

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
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [platform, setPlatform] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = () =>
    api.jobs()
      .then(setJobs)
      .catch(() => setError('Could not load jobs right now.'));

  useEffect(() => {
    fetchJobs().finally(() => setLoading(false));
  }, []);

  const filtered = platform === 'All' ? jobs : jobs.filter(j => j.platform === platform);

  const handleApply = async (id: string) => {
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

  const handleRefresh = () => {
    setRefreshing(true);
    fetchJobs().finally(() => setRefreshing(false));
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
          const isSaved = saved.has(job.id);
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
                <div style={{ fontSize: 22, fontWeight: 800, color: getMatchColor(job.matchScore) }}>{job.matchScore}%</div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', marginBottom: 8 }}>match</div>
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
                    ✓ Applied
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => setSaved(prev => { const n = new Set(prev); n.has(job.id) ? n.delete(job.id) : n.add(job.id); return n; })}
                      style={{
                        padding: '5px 8px',
                        border: '1.5px solid #E4E4E4',
                        borderRadius: 6,
                        background: isSaved ? '#FEF3B0' : '#fff',
                        cursor: 'pointer',
                        color: isSaved ? '#977411' : '#6B6B6B',
                      }}
                    >
                      <Bookmark size={13} fill={isSaved ? '#977411' : 'none'} />
                    </button>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<Zap size={12} />}
                      disabled={isApplying}
                      onClick={() => handleApply(job.id)}
                    >
                      {isApplying ? 'Applying…' : 'Apply'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
