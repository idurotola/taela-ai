import { CSSProperties, ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  accent?: 'yellow' | 'pink' | 'teal' | 'blue';
  onClick?: () => void;
  hover?: boolean;
}

const ACCENT_TOP: Record<string, string> = {
  yellow: '#F5C535',
  pink: '#E83567',
  teal: '#2EAA8A',
  blue: '#2878B5',
};

export default function Card({ children, style, accent, onClick, hover }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 12,
        padding: '20px 22px',
        border: '1px solid #E4E4E4',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: hover ? 'border-color 0.15s, box-shadow 0.15s' : undefined,
        ...style,
      }}
      onMouseEnter={hover && onClick ? (e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#2EAA8A';
      } : undefined}
      onMouseLeave={hover && onClick ? (e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = '#E4E4E4';
      } : undefined}
    >
      {accent && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: ACCENT_TOP[accent],
          }}
        />
      )}
      {children}
    </div>
  );
}
