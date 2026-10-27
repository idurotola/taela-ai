'use client';

import { useState } from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { GREY, STAGES, initials, stageMeta, timeAgo } from '@/lib/recruiter';
import type { RecruiterApplicant, RecruiterJob } from '@/types';
import type { RecruiterView } from '@/components/recruiter/RecruiterShell';

interface Props {
  jobs: RecruiterJob[];
  applicants: RecruiterApplicant[];
  canPost: boolean;
  onPost: () => void;
  onGo: (view: RecruiterView, opts?: { job?: string }) => void;
  onOpenApplicant: (id: string) => void;
}

export default function OverviewView({ jobs, applicants, canPost, onPost, onGo, onOpenApplicant }: Props) {
  const [now] = useState(() => Date.now()); // fixed at mount so render stays pure
  if (jobs.length === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: '56px 24px' }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Post your first job</div>
        <p style={{ color: GREY, fontSize: 14, maxWidth: 420, margin: '0 auto 18px', lineHeight: 1.6 }}>
          Create a posting in a minute, share its public link anywhere, and applicants land here in a pipeline you can manage.
        </p>
        <Button variant="primary" icon={<Plus size={14} />} disabled={!canPost} onClick={onPost}>Post a job</Button>
        {!canPost && <div style={{ fontSize: 12, color: GREY, marginTop: 10 }}>Verify your company first — see the notice above.</div>}
      </Card>
    );
  }

  const open = jobs.filter((j) => j.status === 'open');
  const weekAgo = now - 7 * 86400000;
  const newThisWeek = applicants.filter((a) => new Date(a.appliedAt).getTime() >= weekAgo).length;
  const needsReview = applicants.filter((a) => a.stage === 'applied').length;
  const interviewing = applicants.filter((a) => a.stage === 'interviewing' || a.stage === 'offered').length;
  const byStage = STAGES.map((s) => ({ ...s, count: applicants.filter((a) => a.stage === s.id).length }));
  const maxCount = Math.max(1, ...byStage.map((s) => s.count));
  const recent = applicants.slice(0, 6);
  const topJobs = [...jobs].filter((j) => j.applicantCount > 0).sort((a, b) => b.applicantCount - a.applicantCount).slice(0, 4);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
        <Tile label="Open jobs" value={open.length} sub={`${jobs.length} total`} accent="#2EAA8A" onClick={() => onGo('jobs')} />
        <Tile label="Total applicants" value={applicants.length} sub={`${newThisWeek} in the last 7 days`} accent="#2878B5" onClick={() => onGo('applicants')} />
        <Tile label="Awaiting review" value={needsReview} sub="New, not yet looked at" accent="#E83567" onClick={() => onGo('applicants')} />
        <Tile label="Interview / offer" value={interviewing} sub="Furthest along" accent="#977411" onClick={() => onGo('applicants')} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <Card>
          <SectionTitle title="Pipeline" action="Open board" onAction={() => onGo('applicants')} />
          {byStage.map((s) => (
            <div key={s.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                <span style={{ fontWeight: 700 }}>{s.label}</span>
                <span style={{ fontWeight: 800, color: s.color }}>{s.count}</span>
              </div>
              <div style={{ height: 6, background: '#F0F0F0', borderRadius: 20, overflow: 'hidden' }}>
                <div style={{ width: `${(s.count / maxCount) * 100}%`, height: '100%', background: s.color, borderRadius: 20 }} />
              </div>
            </div>
          ))}
        </Card>

        <Card>
          <SectionTitle title="Latest applicants" action="See all" onAction={() => onGo('applicants')} />
          {recent.length === 0 && <div style={{ fontSize: 13, color: GREY }}>No applications yet. Share a job&rsquo;s link to get started.</div>}
          {recent.map((a) => {
            const m = stageMeta(a.stage);
            return (
              <button key={a.id} onClick={() => onOpenApplicant(a.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 0', border: 'none', borderBottom: '1px solid #F0F0F0', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'Nunito, sans-serif' }}>
                <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#EFF6F5', color: '#1E4845', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{initials(a.name)}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: GREY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.jobTitle} · {timeAgo(a.appliedAt)}</span>
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 9px', borderRadius: 20, background: m.bg, color: m.color }}>{m.label}</span>
              </button>
            );
          })}
        </Card>
      </div>

      {topJobs.length > 0 && (
        <Card>
          <SectionTitle title="Jobs getting the most applicants" action="All jobs" onAction={() => onGo('jobs')} />
          {topJobs.map((j) => (
            <button key={j.id} onClick={() => onGo('applicants', { job: j.id })}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 0', border: 'none', borderBottom: '1px solid #F0F0F0', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontFamily: 'Nunito, sans-serif' }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 800 }}>{j.title}</span>
              <span style={{ fontSize: 12, color: GREY }}>{j.status === 'open' ? 'Open' : 'Expired'}</span>
              <span style={{ fontSize: 13, fontWeight: 800 }}>{j.applicantCount}</span>
              <ArrowRight size={13} color={GREY} />
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}

function Tile({ label, value, sub, accent, onClick }: { label: string; value: number; sub: string; accent: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ textAlign: 'left', border: '1px solid #E4E4E4', borderTop: `3px solid ${accent}`, borderRadius: 12, background: '#fff', padding: '14px 16px', cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}>
      <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6, color: GREY, marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 11.5, color: '#999', marginTop: 2 }}>{sub}</div>
    </button>
  );
}

function SectionTitle({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 800 }}>{title}</div>
      <button onClick={onAction} style={{ border: 'none', background: 'transparent', color: '#2878B5', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}>{action} →</button>
    </div>
  );
}
