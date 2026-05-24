import { ReactNode, CSSProperties, ButtonHTMLAttributes } from 'react';

type BtnVariant = 'primary' | 'teal' | 'pink' | 'blue' | 'outline' | 'ghost';
type BtnSize = 'sm' | 'md' | 'lg';

const VARIANT_STYLES: Record<BtnVariant, CSSProperties> = {
  primary: { background: '#F5C535', color: '#1A1A1A', border: 'none' },
  teal:    { background: '#2EAA8A', color: '#fff', border: 'none' },
  pink:    { background: '#E83567', color: '#fff', border: 'none' },
  blue:    { background: '#2878B5', color: '#fff', border: 'none' },
  outline: { background: '#fff', color: '#1A1A1A', border: '1.5px solid #E4E4E4' },
  ghost:   { background: 'transparent', color: '#6B6B6B', border: 'none' },
};

const SIZE_STYLES: Record<BtnSize, CSSProperties> = {
  sm: { padding: '5px 10px', fontSize: 12 },
  md: { padding: '8px 16px', fontSize: 13 },
  lg: { padding: '11px 22px', fontSize: 14 },
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  children: ReactNode;
  fullWidth?: boolean;
  icon?: ReactNode;
}

export default function Button({
  variant = 'outline',
  size = 'md',
  children,
  fullWidth,
  icon,
  style,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 6,
        fontFamily: 'Nunito, sans-serif',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.15s',
        width: fullWidth ? '100%' : undefined,
        justifyContent: fullWidth ? 'center' : undefined,
        ...VARIANT_STYLES[variant],
        ...SIZE_STYLES[size],
        ...style,
      }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}
