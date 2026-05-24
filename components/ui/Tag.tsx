import { ReactNode } from 'react';

type TagVariant = 'yellow' | 'pink' | 'teal' | 'blue' | 'grey';

const VARIANT_STYLES: Record<TagVariant, { bg: string; color: string }> = {
  yellow: { bg: '#FEF3B0', color: '#977411' },
  pink:   { bg: '#FBC4D5', color: '#BA1F4F' },
  teal:   { bg: '#B3E8DC', color: '#1F7D65' },
  blue:   { bg: '#BAD9F3', color: '#1A5C8E' },
  grey:   { bg: '#F0F0F0', color: '#6B6B6B' },
};

interface TagProps {
  variant?: TagVariant;
  children: ReactNode;
  style?: React.CSSProperties;
}

export default function Tag({ variant = 'grey', children, style }: TagProps) {
  const s = VARIANT_STYLES[variant];
  return (
    <span
      style={{
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        background: s.bg,
        color: s.color,
        display: 'inline-block',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
