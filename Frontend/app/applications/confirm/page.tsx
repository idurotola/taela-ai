'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api, ApiError, setToken } from '@/lib/api';
import type { GuestConfirmResult } from '@/types';

// Reads ?token= on the client only, so no Suspense boundary is needed.
export default function ConfirmApplicationPage() {
  const [state, setState] = useState<'working' | 'done' | 'error'>('working');
  const [result, setResult] = useState<GuestConfirmResult | null>(null);
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    // Single-use token: guard against React strict-mode's double effect run.
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.search).get('token');
    const run = token ? api.confirmGuestApplication(token) : Promise.reject(new ApiError(400, 'This link is missing its code.'));
    run
      .then((res) => {
        setToken(res.token);
        setResult(res);
        setState('done');
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
        setState('error');
      });
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5EFE8', fontFamily: 'Nunito, sans-serif', padding: 24 }}>
      <div style={{ background: '#fff', border: '1px solid #E4E4E4', borderRadius: 16, padding: '36px 32px', maxWidth: 440, width: '100%', textAlign: 'center' }}>
        {state === 'working' && <p style={{ color: '#6B6B6B' }}>Confirming your application…</p>}
        {state === 'error' && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>We couldn&rsquo;t confirm that</h1>
            <p style={{ color: '#6B6B6B', fontSize: 14, margin: '0 0 20px' }}>{error}</p>
            <Link href="/" style={{ color: '#2878B5', fontWeight: 700 }}>Back to TaelaAI</Link>
          </>
        )}
        {state === 'done' && result && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>
              {result.alreadySent ? 'You’ve already applied' : 'Application sent'}
            </h1>
            <p style={{ color: '#444', fontSize: 14, lineHeight: 1.6, margin: '0 0 8px' }}>
              {result.alreadySent
                ? `We already have your application for ${result.jobTitle} at ${result.company}.`
                : `Your application for ${result.jobTitle} at ${result.company} has been delivered.`}
            </p>
            {result.newAccount && (
              <p style={{ color: '#6B6B6B', fontSize: 13, lineHeight: 1.5, margin: '0 0 8px' }}>
                We created a free account for you so you can follow its progress.{' '}
                <Link href="/forgot-password" style={{ color: '#2878B5' }}>Set a password</Link> to sign in later.
              </p>
            )}
            <Link href="/dashboard" style={{ display: 'inline-block', marginTop: 12, padding: '10px 18px', borderRadius: 8, background: '#F5C535', color: '#1A1A1A', fontWeight: 800, textDecoration: 'none' }}>
              Go to my applications
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
