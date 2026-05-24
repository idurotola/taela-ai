'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import { MOCK_JOBS } from '@/lib/mock-data';
import { getMatchColor, PLATFORM_COLORS } from '@/lib/utils';
import { JobListing } from '@/types';
import { RefreshCw, Bookmark, Zap } from 'lucide-react';

const PLATFORM_DOT_COLOR: Record<string, string> = PLATFORM_COLORS;

const TYPE_TAG: Record<string, any> = {
  'Full-time': 'teal',
  'Remote': 'teal',
  'Contract': 'yellow',
  'Hybrid': 'blue',
};

export default function JobSearchView() {
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [platform, setPlatform] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = platform === 'All' ? MOCK_JOBS : MOCK_JOBS.filter(j => j.platform === platform);

  const handleApply = (id: string) => {
    setApplied(prev => new Set([...prev, id]));
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

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
        {['All', 'LinkedIn', 'Jobberman', 'Indeed', 'Glassdoor', 'Direct'].map((p) => (
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
        Showing <strong style={{ color: '#1A1A1A' }}>{filtered.length} matches</strong> across 5 platforms · Updated 3 mins ago
      </div>

      {/* Job List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((job: JobListing) => {
          const isApplied = applied.has(job.id);
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
                <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 1 }}>{job.company} · {job.location}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  <Tag variant={TYPE_TAG[job.type] || 'grey'}>{job.type}</Tag>
                  <Tag variant="grey">{job.salary}</Tag>
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
                  <span style={{ fontSize: 10, color: '#aaa', alignSelf: 'center' }}>{job.posted}</span>
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
                      onClick={() => handleApply(job.id)}
                    >
                      Apply
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
