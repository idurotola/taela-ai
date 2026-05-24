'use client';

import Link from 'next/link';
import { Briefcase, FileText, BarChart2, Users, Zap, Target } from 'lucide-react';

const TEAL       = '#1E4845';
const TEAL_LIGHT = '#2A6460';
const CREAM      = '#F5EFE8';
const WHITE      = '#FFFFFF';
const OFF_BLACK  = '#1A1A1A';
const GREY       = '#6B6B6B';
const BORDER     = '#E4E4E4';

const FEATURES = [
  { icon: FileText,  bg: '#E8F3F1', color: TEAL,       title: 'AI CV Builder',         desc: 'ATS-optimised CVs tailored to each role in seconds.' },
  { icon: Briefcase, bg: '#EAF2FB', color: '#2878B5',  title: 'Multi-Platform Search', desc: 'LinkedIn, Indeed, Jobberman & more — one unified feed.' },
  { icon: Target,    bg: '#FDE8EF', color: '#E83567',  title: 'Application Tracker',   desc: 'Kanban board to track every stage from apply to offer.' },
  { icon: BarChart2, bg: '#E6F5F1', color: '#2EAA8A',  title: 'Analytics',             desc: 'Response rates, interview ratios, and market insights.' },
  { icon: Users,     bg: '#EAF2FB', color: '#2878B5',  title: 'Network & Referrals',   desc: 'Identify warm connections at your target companies.' },
  { icon: Zap,       bg: '#E8F3F1', color: TEAL,       title: 'Auto-Apply (Soon)',     desc: 'Let TaelaAI apply to matched roles while you sleep.' },
];

export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'Nunito, sans-serif', background: WHITE, color: OFF_BLACK }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: 68, background: TEAL,
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.5px', color: WHITE }}>
          Taela<span style={{ color: '#F5C535' }}>AI</span>
        </span>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/signin" style={{
            padding: '8px 22px', borderRadius: 8, fontWeight: 700, fontSize: 14,
            border: '1.5px solid rgba(255,255,255,0.35)', color: WHITE,
            textDecoration: 'none', background: 'transparent',
          }}>Sign in</Link>
          <Link href="/signup" style={{
            padding: '8px 22px', borderRadius: 8, fontWeight: 700, fontSize: 14,
            background: WHITE, color: TEAL, textDecoration: 'none', border: 'none',
          }}>Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        textAlign: 'center', padding: '96px 24px 88px',
        background: `linear-gradient(160deg, ${CREAM} 0%, ${WHITE} 55%)`,
      }}>
        <div style={{
          display: 'inline-block', background: '#D4E9E7', color: TEAL,
          padding: '5px 16px', borderRadius: 20, fontWeight: 700, fontSize: 13, marginBottom: 24,
        }}>
          AI-Powered Job Search Platform · by TaelaHR
        </div>
        <h1 style={{
          fontSize: 'clamp(36px, 6vw, 62px)', fontWeight: 800, lineHeight: 1.1,
          letterSpacing: '-1.5px', maxWidth: 760, margin: '0 auto 24px', color: OFF_BLACK,
        }}>
          Land your next role<br />
          <span style={{ color: TEAL }}>10× faster</span> with AI
        </h1>
        <p style={{
          fontSize: 18, color: GREY, maxWidth: 520,
          margin: '0 auto 40px', lineHeight: 1.65,
        }}>
          TaelaAI automates your job search — from CV tailoring and multi-platform job discovery
          to application tracking and referral outreach.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/signup" style={{
            padding: '13px 32px', borderRadius: 10, fontWeight: 800, fontSize: 15,
            background: TEAL, color: WHITE, textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(30,72,69,0.28)',
          }}>Start for free</Link>
          <Link href="/signin" style={{
            padding: '13px 32px', borderRadius: 10, fontWeight: 700, fontSize: 15,
            border: `1.5px solid ${BORDER}`, color: OFF_BLACK, textDecoration: 'none',
            background: WHITE,
          }}>Sign in</Link>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 48px', background: CREAM }}>
        <h2 style={{
          textAlign: 'center', fontSize: 32, fontWeight: 800,
          letterSpacing: '-0.5px', marginBottom: 12, color: OFF_BLACK,
        }}>Everything you need to get hired</h2>
        <p style={{
          textAlign: 'center', color: GREY, fontSize: 15,
          marginBottom: 48, marginTop: 0,
        }}>
          Built on TaelaHR's decade of recruitment expertise, now powered by AI.
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20, maxWidth: 1000, margin: '0 auto',
        }}>
          {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} style={{
              background: WHITE, borderRadius: 14, padding: '28px 24px',
              border: `1px solid ${BORDER}`,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <Icon size={22} color={color} />
              </div>
              <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: OFF_BLACK }}>{title}</h3>
              <p style={{ fontSize: 13, color: GREY, lineHeight: 1.6, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust bar */}
      <section style={{
        padding: '48px 48px', background: WHITE,
        borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`,
        textAlign: 'center',
      }}>
        <p style={{ color: GREY, fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
          Backed by the expertise of
        </p>
        <span style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-0.5px', color: TEAL }}>
          TaelaHR — Africa's MSME & Startup HR Partner
        </span>
      </section>

      {/* CTA Banner */}
      <section style={{
        textAlign: 'center', padding: '80px 24px',
        background: TEAL, color: WHITE,
      }}>
        <h2 style={{
          fontSize: 36, fontWeight: 800, letterSpacing: '-0.5px',
          marginBottom: 16, color: WHITE,
        }}>
          Ready to take control of your job search?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 16, marginBottom: 36 }}>
          Free to get started. No credit card required.
        </p>
        <Link href="/signup" style={{
          padding: '14px 36px', borderRadius: 10, fontWeight: 800, fontSize: 15,
          background: WHITE, color: TEAL, textDecoration: 'none',
          display: 'inline-block',
        }}>Create your account</Link>
      </section>

      {/* Footer */}
      <footer style={{
        textAlign: 'center', padding: '24px',
        borderTop: `1px solid ${BORDER}`,
        fontSize: 13, color: GREY, background: WHITE,
      }}>
        © {new Date().getFullYear()} TaelaAI · A product of{' '}
        <a href="https://taelahr.com" target="_blank" rel="noopener noreferrer"
          style={{ color: TEAL, fontWeight: 700, textDecoration: 'none' }}>
          TaelaHR
        </a>
      </footer>
    </div>
  );
}
