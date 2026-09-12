'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatCard from '@/components/ui/StatCard';
import SectionHeader from '@/components/ui/SectionHeader';
import { api } from '@/lib/api';
import { NetworkContact } from '@/types';
import { Send, UserPlus, Search } from 'lucide-react';

const FIT_STYLE = {
  high:   { bg: '#B3E8DC', color: '#1F7D65', label: 'High referral fit' },
  medium: { bg: '#BAD9F3', color: '#1A5C8E', label: 'Medium fit' },
  low:    { bg: '#F0F0F0', color: '#6B6B6B', label: 'Low fit' },
};

export default function NetworkView() {
  const [contacts, setContacts] = useState<NetworkContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.contacts()
      .then(setContacts)
      .catch(() => setError('Could not load your network right now.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company.toLowerCase().includes(search.toLowerCase())
  );

  const connectedCount = contacts.filter(c => c.connected).length;
  const highFitCount = contacts.filter(c => c.referralFit === 'high').length;

  const handleConnect = async (id: string) => {
    setConnecting(prev => new Set(prev).add(id));
    try {
      await api.connectContact(id);
      setContacts(prev => prev.map(c => c.id === id ? { ...c, connected: true } : c));
    } catch {
      // leave unconnected so the user can retry
    } finally {
      setConnecting(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  };

  if (loading) return <div style={{ padding: 20, color: '#6B6B6B', fontSize: 13 }}>Loading your network…</div>;
  if (error) return <div style={{ padding: 20, color: '#BA1F4F', fontSize: 13 }}>{error}</div>;

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <StatCard label="Suggested Contacts" value={contacts.length} trend="From your extended network" trendUp accent="yellow" />
        <StatCard label="Requests Sent" value={connectedCount} trend="Awaiting reply" trendUp accent="pink" />
        <StatCard label="High Referral Fit" value={highFitCount} trend="Strong intro candidates" trendUp accent="teal" />
        <StatCard label="Mutual Connections" value={contacts.reduce((s, c) => s + c.mutualConnections, 0)} trend="Across suggested contacts" trendUp accent="blue" />
      </div>

      {/* Search + header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: '#fff',
            border: '1px solid #E4E4E4',
            borderRadius: 8,
            padding: '8px 14px',
            flex: 1,
          }}
        >
          <Search size={14} color="#6B6B6B" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or company…"
            style={{
              border: 'none',
              background: 'transparent',
              fontFamily: 'Nunito, sans-serif',
              fontSize: 13,
              outline: 'none',
              flex: 1,
            }}
          />
        </div>
        <Button variant="primary" icon={<UserPlus size={14} />}>
          Find More Connections
        </Button>
      </div>

      <div style={{ fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#6B6B6B', fontWeight: 700, marginBottom: 12 }}>
        Suggested Connections
      </div>

      {/* Contact grid */}
      <div className="contact-grid">
        {filtered.length === 0 && (
          <div style={{ fontSize: 13, color: '#6B6B6B', padding: '20px 0', gridColumn: '1 / -1', textAlign: 'center' }}>No contacts match your search.</div>
        )}
        {filtered.map((contact: NetworkContact) => {
          const fit = FIT_STYLE[contact.referralFit];
          const isConnected = !!contact.connected;
          const isConnecting = connecting.has(contact.id);
          return (
            <div
              key={contact.id}
              style={{
                background: '#fff',
                borderRadius: 12,
                border: isConnected ? '1px solid #2EAA8A' : '1px solid #E4E4E4',
                padding: 18,
                textAlign: 'center',
                transition: 'border-color 0.15s',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: contact.avatarColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  fontSize: 16,
                  fontWeight: 800,
                  color: contact.avatarColor === '#F5C535' ? '#977411' : '#fff',
                }}
              >
                {contact.initials}
              </div>

              <div style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A' }}>{contact.name}</div>
              <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 2 }}>{contact.role}</div>
              <div style={{ fontSize: 12, color: '#2878B5', fontWeight: 700, marginTop: 2 }}>{contact.company}</div>

              <div style={{ fontSize: 11, color: '#6B6B6B', margin: '8px 0' }}>
                {contact.mutualConnections} mutual connection{contact.mutualConnections !== 1 ? 's' : ''}
              </div>

              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  background: fit.bg,
                  color: fit.color,
                  marginBottom: 12,
                }}
              >
                {fit.label}
              </span>

              {isConnected ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '8px',
                    background: '#E6F7F3',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#1F7D65',
                  }}
                >
                  ✓ Request Sent
                </div>
              ) : (
                <Button
                  variant={contact.referralFit === 'high' ? 'teal' : 'outline'}
                  fullWidth
                  icon={<Send size={13} />}
                  disabled={isConnecting}
                  onClick={() => handleConnect(contact.id)}
                >
                  {isConnecting ? 'Sending…' : 'Request Intro'}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Referral Tips */}
      <Card style={{ marginTop: 16 }}>
        <SectionHeader title="Referral Tips" />
        <div className="three-col">
          {[
            { tip: 'Personalise every message', detail: 'Mention a specific project, article, or shared connection in your outreach.', color: '#F5C535' },
            { tip: 'Follow up once', detail: 'If no reply in 7 days, a single polite follow-up doubles your response rate.', color: '#2EAA8A' },
            { tip: 'Give before you ask', detail: 'Share an insight or resource relevant to them before requesting anything.', color: '#2878B5' },
          ].map((t) => (
            <div key={t.tip} style={{ padding: '14px', background: '#F6F6F6', borderRadius: 10, borderTop: `3px solid ${t.color}` }}>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>{t.tip}</div>
              <div style={{ fontSize: 12, color: '#6B6B6B', lineHeight: 1.5 }}>{t.detail}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
