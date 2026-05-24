'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/dashboard');
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#F6F6F6', fontFamily: 'Nunito, sans-serif', padding: 24,
    }}>
      <Link href="/" style={{
        fontWeight: 800, fontSize: 24, letterSpacing: '-0.5px',
        textDecoration: 'none', color: '#1A1A1A', marginBottom: 32,
      }}>
        Taela<span style={{ color: '#F5C535' }}>AI</span>
      </Link>

      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 36px',
        border: '1px solid #E4E4E4', width: '100%', maxWidth: 420,
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <h1 style={{ fontWeight: 800, fontSize: 24, marginBottom: 6, letterSpacing: '-0.5px' }}>
          Welcome back
        </h1>
        <p style={{ color: '#6B6B6B', fontSize: 14, marginBottom: 28 }}>
          Sign in to your TaelaAI account
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          <button type="submit" style={{
            marginTop: 8, padding: '12px', borderRadius: 10, fontWeight: 800,
            fontSize: 15, background: '#F5C535', color: '#1A1A1A',
            border: 'none', cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
            boxShadow: '0 4px 16px rgba(245,197,53,0.35)',
          }}>
            Sign in
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#6B6B6B', marginTop: 24 }}>
          Don't have an account?{' '}
          <Link href="/signup" style={{ fontWeight: 700, color: '#1A1A1A' }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1.5px solid #E4E4E4', fontSize: 14,
  fontFamily: 'Nunito, sans-serif', outline: 'none',
  color: '#1A1A1A', background: '#fff',
};
