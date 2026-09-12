'use client';

import { Fragment, useEffect, useState } from 'react';
import { NavView, DashboardSummary } from '@/types';
import StatCard from '@/components/ui/StatCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SectionHeader from '@/components/ui/SectionHeader';
import { Check, Mail, Users, BarChart2, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { getMatchColor } from '@/lib/utils';

interface DashboardProps {
  onNavigate: (view: NavView) => void;
}

const ACTIVITY_ICON: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  application: { icon: <Check size={14} />, bg: '#B3E8DC', color: '#1F7D65' },
  interview:   { icon: <Mail size={14} />,  bg: '#BAD9F3', color: '#1A5C8E' },
  network:     { icon: <Users size={14} />, bg: '#FEF3B0', color: '#977411' },
  cv:          { icon: <BarChart2 size={14} />, bg: '#FBC4D5', color: '#BA1F4F' },
};

export default function DashboardView({ onNavigate }: DashboardProps) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboardSummary()
      .then(setData)
      .catch(() => setError('Could not load your dashboard right now.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 20, color: '#6B6B6B', fontSize: 13 }}>Loading dashboard…</div>;
  if (error || !data) return <div style={{ padding: 20, color: '#BA1F4F', fontSize: 13 }}>{error || 'Something went wrong.'}</div>;

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {data.stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} trend={s.trend} trendUp={s.trendUp} accent={s.accent} />
        ))}
      </div>

      {/* Middle row */}
      <div className="two-col" style={{ marginBottom: 16 }}>
        {/* Best Matches */}
        <Card>
          <SectionHeader tag="Recommended Today" title="Best Job Matches" action={
            <Button size="sm" variant="outline" onClick={() => onNavigate('jobs')}>View All →</Button>
          } />
          {data.bestMatches.length === 0 && (
            <div style={{ fontSize: 12, color: '#6B6B6B', padding: '8px 0' }}>No jobs in the catalog yet.</div>
          )}
          {data.bestMatches.map((job) => (
            <div
              key={job.id}
              onClick={() => onNavigate('jobs')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderBottom: '1px solid #F0F0F0',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 9,
                  background: job.logoColor,
                  color: job.logoTextColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {job.logoInitials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1A1A1A' }}>{job.title}</div>
                <div style={{ fontSize: 11, color: '#6B6B6B' }}>{job.company}{job.location && ` · ${job.location}`}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: getMatchColor(job.matchScore) }}>{job.matchScore}%</div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B' }}>match</div>
              </div>
            </div>
          ))}
        </Card>

        {/* Activity Feed */}
        <Card>
          <SectionHeader tag="Activity Feed" title="Recent Updates" />
          {data.recentActivity.length === 0 && (
            <div style={{ fontSize: 12, color: '#6B6B6B' }}>Nothing yet — apply to a job or update your CV to see activity here.</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.recentActivity.map((item) => {
              const style = ACTIVITY_ICON[item.type] || ACTIVITY_ICON.application;
              return (
                <div key={item.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: style.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: style.color,
                      flexShrink: 0,
                    }}
                  >
                    {style.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: '#6B6B6B' }}>{item.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Pipeline */}
      <Card>
        <SectionHeader
          tag="Application Pipeline"
          title="Your Progress"
          action={
            <Button size="sm" variant="outline" onClick={() => onNavigate('tracker')}>View All →</Button>
          }
        />
        <div className="pipeline-row">
          {data.pipeline.map((stage, i) => (
            <Fragment key={stage.label}>
              <div
                style={{
                  flex: 1,
                  textAlign: 'center',
                  background: '#F6F6F6',
                  borderRadius: 8,
                  padding: '12px 6px',
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A' }}>{stage.count}</div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', opacity: 0.8 }}>
                  {stage.label}
                </div>
              </div>
              {i < data.pipeline.length - 1 && (
                <ArrowRight size={16} color="#C4C4C4" style={{ flexShrink: 0 }} />
              )}
            </Fragment>
          ))}
        </div>
      </Card>
    </div>
  );
}
