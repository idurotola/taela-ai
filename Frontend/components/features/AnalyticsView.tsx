'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import StatCard from '@/components/ui/StatCard';
import SectionHeader from '@/components/ui/SectionHeader';
import Button from '@/components/ui/Button';
import { api } from '@/lib/api';
import { PLATFORM_COLORS } from '@/lib/utils';
import { AnalyticsSummary, MarketInsight } from '@/types';
import { TrendingUp } from 'lucide-react';

const ACCENT_BORDER: Record<string, string> = {
  yellow: '#F5C535',
  teal: '#2EAA8A',
  blue: '#2878B5',
  pink: '#E83567',
};

const FUNNEL_COLORS = ['#6B6B6B', '#2878B5', '#F5C535', '#E83567', '#2EAA8A'];

export default function AnalyticsView() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [insights, setInsights] = useState<MarketInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.analyticsSummary(), api.insights()])
      .then(([summary, marketInsights]) => {
        setData(summary);
        setInsights(marketInsights);
      })
      .catch(() => setError('Could not load analytics right now.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 20, color: '#6B6B6B', fontSize: 13 }}>Loading analytics…</div>;
  if (error || !data) return <div style={{ padding: 20, color: '#BA1F4F', fontSize: 13 }}>{error || 'Something went wrong.'}</div>;

  const maxWeekly = Math.max(1, ...data.weeklyActivity.map(d => d.count));
  const bestDay = data.weeklyActivity.reduce((best, d) => (d.count > best.count ? d : best), data.weeklyActivity[0]);

  return (
    <div>
      {/* Stats row */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {data.stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} trend={s.trend} trendUp={s.trendUp} accent={s.accent} />
        ))}
      </div>

      <div className="two-col" style={{ marginBottom: 16 }}>
        {/* Platform bar chart */}
        <Card>
          <SectionHeader title="Applications by Platform" />
          {data.platformStats.length === 0 && (
            <div style={{ fontSize: 12, color: '#6B6B6B' }}>Apply to a few jobs to see platform stats.</div>
          )}
          {data.platformStats.map((p) => {
            const color = PLATFORM_COLORS[p.name] || '#6B6B6B';
            return (
              <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ minWidth: 80, fontSize: 12, color: '#6B6B6B', fontWeight: 600 }}>{p.name}</div>
                <div style={{ flex: 1, height: 10, background: '#F0F0F0', borderRadius: 20, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${p.pct}%`,
                      height: '100%',
                      background: color,
                      borderRadius: 20,
                      transition: 'width 0.6s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color, minWidth: 24, textAlign: 'right' }}>{p.count}</div>
              </div>
            );
          })}
        </Card>

        {/* Weekly bar chart */}
        <Card>
          <SectionHeader title="Applications by Day" />
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100, padding: '0 4px' }}>
            {data.weeklyActivity.map((d) => {
              const isBest = d.day === bestDay.day && d.count > 0;
              return (
                <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${(d.count / maxWeekly) * 80}px`,
                      background: isBest ? '#F5C535' : '#E8F2FB',
                      borderRadius: '4px 4px 0 0',
                      position: 'relative',
                      transition: 'height 0.4s ease',
                    }}
                  >
                    {isBest && (
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
                  <div style={{ fontSize: 10, fontWeight: 800, color: isBest ? '#977411' : '#1A1A1A' }}>{d.count}</div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="two-one-col">
        {/* Market Insights */}
        <Card>
          <SectionHeader title="Market Insights" action={
            <Button size="sm" variant="outline" icon={<TrendingUp size={12} />}>Full Report</Button>
          } />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {insights.map((insight) => (
              <div
                key={insight.id || insight.title}
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
          {data.funnel.map((row, i) => (
            <div key={row.label} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>{row.label}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: FUNNEL_COLORS[i] }}>{row.value}</span>
              </div>
              <div style={{ height: 6, background: '#F0F0F0', borderRadius: 20, overflow: 'hidden' }}>
                <div style={{ width: `${row.pct}%`, height: '100%', background: FUNNEL_COLORS[i], borderRadius: 20 }} />
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
