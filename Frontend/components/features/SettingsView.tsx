'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SectionHeader from '@/components/ui/SectionHeader';
import { api, ApiError } from '@/lib/api';
import { User, UserSettings } from '@/types';

const INPUT_STYLE = {
  width: '100%',
  padding: '9px 12px',
  border: '1.5px solid #E4E4E4',
  borderRadius: 6,
  fontFamily: 'Nunito, sans-serif',
  fontSize: 13,
  color: '#1A1A1A',
  outline: 'none',
  background: '#fff',
};

const LABEL_STYLE = {
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: 1,
  color: '#6B6B6B',
  display: 'block',
  marginBottom: 5,
};

const TOGGLES: { key: keyof UserSettings; label: string; description: string }[] = [
  { key: 'jobMatchAlerts', label: 'Job match alerts', description: 'Get notified when a new role matches your profile.' },
  { key: 'applicationUpdates', label: 'Application updates', description: 'Status changes on applications you’ve submitted.' },
  { key: 'weeklyDigest', label: 'Weekly digest', description: 'A weekly summary of your job search activity.' },
  { key: 'networkSuggestions', label: 'Network suggestions', description: 'Suggested contacts who could refer you.' },
];

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 40,
        height: 22,
        borderRadius: 20,
        border: 'none',
        cursor: 'pointer',
        background: on ? '#2EAA8A' : '#E4E4E4',
        position: 'relative',
        transition: 'background 0.15s',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.15s',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}

interface SettingsViewProps {
  user: User | null;
  onUserUpdate: (user: User) => void;
}

export default function SettingsView({ user, onUserUpdate }: SettingsViewProps) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountMsg, setAccountMsg] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');

  const [savingToggle, setSavingToggle] = useState<keyof UserSettings | null>(null);

  useEffect(() => {
    api.settings()
      .then(setSettings)
      .catch(() => setError('Could not load your settings right now.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveAccount = async () => {
    setSavingAccount(true);
    setAccountMsg('');
    try {
      const updated = await api.updateAccount({ name, email });
      onUserUpdate(updated);
      setAccountMsg('Saved.');
    } catch (err) {
      setAccountMsg(err instanceof ApiError ? err.message : 'Failed to save account.');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleSavePassword = async () => {
    setPasswordMsg('');
    if (newPassword.length < 8) {
      setPasswordMsg('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg('New password and confirmation do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await api.updatePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg('Password updated.');
    } catch (err) {
      setPasswordMsg(err instanceof ApiError ? err.message : 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleToggle = async (key: keyof UserSettings) => {
    if (!settings) return;
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setSavingToggle(key);
    try {
      const saved = await api.updateSettings({ [key]: next[key] });
      setSettings(saved);
    } catch (err) {
      setSettings(settings);
      setError(err instanceof ApiError ? err.message : 'Failed to save preference.');
    } finally {
      setSavingToggle(null);
    }
  };

  return (
    <div>
      <div className="cv-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card>
            <SectionHeader title="Account" style={{ marginBottom: 10 }} />
            <div className="cv-fields">
              <div>
                <label style={LABEL_STYLE}>Full Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} style={INPUT_STYLE} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={INPUT_STYLE} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <Button variant="outline" size="sm" onClick={handleSaveAccount} disabled={savingAccount}>
                {savingAccount ? 'Saving…' : 'Save'}
              </Button>
              {accountMsg && <span style={{ fontSize: 12, color: '#6B6B6B' }}>{accountMsg}</span>}
            </div>
          </Card>

          <Card>
            <SectionHeader title="Change Password" style={{ marginBottom: 10 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={LABEL_STYLE}>Current Password</label>
                <input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type="password" style={INPUT_STYLE} />
              </div>
              <div>
                <label style={LABEL_STYLE}>New Password</label>
                <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" style={INPUT_STYLE} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Confirm New Password</label>
                <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" style={INPUT_STYLE} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <Button variant="outline" size="sm" onClick={handleSavePassword} disabled={savingPassword}>
                {savingPassword ? 'Updating…' : 'Update Password'}
              </Button>
              {passwordMsg && <span style={{ fontSize: 12, color: '#6B6B6B' }}>{passwordMsg}</span>}
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card>
            <SectionHeader title="Notifications" style={{ marginBottom: 10 }} />
            {loading && <div style={{ fontSize: 12, color: '#6B6B6B' }}>Loading…</div>}
            {error && <div style={{ fontSize: 12, color: '#BA1F4F', marginBottom: 8 }}>{error}</div>}
            {settings && TOGGLES.map((t) => (
              <div
                key={t.key}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 12, padding: '10px 0', borderBottom: '1px solid #F0F0F0',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: '#6B6B6B', marginTop: 2 }}>{t.description}</div>
                </div>
                <Toggle on={settings[t.key]} onClick={() => handleToggle(t.key)} />
              </div>
            ))}
            {savingToggle && <div style={{ fontSize: 11, color: '#6B6B6B', marginTop: 8 }}>Saving…</div>}
          </Card>
        </div>
      </div>
    </div>
  );
}
