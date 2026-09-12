import { ReactNode } from 'react';

interface SectionHeaderProps {
  tag?: string;
  title: string;
  action?: ReactNode;
  style?: React.CSSProperties;
}

export default function SectionHeader({ tag, title, action, style }: SectionHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, ...style }}>
      <div>
        {tag && (
          <div style={{ fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#6B6B6B', fontWeight: 700, marginBottom: 3 }}>
            {tag}
          </div>
        )}
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A' }}>{title}</div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
