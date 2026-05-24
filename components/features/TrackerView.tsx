'use client';

import { useState } from 'react';
import { MOCK_APPLICATIONS } from '@/lib/mock-data';
import { STAGE_CONFIG, PLATFORM_COLORS } from '@/lib/utils';
import { Application } from '@/types';
import Button from '@/components/ui/Button';
import { Plus } from 'lucide-react';

type Stage = Application['stage'];

const STAGES: { id: Stage; label: string; color: string; bg: string }[] = [
  { id: 'applied',      label: 'Applied',       color: '#6B6B6B', bg: '#F0F0F0' },
  { id: 'review',       label: 'Under Review',  color: '#2878B5', bg: '#E8F2FB' },
  { id: 'shortlisted',  label: 'Shortlisted',   color: '#977411', bg: '#FEF3B0' },
  { id: 'interviewing', label: 'Interviewing',  color: '#E83567', bg: '#FEE8EF' },
  { id: 'offered',      label: 'Offered',       color: '#1F7D65', bg: '#E6F7F3' },
];

export default function TrackerView() {
  const [apps, setApps] = useState<Application[]>(MOCK_APPLICATIONS);

  const getByStage = (stage: Stage) => apps.filter(a => a.stage === stage);

  const moveApp = (id: string, newStage: Stage) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, stage: newStage } : a));
  };

  return (
    <div>
      {/* Summary bar */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #E4E4E4',
          borderRadius: 12,
          padding: '14px 20px',
          marginBottom: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{apps.length}</div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B' }}>Total Applications</div>
        </div>
        <div style={{ width: 1, height: 36, background: '#E4E4E4' }} />
        {STAGES.map(s => (
          <div key={s.id}>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{getByStage(s.id).length}</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: s.color, opacity: 0.8 }}>{s.label}</div>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <Button size="sm" variant="primary" icon={<Plus size={12} />}>
          Add Application
        </Button>
      </div>

      {/* Kanban */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        {STAGES.map((stage) => {
          const cards = getByStage(stage.id);
          return (
            <div
              key={stage.id}
              style={{
                background: '#F6F6F6',
                borderRadius: 12,
                padding: 12,
                minHeight: 300,
              }}
            >
              {/* Column header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    color: stage.color,
                  }}
                >
                  {stage.label}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#fff',
                    background: stage.color,
                    padding: '1px 7px',
                    borderRadius: 20,
                  }}
                >
                  {cards.length}
                </span>
              </div>

              {/* Cards */}
              {cards.map((app) => (
                <div
                  key={app.id}
                  style={{
                    background: '#fff',
                    borderRadius: 8,
                    padding: '10px 12px',
                    marginBottom: 8,
                    border: stage.id === 'offered' ? '1px solid #2EAA8A' : '1px solid #E4E4E4',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#1A1A1A' }}>{app.title}</div>
                  <div style={{ fontSize: 11, color: '#6B6B6B', marginTop: 1 }}>{app.company} · {app.location}</div>
                  <div style={{ fontSize: 10, color: '#aaa', marginTop: 5 }}>{app.date}</div>
                  {app.nextStep && (
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: stage.id === 'interviewing' ? '#E83567' : '#F5C535',
                        marginTop: 3,
                      }}
                    >
                      {app.nextStep}
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: PLATFORM_COLORS[app.platform] || '#ccc',
                        display: 'inline-block',
                      }}
                    />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#6B6B6B' }}>{app.platform}</span>
                  </div>
                  {stage.id === 'offered' && (
                    <Button
                      size="sm"
                      variant="teal"
                      fullWidth
                      style={{ marginTop: 8, fontSize: 11 }}
                    >
                      Negotiate Offer
                    </Button>
                  )}
                  {/* Move stage */}
                  {stage.id !== 'offered' && (
                    <button
                      onClick={() => {
                        const idx = STAGES.findIndex(s => s.id === stage.id);
                        if (idx < STAGES.length - 1) moveApp(app.id, STAGES[idx + 1].id);
                      }}
                      style={{
                        marginTop: 8,
                        width: '100%',
                        padding: '4px 0',
                        background: 'transparent',
                        border: '1px dashed #E4E4E4',
                        borderRadius: 5,
                        fontSize: 10,
                        color: '#aaa',
                        cursor: 'pointer',
                        fontFamily: 'Nunito, sans-serif',
                        fontWeight: 700,
                      }}
                    >
                      Move →
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
