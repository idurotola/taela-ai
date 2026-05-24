'use client';

import { Fragment, useState } from 'react';
import { NavView } from '@/types';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import BottomNav from '@/components/layout/BottomNav';
import DashboardView from '@/components/features/DashboardView';
import CVBuilderView from '@/components/features/CVBuilderView';
import JobSearchView from '@/components/features/JobSearchView';
import TrackerView from '@/components/features/TrackerView';
import AnalyticsView from '@/components/features/AnalyticsView';
import NetworkView from '@/components/features/NetworkView';

export default function DashboardPage() {
  const [activeView, setActiveView] = useState<NavView>('dashboard');

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':   return <DashboardView onNavigate={setActiveView} />;
      case 'cv':          return <CVBuilderView />;
      case 'jobs':        return <JobSearchView />;
      case 'tracker':     return <TrackerView />;
      case 'analytics':   return <AnalyticsView />;
      case 'network':     return <NetworkView />;
      default:            return <DashboardView onNavigate={setActiveView} />;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F0F0F0' }}>
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
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
