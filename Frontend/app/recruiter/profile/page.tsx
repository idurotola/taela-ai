'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RecruiterKind } from '@/types';
import { api, getToken, clearToken, ApiError } from '@/lib/api';

export default function RecruiterProfilePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [type, setType] = useState<RecruiterKind | null>(null);
  const [specialty, setSpecialty] = useState('');
  const [bio, setBio] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [industry, setIndustry] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/signin');
      return;
    }
    api.recruiter.profile()
      .then((p) => {
        setType(p.type);
        setSpecialty(p.specialty || '');
        setBio(p.bio || '');
        setCompanyName(p.companyName || '');
        setCompanyWebsite(p.companyWebsite || '');
        setIndustry(p.industry || '');
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          router.replace('/signin');
        }
        // 404 just means the profile hasn't been completed yet — leave the form blank.
      })
      .finally(() => setChecking(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) {
      setError('Choose whether you’re an independent recruiter or an employer / HR team.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await api.recruiter.updateProfile({
        type,
        specialty: type === 'independent' ? specialty : undefined,
        bio: type === 'independent' ? bio : undefined,
        companyName: type === 'employer' ? companyName : undefined,
        companyWebsite: type === 'employer' ? companyWebsite : undefined,
        industry: type === 'employer' ? industry : undefined,
      });
      router.push('/recruiter/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Nunito, sans-serif', color: '#6B6B6B' }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#F5EFE8', fontFamily: 'Nunito, sans-serif', padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 36px',
        border: '1px solid #E4E4E4', width: '100%', maxWidth: 480,
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <h1 style={{ fontWeight: 800, fontSize: 24, marginBottom: 6, letterSpacing: '-0.5px' }}>
          Complete your recruiter profile
        </h1>
        <p style={{ color: '#6B6B6B', fontSize: 14, marginBottom: 24 }}>
          Tell us how you&apos;re hiring so we can tailor your dashboard.
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          {([
            { id: 'independent' as const, label: 'Independent recruiter', desc: 'I place candidates on behalf of clients.' },
            { id: 'employer' as const, label: 'Employer / HR', desc: 'I hire for my own company.' },
          ]).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setType(opt.id)}
              style={{
                flex: 1, textAlign: 'left', padding: '14px 16px', borderRadius: 10,
                border: type === opt.id ? '2px solid #1E4845' : '1.5px solid #E4E4E4',
                background: type === opt.id ? '#EFF6F5' : '#fff',
                cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{opt.label}</div>
              <div style={{ fontSize: 12, color: '#6B6B6B' }}>{opt.desc}</div>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {type === 'independent' && (
            <>
              <div>
                <label style={labelStyle}>Specialty</label>
                <input
                  type="text" required value={specialty}
                  onChange={e => setSpecialty(e.target.value)}
                  placeholder="e.g. Tech recruitment, Executive search"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Bio (optional)</label>
                <textarea
                  value={bio} onChange={e => setBio(e.target.value)}
                  placeholder="A short intro clients and candidates will see"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' as const }}
                />
              </div>
            </>
          )}

          {type === 'employer' && (
            <>
              <div>
                <label style={labelStyle}>Company name</label>
                <input
                  type="text" required value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Acme Inc."
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Company website (optional)</label>
                <input
                  type="text" value={companyWebsite}
                  onChange={e => setCompanyWebsite(e.target.value)}
                  placeholder="https://acme.com"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Industry (optional)</label>
                <input
                  type="text" value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  placeholder="e.g. Fintech"
                  style={inputStyle}
                />
              </div>
            </>
          )}

          {error && (
            <div style={{ fontSize: 13, color: '#BA1F4F', background: '#FEE8EF', borderRadius: 8, padding: '8px 12px' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={saving || !type} style={{
            marginTop: 8, padding: '12px', borderRadius: 10, fontWeight: 800,
            fontSize: 15, background: '#1E4845', color: '#fff',
            border: 'none', cursor: saving ? 'default' : 'pointer', fontFamily: 'Nunito, sans-serif',
            boxShadow: '0 4px 16px rgba(30,72,69,0.28)', opacity: saving || !type ? 0.6 : 1,
          }}>
            {saving ? 'Saving…' : 'Save and continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 6 };

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1.5px solid #E4E4E4', fontSize: 14,
  fontFamily: 'Nunito, sans-serif', outline: 'none',
  color: '#1A1A1A', background: '#fff',
};
