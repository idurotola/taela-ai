'use client';

import { Fragment } from 'react';
import { NavView } from '@/types';
import StatCard from '@/components/ui/StatCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SectionHeader from '@/components/ui/SectionHeader';
import { Check, Mail, Users, BarChart2, ArrowRight } from 'lucide-react';
import { MOCK_JOBS } from '@/lib/mock-data';
import { getMatchColor } from '@/lib/utils';

interface DashboardProps {
  onNavigate: (view: NavView) => void;
}

const PIPELINE = [
  { label: 'Applied', count: 47, bg: '#FEF3B0', color: '#977411' },
  { label: 'Viewed', count: 19, bg: '#BAD9F3', color: '#1A5C8E' },
  { label: 'Shortlisted', count: 11, bg: '#FBC4D5', color: '#BA1F4F' },
  { label: 'Interviewing', count: 8, bg: '#B3E8DC', color: '#1F7D65' },
  { label: 'Offered', count: 2, bg: '#F0F0F0', color: '#6B6B6B' },
];

const ACTIVITY = [
  { icon: <Check size={14} />, iconBg: '#B3E8DC', iconColor: '#1F7D65', title: 'CV auto-tailored for Paystack', sub: 'Just now · Senior PM role' },
  { icon: <Mail size={14} />, iconBg: '#BAD9F3', iconColor: '#1A5C8E', title: 'Interview invite from Interswitch', sub: '2 hours ago · Product Design Lead' },
  { icon: <Users size={14} />, iconBg: '#FEF3B0', iconColor: '#977411', title: 'New referral connection request', sub: '5 hours ago · Wura A. at Opay' },
  { icon: <BarChart2 size={14} />, iconBg: '#FBC4D5', iconColor: '#BA1F4F', title: 'Weekly insight report ready', sub: 'Yesterday · 3 key recommendations' },
];

export default function DashboardView({ onNavigate }: DashboardProps) {
  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Applications Sent" value="47" trend="↑ 12 this week" trendUp accent="yellow" />
        <StatCard label="Interview Invites" value="8" trend="↑ 17% rate" trendUp accent="pink" />
        <StatCard label="CV Score (ATS)" value="84/100" trend="↑ +6 pts today" trendUp accent="teal" />
        <StatCard label="Network Reach" value="312" trend="↑ 3 new referrals" trendUp accent="blue" />
      </div>

      {/* Middle row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Best Matches */}
        <Card>
          <SectionHeader tag="Recommended Today" title="Best Job Matches" action={
            <Button size="sm" variant="outline" onClick={() => onNavigate('jobs')}>View All →</Button>
          } />
          {MOCK_JOBS.slice(0, 3).map((job) => (
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
                <div style={{ fontSize: 11, color: '#6B6B6B' }}>{job.company} · {job.location}</div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ACTIVITY.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: item.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: item.iconColor,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: '#6B6B6B' }}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Pipeline */}
      <Card>
        <SectionHeader
          tag="Application Pipeline"
          title="This Month's Progress"
          action={
            <Button size="sm" variant="outline" onClick={() => onNavigate('tracker')}>View All →</Button>
          }
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {PIPELINE.map((stage, i) => (
            <Fragment key={stage.label}>
              <div
                style={{
                  flex: 1,
                  textAlign: 'center',
                  background: stage.bg,
                  borderRadius: 8,
                  padding: '12px 6px',
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 800, color: stage.color }}>{stage.count}</div>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: stage.color, opacity: 0.8 }}>
                  {stage.label}
                </div>
              </div>
              {i < PIPELINE.length - 1 && (
                <ArrowRight size={16} color="#C4C4C4" style={{ flexShrink: 0 }} />
              )}
            </Fragment>
          ))}
        </div>
      </Card>
    </div>
  );
}
