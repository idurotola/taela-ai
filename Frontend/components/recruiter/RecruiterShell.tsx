'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, Building2, LayoutDashboard, LogOut, Plus, Users } from 'lucide-react';
import Button from '@/components/ui/Button';
import VerificationBanner from '@/components/features/VerificationBanner';
import ApplicantPanel from '@/components/features/ApplicantPanel';
import OverviewView from '@/components/recruiter/OverviewView';
import JobsView from '@/components/recruiter/JobsView';
import PipelineView from '@/components/recruiter/PipelineView';
import CompanyView from '@/components/recruiter/CompanyView';
import JobSlideOver from '@/components/recruiter/JobSlideOver';
import { api, getToken, clearToken, ApiError } from '@/lib/api';
import { BRAND, GREY } from '@/lib/recruiter';
import type { RecruiterApplicant, RecruiterJob, RecruiterProfile } from '@/types';

export type RecruiterView = 'overview' | 'jobs' | 'applicants' | 'company';

const NAV: { id: RecruiterView; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
  { id: 'jobs', label: 'Jobs', icon: <Briefcase size={16} /> },
  { id: 'applicants', label: 'Applicants', icon: <Users size={16} /> },
  { id: 'company', label: 'Company', icon: <Building2 size={16} /> },
];

const TITLES: Record<RecruiterView, string> = {
  overview: 'Overview', jobs: 'Jobs', applicants: 'Applicants', company: 'Company profile',
};

type SlideOver = { mode: 'create' } | { mode: 'edit'; job: RecruiterJob } | null;

/**
 * The recruiter workspace: a side panel with Overview, Jobs, Applicants and
 * Company, one shared copy of the recruiter's data, and the "post a job"
 * slide-over reachable from anywhere.
 */
export default function RecruiterShell() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [jobs, setJobs] = useState<RecruiterJob[]>([]);
  const [applicants, setApplicants] = useState<RecruiterApplicant[]>([]);
  const [view, setView] = useState<RecruiterView>('overview');
  const [jobFilter, setJobFilter] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [slide, setSlide] = useState<SlideOver>(null);
  const [error, setError] = useState('');

  const signOut = useCallback(() => {
    clearToken();
    router.replace('/signin');
  }, [router]);

  const reload = useCallback(async () => {
    const [j, a] = await Promise.all([api.recruiter.jobs(), api.recruiter.allApplicants()]);
    setJobs(j);
    setApplicants(a);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/signin');
      return;
    }
    api.recruiter.profile()
      .then((p) => {
        setProfile(p);
        // Deep links (emails, the old applicants URL) arrive as ?view=&job=&open=.
        const q = new URLSearchParams(window.location.search);
        const v = q.get('view') as RecruiterView | null;
        if (v && NAV.some((n) => n.id === v)) setView(v);
        setJobFilter(q.get('job') ?? '');
        setOpenId(q.get('open'));
        return reload();
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          router.replace('/signin');
        } else if (err instanceof ApiError && err.status === 404) {
          router.replace('/recruiter/profile');
        } else {
          setError('Could not load your dashboard right now.');
        }
      })
      .finally(() => setChecking(false));
  }, [router, reload]);

  const go = (next: RecruiterView, opts: { job?: string } = {}) => {
    setView(next);
    setJobFilter(opts.job ?? '');
    window.history.replaceState(null, '', next === 'overview' ? '/recruiter/dashboard' : `/recruiter/dashboard?view=${next}`);
  };

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Nunito, sans-serif', color: GREY }}>
        Loading…
      </div>
    );
  }

  const verified = !profile?.verificationStatus || profile.verificationStatus === 'verified';
  const companyName = profile?.companyName || (profile?.type === 'independent' ? 'Independent recruiter' : 'Your company');
  const newCount = applicants.filter((a) => a.stage === 'applied').length;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F0F0F0', fontFamily: 'Nunito, sans-serif', overflow: 'hidden' }}>
      {/* Side panel */}
      <aside className="sidebar-desktop" style={{ width: 232, minWidth: 232, background: BRAND, color: '#fff', flexDirection: 'column', padding: '22px 14px' }}>
        <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.5px', padding: '0 10px 18px' }}>
          Taela<span style={{ color: '#F5C535' }}>AI</span>
          <span style={{ display: 'block', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 700, marginTop: 2 }}>Recruiter</span>
        </div>

        <Button variant="primary" fullWidth icon={<Plus size={14} />} disabled={!verified} onClick={() => setSlide({ mode: 'create' })}
          style={{ marginBottom: 18 }} title={verified ? undefined : 'Verify your company to post jobs'}>
          Post a job
        </Button>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {NAV.map((n) => {
            const active = view === n.id;
            return (
              <button key={n.id} onClick={() => go(n.id)} aria-current={active ? 'page' : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: active ? 'rgba(255,255,255,0.14)' : 'transparent', color: active ? '#fff' : 'rgba(255,255,255,0.72)',
                  fontFamily: 'Nunito, sans-serif', fontSize: 14, fontWeight: active ? 800 : 600, textAlign: 'left',
                }}>
                {n.icon}
                <span style={{ flex: 1 }}>{n.label}</span>
                {n.id === 'applicants' && newCount > 0 && (
                  <span style={{ background: '#F5C535', color: '#1A1A1A', fontSize: 11, fontWeight: 800, borderRadius: 20, padding: '1px 8px' }}>{newCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.14)', paddingTop: 12 }}>
          <div style={{ padding: '0 10px 8px', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{companyName}</div>
          <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.72)', cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 600 }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ background: '#fff', borderBottom: `1px solid #E4E4E4`, padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, flex: 1 }}>{TITLES[view]}</h1>
          <span className="rec-topbar-post">
            <Button variant="primary" size="sm" icon={<Plus size={13} />} disabled={!verified} onClick={() => setSlide({ mode: 'create' })}>Post a job</Button>
          </span>
          <button onClick={signOut} className="bottom-nav-signout" aria-label="Sign out" style={{ border: 'none', background: 'transparent', color: GREY, cursor: 'pointer' }}>
            <LogOut size={16} />
          </button>
        </header>

        <main className="dash-main">
          {profile && !verified && (
            <VerificationBanner profile={profile} onStatusChange={(status) => setProfile((p) => p && { ...p, verificationStatus: status })} />
          )}
          {error && <div style={{ color: '#BA1F4F', fontSize: 13, marginBottom: 12 }}>{error}</div>}

          {view === 'overview' && (
            <OverviewView jobs={jobs} applicants={applicants} canPost={verified}
              onPost={() => setSlide({ mode: 'create' })} onGo={go} onOpenApplicant={setOpenId} />
          )}
          {view === 'jobs' && (
            <JobsView jobs={jobs} canPost={verified} onPost={() => setSlide({ mode: 'create' })}
              onEdit={(job) => setSlide({ mode: 'edit', job })} onApplicants={(id) => go('applicants', { job: id })} />
          )}
          {view === 'applicants' && (
            <PipelineView jobs={jobs} applicants={applicants} setApplicants={setApplicants}
              jobFilter={jobFilter} onJobFilter={setJobFilter} onOpen={setOpenId} />
          )}
          {view === 'company' && profile && (
            <CompanyView profile={profile} onSaved={(p) => setProfile(p)} />
          )}
        </main>

        {/* Mobile nav */}
        <nav className="bottom-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: BRAND, justifyContent: 'space-around', padding: '8px 4px', zIndex: 50 }}>
          {NAV.map((n) => (
            <button key={n.id} onClick={() => go(n.id)} style={{ border: 'none', background: 'transparent', color: view === n.id ? '#F5C535' : 'rgba(255,255,255,0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontSize: 10, fontWeight: 700, fontFamily: 'Nunito, sans-serif', cursor: 'pointer' }}>
              {n.icon}{n.label}
            </button>
          ))}
        </nav>
      </div>

      {slide && (
        <JobSlideOver
          mode={slide.mode}
          job={slide.mode === 'edit' ? slide.job : undefined}
          defaultCompany={profile?.companyName ?? ''}
          onClose={() => setSlide(null)}
          onSaved={async () => { await reload(); }}
        />
      )}

      {openId && (
        <ApplicantPanel
          applicantId={openId}
          onClose={() => setOpenId(null)}
          onChange={(u) => setApplicants((prev) => prev.map((a) => (a.id === u.id ? { ...a, stage: u.stage, rating: u.rating } : a)))}
        />
      )}
    </div>
  );
}
