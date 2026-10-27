'use client';

import { NavView } from '@/types';

const VIEW_TITLES: Record<NavView, string> = {
  dashboard: 'Dashboard',
  cv: 'CV Builder',
  jobs: 'Job Search',
  tracker: 'Application Tracker',
  analytics: 'Analytics & Insights',
  network: 'Network & Referrals',
  settings: 'Settings',
};

interface TopbarProps {
  activeView: NavView;
}

export default function Topbar({ activeView }: TopbarProps) {
  return (
    <header
      style={{
        background: '#fff',
        borderBottom: '1px solid #E4E4E4',
        padding: '12px 28px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <h1
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: '#1A1A1A',
          flex: 1,
          margin: 0,
        }}
      >
        {VIEW_TITLES[activeView]}
      </h1>
    </header>
  );
}
