'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NavView, User } from '@/types';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import BottomNav from '@/components/layout/BottomNav';
import DashboardView from '@/components/features/DashboardView';
import CVBuilderView from '@/components/features/CVBuilderView';
import JobSearchView from '@/components/features/JobSearchView';
import TrackerView from '@/components/features/TrackerView';
import AnalyticsView from '@/components/features/AnalyticsView';
import SettingsView from '@/components/features/SettingsView';
import { api, getToken, clearToken, ApiError } from '@/lib/api';

export default function DashboardPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<NavView>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [badgeCounts, setBadgeCounts] = useState<Partial<Record<NavView, number>>>({});

  useEffect(() => {
    if (!getToken()) {
      router.replace('/signin');
      return;
    }
    api.me()
      .then(setUser)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          router.replace('/signin');
        }
      })
      .finally(() => setChecking(false));

    // Real sidebar badge counts, not placeholder literals.
    api.jobs()
      .then((jobs) => setBadgeCounts({ jobs: jobs.length }))
      .catch(() => {});
  }, [router]);

  const handleSignOut = () => {
    clearToken();
    router.replace('/signin');
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':   return <DashboardView onNavigate={setActiveView} />;
      case 'cv':          return <CVBuilderView />;
      case 'jobs':        return <JobSearchView onNavigate={setActiveView} />;
      case 'tracker':     return <TrackerView />;
      case 'analytics':   return <AnalyticsView />;
      case 'settings':    return <SettingsView user={user} onUserUpdate={setUser} />;
      default:            return <DashboardView onNavigate={setActiveView} />;
    }
  };

  if (checking) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#F0F0F0', fontFamily: 'Nunito, sans-serif', color: '#6B6B6B',
      }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F0F0F0' }}>
      <Sidebar activeView={activeView} onNavigate={setActiveView} user={user} onSignOut={handleSignOut} badgeCounts={badgeCounts} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar activeView={activeView} />
        <main
          key={activeView}
          className="dash-main"
          style={{ animation: 'fadeInUp 0.3s ease forwards' }}
        >
          {renderView()}
        </main>
      </div>
      <BottomNav activeView={activeView} onNavigate={setActiveView} />
    </div>
  );
}
