'use client';

import { NavView } from '@/types';
import {
  LayoutDashboard,
  FileText,
  Search,
  KanbanSquare,
  BarChart2,
  Users,
  Settings,
  Sparkles,
} from 'lucide-react';

interface NavItem {
  id: NavView;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  badgeColor?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { id: 'cv', label: 'CV Builder', icon: <FileText size={16} /> },
  { id: 'jobs', label: 'Job Search', icon: <Search size={16} />, badge: 14, badgeColor: '#E83567' },
  { id: 'tracker', label: 'Applications', icon: <KanbanSquare size={16} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart2 size={16} /> },
  { id: 'network', label: 'Network', icon: <Users size={16} />, badge: 3, badgeColor: '#2878B5' },
];

interface SidebarProps {
  activeView: NavView;
  onNavigate: (view: NavView) => void;
}

export default function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <img
          src="https://taelahr.com/wp-content/uploads/2025/04/Taela-Logo-Alternate.png"
          alt="TaelaAI logo"
          style={{
            width: 106,
            height: 32,
            objectFit: 'contain',
            borderRadius: 8,
            display: 'block',
          }}
        />
        <div
          style={{
            marginTop: 8,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(245,197,53,0.12)',
            border: '1px solid rgba(245,197,53,0.2)',
            borderRadius: 20,
            padding: '2px 8px',
          }}
        >
          <Sparkles size={10} color="#F5C535" />
          <span style={{ fontSize: 9, fontWeight: 700, color: '#F5C535', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            AI-Powered
          </span>
        </div>
      </div>

      {/* Nav */}
      <div style={{ padding: '12px 0', flex: 1 }}>
        <div
          style={{
            fontSize: 9,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)',
            fontWeight: 700,
            padding: '8px 20px',
            marginBottom: 4,
          }}
        >
          Main Menu
        </div>

        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 20px',
                width: '100%',
                border: 'none',
                borderLeft: isActive ? '3px solid #F5C535' : '3px solid transparent',
                background: isActive ? 'rgba(245,197,53,0.08)' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'Nunito, sans-serif',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }
              }}
            >
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span
                  style={{
                    background: item.badgeColor,
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 20,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div
          style={{
            fontSize: 9,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)',
            fontWeight: 700,
            padding: '12px 20px 8px',
            marginTop: 8,
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          Account
        </div>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 20px',
            width: '100%',
            border: '3px solid transparent',
            background: 'transparent',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Nunito, sans-serif',
          }}
        >
          <Settings size={16} />
          Settings
        </button>
      </div>

      {/* User */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2EAA8A, #2878B5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 800,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            AO
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Amara Osei
            </div>
            <div style={{ fontSize: 10, color: '#F5C535', fontWeight: 600 }}>Pro Plan</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
