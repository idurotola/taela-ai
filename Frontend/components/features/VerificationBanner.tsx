'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { api, ApiError } from '@/lib/api';
import type { RecruiterProfile } from '@/types';

interface Props {
  profile: RecruiterProfile;
  onStatusChange: (status: NonNullable<RecruiterProfile['verificationStatus']>) => void;
}

/**
 * Recruiters must be verified before publishing jobs. Employers prove a work
 * email on their company's domain; independents ask for manual approval.
 */
export default function VerificationBanner({ profile, onStatusChange }: Props) {
  const [workEmail, setWorkEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const status = profile.verificationStatus;
  if (status === 'verified' || status === '' || status === undefined) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api.recruiter.requestVerification(profile.type === 'employer' ? workEmail : undefined);
      setMessage(res.message ?? '');
      onStatusChange('pending');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start verification.');
    } finally {
      setBusy(false);
    }
  };

  const box: React.CSSProperties = { background: '#FEF3B0', border: '1px solid #F5C535', borderRadius: 12, padding: '16px 18px', marginBottom: 20, fontSize: 14, lineHeight: 1.5 };
  const independent = profile.type === 'independent';

  if (status === 'pending' && independent) {
    return <div style={box}><strong>Awaiting approval.</strong> {message || 'Our team is reviewing your account and will email you when you can post jobs.'}</div>;
  }

  return (
    <div style={box}>
      <strong>Verify {independent ? 'your account' : profile.companyName || 'your company'} to post jobs.</strong>{' '}
      {status === 'pending' ? (message || 'Check your inbox for the verification link, or send a new one below.') : independent
        ? 'We review independent recruiters before they can publish.'
        : `Enter an email address on your company's domain${profile.companyWebsite ? ` (${profile.companyWebsite.replace(/^https?:\/\//, '')})` : ''} and we'll send a link to confirm it.`}
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {!independent && (
          <input required type="email" value={workEmail} onChange={(e) => setWorkEmail(e.target.value)} placeholder="you@yourcompany.com" aria-label="Work email"
            style={{ padding: '9px 12px', border: '1.5px solid #E4E4E4', borderRadius: 6, fontFamily: 'Nunito, sans-serif', fontSize: 13, minWidth: 240, background: '#fff' }} />
        )}
        <Button type="submit" variant="primary" size="sm" disabled={busy}>
          {busy ? 'Sending…' : independent ? 'Request approval' : status === 'pending' ? 'Resend link' : 'Send verification link'}
        </Button>
      </form>
      {error && <div style={{ color: '#BA1F4F', fontSize: 13, marginTop: 8 }}>{error}</div>}
    </div>
  );
}
