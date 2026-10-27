'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';

export default function VerifyRecruiterPage() {
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.search).get('token');
    const run = token ? api.recruiter.confirmVerification(token) : Promise.reject(new ApiError(400, 'This link is missing its code.'));
    run
      .then(() => setState('done'))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
        setState('error');
      });
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5EFE8', fontFamily: 'Nunito, sans-serif', padding: 24 }}>
      <div style={{ background: '#fff', border: '1px solid #E4E4E4', borderRadius: 16, padding: '36px 32px', maxWidth: 440, width: '100%', textAlign: 'center' }}>
        {state === 'working' && <p style={{ color: '#6B6B6B' }}>Verifying your company…</p>}
        {state === 'error' && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>Verification failed</h1>
            <p style={{ color: '#6B6B6B', fontSize: 14, margin: '0 0 20px' }}>{error}</p>
            <Link href="/recruiter/dashboard" style={{ color: '#2878B5', fontWeight: 700 }}>Back to dashboard</Link>
          </>
        )}
        {state === 'done' && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>You&rsquo;re verified</h1>
            <p style={{ color: '#444', fontSize: 14, margin: '0 0 16px' }}>You can now publish jobs on TaelaAI.</p>
            <Link href="/recruiter/dashboard" style={{ display: 'inline-block', padding: '10px 18px', borderRadius: 8, background: '#F5C535', color: '#1A1A1A', fontWeight: 800, textDecoration: 'none' }}>
              Go to dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
