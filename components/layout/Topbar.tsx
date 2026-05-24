'use client';

import { Search, Sparkles } from 'lucide-react';
import { NavView } from '@/types';

const VIEW_TITLES: Record<NavView, string> = {
  dashboard: 'Dashboard',
  cv: 'CV Builder',
  jobs: 'Job Search',
  tracker: 'Application Tracker',
  analytics: 'Analytics & Insights',
  network: 'Network & Referrals',
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

      {/* Search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: '#F6F6F6',
          border: '1px solid #E4E4E4',
          borderRadius: 6,
          padding: '7px 12px',
          width: 220,
        }}
      >
        <Search size={14} color="#6B6B6B" />
        <input
          type="text"
          placeholder="Search jobs, companies…"
          style={{
            border: 'none',
            background: 'transparent',
            fontFamily: 'Nunito, sans-serif',
            fontSize: 13,
            outline: 'none',
            width: '100%',
            color: '#1A1A1A',
          }}
        />
      </div>

      {/* AI Assist */}
      <button
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 16px',
          background: '#F5C535',
          color: '#1A1A1A',
          border: 'none',
          borderRadius: 6,
          fontFamily: 'Nunito, sans-serif',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'background 0.15s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#e6b820')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = '#F5C535')}
      >
        <Sparkles size={14} />
        AI Assist
      </button>
    </header>
  );
}
