'use client';

import { NavView } from '@/types';
import { LayoutDashboard, FileText, Search, KanbanSquare, BarChart2, Users } from 'lucide-react';

const NAV = [
  { id: 'dashboard' as NavView, icon: <LayoutDashboard size={20} />, label: 'Home' },
  { id: 'cv'        as NavView, icon: <FileText size={20} />,        label: 'CV' },
  { id: 'jobs'      as NavView, icon: <Search size={20} />,          label: 'Jobs' },
  { id: 'tracker'   as NavView, icon: <KanbanSquare size={20} />,    label: 'Track' },
  { id: 'analytics' as NavView, icon: <BarChart2 size={20} />,       label: 'Stats' },
  { id: 'network'   as NavView, icon: <Users size={20} />,           label: 'Network' },
];

interface BottomNavProps {
  activeView: NavView;
  onNavigate: (view: NavView) => void;
}

export default function BottomNav({ activeView, onNavigate }: BottomNavProps) {
  return (
    <nav
      className="bottom-nav"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 60, background: '#000',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        alignItems: 'center', justifyContent: 'space-around',
        zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {NAV.map(({ id, icon, label }) => {
        const isActive = activeView === id;
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'transparent', border: 'none', cursor: 'pointer', flex: 1,
              color: isActive ? '#F5C535' : 'rgba(255,255,255,0.45)',
              fontFamily: 'Nunito, sans-serif', padding: '4px 0',
            }}
          >
            {icon}
            <span style={{ fontSize: 9, fontWeight: 700 }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
