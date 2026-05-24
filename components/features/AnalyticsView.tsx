'use client';

import Card from '@/components/ui/Card';
import StatCard from '@/components/ui/StatCard';
import SectionHeader from '@/components/ui/SectionHeader';
import Button from '@/components/ui/Button';
import { MARKET_INSIGHTS, PLATFORM_STATS } from '@/lib/mock-data';
import { TrendingUp } from 'lucide-react';

const WEEKLY_DATA = [
  { day: 'Mon', apps: 4 },
  { day: 'Tue', apps: 11 },
  { day: 'Wed', apps: 7 },
  { day: 'Thu', apps: 9 },
  { day: 'Fri', apps: 8 },
  { day: 'Sat', apps: 3 },
  { day: 'Sun', apps: 5 },
];
const MAX_APPS = Math.max(...WEEKLY_DATA.map(d => d.apps));

const ACCENT_BORDER: Record<string, string> = {
  yellow: '#F5C535',
  teal: '#2EAA8A',
  blue: '#2878B5',
  pink: '#E83567',
};

export default function AnalyticsView() {
  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Response Rate" value="17%" trend="↑ Above 12% avg" trendUp accent="yellow" />
        <StatCard label="Interview Rate" value="23%" trend="↑ Top 10% of users" trendUp accent="teal" />
        <StatCard label="Avg Time to Reply" value="4.2d" trend="↓ 1.3d faster" trendUp accent="pink" />
        <StatCard label="Best Apply Day" value="Tue" trend="3× higher response" trendUp accent="blue" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Platform bar chart */}
        <Card>
          <SectionHeader tag="Feature 03" title="Applications by Platform" />
          {PLATFORM_STATS.map((p) => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ minWidth: 80, fontSize: 12, color: '#6B6B6B', fontWeight: 600 }}>{p.name}</div>
              <div style={{ flex: 1, height: 10, background: '#F0F0F0', borderRadius: 20, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${p.pct}%`,
                    height: '100%',
                    background: p.color,
                    borderRadius: 20,
                    transition: 'width 0.6s ease',
                  }}
                />
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: p.color, minWidth: 24, textAlign: 'right' }}>{p.count}</div>
            </div>
          ))}
        </Card>

        {/* Weekly bar chart */}
        <Card>
          <SectionHeader title="Applications This Week" />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100, padding: '0 4px' }}>
            {WEEKLY_DATA.map((d) => (
              <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div
                  style={{
                    width: '100%',
                    height: `${(d.apps / MAX_APPS) * 80}px`,
                    background: d.day === 'Tue' ? '#F5C535' : '#E8F2FB',
                    borderRadius: '4px 4px 0 0',
                    position: 'relative',
                    transition: 'height 0.4s ease',
                  }}
                >
                  {d.day === 'Tue' && (
                    <div style={{
                      position: 'absolute',
                      top: -18,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: 10,
                      fontWeight: 800,
                      color: '#977411',
                      whiteSpace: 'nowrap',
                    }}>
                      Best day
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 10, color: '#6B6B6B', fontWeight: 600 }}>{d.day}</div>
                <div style={{ fontSize: 10, fontWeight: 800, color: d.day === 'Tue' ? '#977411' : '#1A1A1A' }}>{d.apps}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Market Insights */}
        <Card>
          <SectionHeader title="Market Insights" action={
            <Button size="sm" variant="outline" icon={<TrendingUp size={12} />}>Full Report</Button>
          } />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {MARKET_INSIGHTS.map((insight) => (
              <div
                key={insight.title}
                style={{
                  background: '#F6F6F6',
                  borderRadius: 8,
                  padding: '12px 14px',
                  borderLeft: `3px solid ${ACCENT_BORDER[insight.accent]}`,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1A1A1A', marginBottom: 3 }}>{insight.title}</div>
                <div style={{ fontSize: 12, color: '#6B6B6B', lineHeight: 1.5 }}>{insight.text}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Conversion funnel */}
        <Card>
          <SectionHeader title="Conversion Funnel" />
          {[
            { label: 'Applied', val: 47, pct: 100, color: '#6B6B6B' },
            { label: 'Viewed', val: 19, pct: 40, color: '#2878B5' },
            { label: 'Shortlisted', val: 11, pct: 23, color: '#F5C535' },
            { label: 'Interview', val: 8, pct: 17, color: '#E83567' },
            { label: 'Offered', val: 2, pct: 4, color: '#2EAA8A' },
          ].map((row) => (
            <div key={row.label} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: row.color }}>{row.val}</span>
              </div>
              <div style={{ height: 6, background: '#F0F0F0', borderRadius: 20, overflow: 'hidden' }}>
                <div style={{ width: `${row.pct}%`, height: '100%', background: row.color, borderRadius: 20 }} />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
