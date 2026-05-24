'use client';

import Link from 'next/link';
import { Briefcase, FileText, BarChart2, Users, Zap, Target } from 'lucide-react';

const FEATURES = [
  { icon: FileText,  color: '#F5C535', bg: '#FEF3B0', title: 'AI CV Builder',         desc: 'ATS-optimised CVs tailored to each role in seconds.' },
  { icon: Briefcase, color: '#2878B5', bg: '#BAD9F3', title: 'Multi-Platform Search', desc: 'LinkedIn, Indeed, Jobberman & more — one unified feed.' },
  { icon: Target,    color: '#E83567', bg: '#FBC4D5', title: 'Application Tracker',   desc: 'Kanban board to track every stage from apply to offer.' },
  { icon: BarChart2, color: '#2EAA8A', bg: '#B3E8DC', title: 'Analytics',             desc: 'Response rates, interview ratios, and market insights.' },
  { icon: Users,     color: '#2878B5', bg: '#BAD9F3', title: 'Network & Referrals',   desc: 'Identify warm connections at your target companies.' },
  { icon: Zap,       color: '#F5C535', bg: '#FEF3B0', title: 'Auto-Apply (Soon)',     desc: 'Let TaelaAI apply to matched roles while you sleep.' },
];

export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'Nunito, sans-serif', background: '#fff', color: '#1A1A1A' }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 48px', borderBottom: '1px solid #E4E4E4', position: 'sticky',
        top: 0, background: '#fff', zIndex: 100,
      }}>
        <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.5px' }}>
          Taela<span style={{ color: '#F5C535' }}>AI</span>
        </span>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/signin" style={{
            padding: '8px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14,
            border: '1.5px solid #E4E4E4', color: '#1A1A1A', textDecoration: 'none',
          }}>Sign in</Link>
          <Link href="/signup" style={{
            padding: '8px 20px', borderRadius: 8, fontWeight: 700, fontSize: 14,
            background: '#F5C535', color: '#1A1A1A', textDecoration: 'none', border: 'none',
          }}>Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        textAlign: 'center', padding: '96px 24px 80px',
        background: 'linear-gradient(160deg, #FFFDF0 0%, #fff 60%)',
      }}>
        <div style={{
          display: 'inline-block', background: '#FEF3B0', color: '#C99D1A',
          padding: '5px 14px', borderRadius: 20, fontWeight: 700, fontSize: 13, marginBottom: 24,
        }}>
          AI-Powered Job Search Platform
        </div>
        <h1 style={{
          fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.1,
          letterSpacing: '-1.5px', maxWidth: 780, margin: '0 auto 24px',
        }}>
          Land your next role<br />
          <span style={{ color: '#F5C535' }}>10× faster</span> with AI
        </h1>
        <p style={{
          fontSize: 18, color: '#6B6B6B', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.65,
        }}>
          TaelaAI automates your job search — from CV tailoring and multi-platform job discovery
          to application tracking and referral outreach.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/signup" style={{
            padding: '13px 32px', borderRadius: 10, fontWeight: 800, fontSize: 15,
            background: '#F5C535', color: '#1A1A1A', textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(245,197,53,0.4)',
          }}>Start for free</Link>
          <Link href="/signin" style={{
            padding: '13px 32px', borderRadius: 10, fontWeight: 700, fontSize: 15,
            border: '1.5px solid #E4E4E4', color: '#1A1A1A', textDecoration: 'none',
          }}>Sign in</Link>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 48px', background: '#F6F6F6' }}>
        <h2 style={{
          textAlign: 'center', fontSize: 32, fontWeight: 800,
          letterSpacing: '-0.5px', marginBottom: 48,
        }}>Everything you need to get hired</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20, maxWidth: 1000, margin: '0 auto',
        }}>
          {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} style={{
              background: '#fff', borderRadius: 14, padding: '28px 24px',
              border: '1px solid #E4E4E4',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10, background: bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <Icon size={22} color={color} />
              </div>
              <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{title}</h3>
              <p style={{ fontSize: 13, color: '#6B6B6B', lineHeight: 1.6, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{
        textAlign: 'center', padding: '80px 24px',
        background: '#1A1A1A', color: '#fff',
      }}>
        <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 16 }}>
          Ready to take control of your job search?
        </h2>
        <p style={{ color: '#9B9B9B', fontSize: 16, marginBottom: 36 }}>
          Free to get started. No credit card required.
        </p>
        <Link href="/signup" style={{
          padding: '14px 36px', borderRadius: 10, fontWeight: 800, fontSize: 15,
          background: '#F5C535', color: '#1A1A1A', textDecoration: 'none',
        }}>Create your account</Link>
      </section>

      {/* Footer */}
      <footer style={{
        textAlign: 'center', padding: '24px', borderTop: '1px solid #E4E4E4',
        fontSize: 13, color: '#9B9B9B',
      }}>
        © {new Date().getFullYear()} TaelaAI. All rights reserved.
      </footer>
    </div>
  );
}
