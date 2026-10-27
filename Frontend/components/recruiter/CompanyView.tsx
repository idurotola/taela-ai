'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { api, ApiError } from '@/lib/api';
import { GREY } from '@/lib/recruiter';
import type { RecruiterProfile } from '@/types';

const field: React.CSSProperties = {
  width: '100%', padding: '10px 12px', border: '1.5px solid #E4E4E4', borderRadius: 8,
  fontFamily: 'Nunito, sans-serif', fontSize: 14, color: '#1A1A1A', background: '#fff', outline: 'none',
};
const label: React.CSSProperties = { fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: GREY, display: 'block', marginBottom: 5 };

const STATUS: Record<string, { text: string; bg: string; color: string }> = {
  verified: { text: 'Verified', bg: '#E6F7F3', color: '#1F7D65' },
  pending: { text: 'Pending', bg: '#FEF3B0', color: '#977411' },
  unverified: { text: 'Not verified', bg: '#FEE8EF', color: '#BA1F4F' },
};

export default function CompanyView({ profile, onSaved }: { profile: RecruiterProfile; onSaved: (p: RecruiterProfile) => void }) {
  const employer = profile.type === 'employer';
  const [specialty, setSpecialty] = useState(profile.specialty ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [companyName, setCompanyName] = useState(profile.companyName ?? '');
  const [companyWebsite, setCompanyWebsite] = useState(profile.companyWebsite ?? '');
  const [industry, setIndustry] = useState(profile.industry ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const status = STATUS[profile.verificationStatus || 'verified'] ?? STATUS.verified;
  const identityChanged = employer && (companyName !== (profile.companyName ?? '') || companyWebsite !== (profile.companyWebsite ?? ''));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const saved = await api.recruiter.updateProfile({
        type: profile.type,
        specialty: employer ? undefined : specialty, bio: employer ? undefined : bio,
        companyName: employer ? companyName : undefined, companyWebsite: employer ? companyWebsite : undefined, industry: employer ? industry : undefined,
      });
      onSaved(saved);
      setMsg({ ok: true, text: saved.verificationStatus === 'unverified' && profile.verificationStatus === 'verified' ? 'Saved. Because your company details changed, you need to verify again before posting.' : 'Saved.' });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Could not save.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{employer ? 'Employer / HR team' : 'Independent recruiter'}</div>
          <div style={{ fontSize: 12.5, color: GREY }}>Shown to candidates on your job postings.</div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, padding: '4px 12px', borderRadius: 20, background: status.bg, color: status.color }}>{status.text}</span>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {employer ? (
          <>
            <div><label style={label} htmlFor="co-name">Company name</label><input id="co-name" required value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={field} /></div>
            <div><label style={label} htmlFor="co-site">Website</label><input id="co-site" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="https://acme.com" style={field} /></div>
            <div><label style={label} htmlFor="co-ind">Industry</label><input id="co-ind" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Fintech" style={field} /></div>
          </>
        ) : (
          <>
            <div><label style={label} htmlFor="co-spec">Specialty</label><input id="co-spec" required value={specialty} onChange={(e) => setSpecialty(e.target.value)} style={field} /></div>
            <div><label style={label} htmlFor="co-bio">Bio</label><textarea id="co-bio" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} style={{ ...field, resize: 'vertical' }} /></div>
          </>
        )}
        {identityChanged && profile.verificationStatus === 'verified' && (
          <div style={{ fontSize: 12.5, color: '#977411', background: '#FEF3B0', borderRadius: 8, padding: '8px 12px' }}>
            Changing your company name or website means you&rsquo;ll need to verify again before posting new jobs.
          </div>
        )}
        {msg && <div style={{ fontSize: 13, color: msg.ok ? '#1F7D65' : '#BA1F4F' }}>{msg.text}</div>}
        <div><Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button></div>
      </form>
    </Card>
  );
}
