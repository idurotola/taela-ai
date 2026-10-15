'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

interface ResetPasswordFormProps {
  token?: string;
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password !== confirmPassword) {
      setError('Passwords don’t match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push('/signin'), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#F5EFE8', fontFamily: 'Nunito, sans-serif', padding: 24,
    }}>
      <Link href="/" style={{
        fontWeight: 800, fontSize: 24, letterSpacing: '-0.5px',
        textDecoration: 'none', color: '#1E4845', marginBottom: 32,
      }}>
        Taela<span style={{ color: '#F5C535' }}>AI</span>
      </Link>

      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 36px',
        border: '1px solid #E4E4E4', width: '100%', maxWidth: 420,
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        {!token ? (
          <>
            <h1 style={{ fontWeight: 800, fontSize: 24, marginBottom: 6, letterSpacing: '-0.5px' }}>
              Invalid reset link
            </h1>
            <p style={{ color: '#6B6B6B', fontSize: 14, marginBottom: 0, lineHeight: 1.5 }}>
              This password reset link is missing or malformed. Request a new one below.
            </p>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#6B6B6B', marginTop: 24, marginBottom: 0 }}>
              <Link href="/forgot-password" style={{ fontWeight: 700, color: '#1E4845' }}>Request a new link</Link>
            </p>
          </>
        ) : done ? (
          <>
            <h1 style={{ fontWeight: 800, fontSize: 24, marginBottom: 6, letterSpacing: '-0.5px' }}>
              Password updated
            </h1>
            <p style={{ color: '#6B6B6B', fontSize: 14, marginBottom: 0, lineHeight: 1.5 }}>
              Taking you to sign in…
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontWeight: 800, fontSize: 24, marginBottom: 6, letterSpacing: '-0.5px' }}>
              Choose a new password
            </h1>
            <p style={{ color: '#6B6B6B', fontSize: 14, marginBottom: 28 }}>
              Make it something you haven&apos;t used before
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 6 }}>
                  New password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 6 }}>
                  Confirm new password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  style={inputStyle}
                />
              </div>

              {error && (
                <div style={{ fontSize: 13, color: '#BA1F4F', background: '#FEE8EF', borderRadius: 8, padding: '8px 12px' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                marginTop: 8, padding: '12px', borderRadius: 10, fontWeight: 800,
                fontSize: 15, background: '#1E4845', color: '#fff',
                border: 'none', cursor: loading ? 'default' : 'pointer', fontFamily: 'Nunito, sans-serif',
                boxShadow: '0 4px 16px rgba(30,72,69,0.28)', opacity: loading ? 0.7 : 1,
              }}>
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#6B6B6B', marginTop: 24 }}>
              <Link href="/signin" style={{ fontWeight: 700, color: '#1E4845' }}>Back to sign in</Link>
            </p>
          </>
        )}
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
