import Card from './Card';

interface StatCardProps {
  label: string;
  value: string | number;
  trend: string;
  trendUp: boolean;
  accent: 'yellow' | 'pink' | 'teal' | 'blue';
}

export default function StatCard({ label, value, trend, trendUp, accent }: StatCardProps) {
  const trendColor = trendUp ? '#2EAA8A' : '#E83567';
  return (
    <Card accent={accent}>
      <div style={{ paddingTop: 4 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#6B6B6B', marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#1A1A1A', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: trendColor, fontWeight: 700, marginTop: 5 }}>
          {trend}
        </div>
      </div>
    </Card>
  );
}
