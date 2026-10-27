'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SectionHeader from '@/components/ui/SectionHeader';
import { api, ApiError } from '@/lib/api';
import type { AutoApplyQueueItem, AutoApplyRule } from '@/types';

const INPUT: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1.5px solid #E4E4E4', borderRadius: 6,
  fontFamily: 'Nunito, sans-serif', fontSize: 13, color: '#1A1A1A', outline: 'none', background: '#fff',
};
const LABEL: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', display: 'block', marginBottom: 5,
};

const splitTerms = (s: string) => s.split(',').map((t) => t.trim()).filter(Boolean);

export default function AutoApplyView() {
  const [rule, setRule] = useState<AutoApplyRule | null>(null);
  const [roles, setRoles] = useState('');
  const [locations, setLocations] = useState('');
  const [queue, setQueue] = useState<AutoApplyQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.autoApplyRule(), api.autoApplyQueue()])
      .then(([r, q]) => {
        setRule(r);
        setRoles(r.roles.join(', '));
        setLocations(r.locations.join(', '));
        setQueue(q);
      })
      .catch(() => setError('Could not load your auto-apply settings.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 20, color: '#6B6B6B', fontSize: 13 }}>Loading…</div>;
  if (!rule) return <div style={{ padding: 20, color: '#BA1F4F', fontSize: 13 }}>{error || 'Something went wrong.'}</div>;

  const save = async (next: AutoApplyRule) => {
    setSaving(true);
    setError('');
    setNote('');
    try {
      const saved = await api.saveAutoApplyRule({ ...next, roles: splitTerms(roles), locations: splitTerms(locations) });
      setRule(saved);
      setNote(saved.enabled ? 'Saved. We’ll look for matches every few minutes.' : 'Saved. Auto-apply is off.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const runNow = async () => {
    setRunning(true);
    setError('');
    setNote('');
    try {
      const res = await api.runAutoApply();
      setQueue(await api.autoApplyQueue());
      const parts = [
        `${res.considered} new job${res.considered === 1 ? '' : 's'} checked`,
        res.queued ? `${res.queued} waiting for your approval` : '',
        res.autoApplied ? `${res.autoApplied} applied automatically` : '',
        res.belowMinimum ? `${res.belowMinimum} below your minimum fit` : '',
        res.budgetSpent ? 'stopped early — you’ve used today’s AI allowance' : '',
      ].filter(Boolean);
      setNote(parts.join(' · ') + '.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not check for matches.');
    } finally {
      setRunning(false);
    }
  };

  const decide = async (item: AutoApplyQueueItem, action: 'approve' | 'skip') => {
    setBusyId(item.id);
    setError('');
    try {
      await (action === 'approve' ? api.approveAutoApply(item.id) : api.skipAutoApply(item.id));
      setQueue((q) => q.filter((x) => x.id !== item.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not complete that.');
      setQueue(await api.autoApplyQueue().catch(() => queue));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 820 }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
          <SectionHeader title="Auto-Apply" style={{ marginBottom: 0 }} />
          <button
            role="switch"
            aria-checked={rule.enabled}
            onClick={() => save({ ...rule, enabled: !rule.enabled })}
            disabled={saving}
            style={{
              padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12,
              fontFamily: 'Nunito, sans-serif', background: rule.enabled ? '#B3E8DC' : '#F0F0F0', color: rule.enabled ? '#1F7D65' : '#6B6B6B',
            }}
          >
            {rule.enabled ? 'ON' : 'OFF'}
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: '#6B6B6B', lineHeight: 1.55, margin: '0 0 14px' }}>
          Tell us what you&rsquo;re looking for and we&rsquo;ll watch new jobs posted on Taela, score each against your CV, and
          either line up the good ones for your approval or apply for you. Jobs on other sites can&rsquo;t be applied
          for automatically — use <strong>CV &amp; apply</strong> in Job Search for those. Each check uses part of your daily AI allowance.
        </p>

        <div className="cv-fields" style={{ marginBottom: 12 }}>
          <div>
            <label style={LABEL}>Job titles containing (comma separated)</label>
            <input value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="engineer, developer" style={INPUT} />
          </div>
          <div>
            <label style={LABEL}>Locations containing (comma separated)</label>
            <input value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="Lagos, Remote" style={INPUT} />
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: '#999', margin: '-4px 0 12px' }}>Leave blank to consider any title or location.</div>

        <label style={LABEL}>Minimum fit: {rule.minScore}/100</label>
        <input
          type="range" min={50} max={95} step={5} value={rule.minScore}
          onChange={(e) => setRule({ ...rule, minScore: Number(e.target.value) })}
          aria-label="Minimum fit score" style={{ width: '100%', marginBottom: 14 }}
        />

        <label style={LABEL}>When a job fits</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          <Choice checked={rule.mode === 'review'} onSelect={() => setRule({ ...rule, mode: 'review' })}
            title="Ask me first (recommended)" body="Matches wait here for you to approve or skip. Nothing is sent until you say so." />
          <Choice checked={rule.mode === 'auto'} onSelect={() => setRule({ ...rule, mode: 'auto' })}
            title="Apply automatically"
            body="We send your saved CV right away, with no cover letter. Matches over your daily limit still wait for approval." />
        </div>

        {rule.mode === 'auto' && (
          <div style={{ marginBottom: 14, maxWidth: 220 }}>
            <label style={LABEL}>Automatic applications per day</label>
            <input type="number" min={1} max={10} value={rule.maxPerDay}
              onChange={(e) => setRule({ ...rule, maxPerDay: Math.min(10, Math.max(1, Number(e.target.value) || 1)) })} style={INPUT} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Button variant="primary" disabled={saving} onClick={() => save(rule)}>{saving ? 'Saving…' : 'Save settings'}</Button>
          {rule.enabled && <Button variant="outline" disabled={running} onClick={runNow}>{running ? 'Checking…' : 'Check for matches now'}</Button>}
        </div>
        {error && <div style={{ fontSize: 12.5, color: '#BA1F4F', background: '#FEE8EF', borderRadius: 8, padding: '8px 12px', marginTop: 12 }}>{error}</div>}
        {note && <div style={{ fontSize: 12.5, color: '#1F7D65', marginTop: 12 }}>{note}</div>}
      </Card>

      <Card>
        <SectionHeader title={`Waiting for your approval${queue.length ? ` (${queue.length})` : ''}`} />
        {queue.length === 0 && (
          <div style={{ fontSize: 13, color: '#6B6B6B' }}>
            {rule.enabled ? 'No matches waiting. New ones appear here as jobs are posted.' : 'Turn auto-apply on to start getting matches.'}
          </div>
        )}
        {queue.map((item) => (
          <div key={item.id} style={{ borderTop: '1px solid #F0F0F0', padding: '12px 0', display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{item.job.title}</div>
              <div style={{ fontSize: 12, color: '#6B6B6B' }}>{item.job.company}{item.job.location && ` · ${item.job.location}`}</div>
              {item.summary && <div style={{ fontSize: 12.5, color: '#444', marginTop: 6, lineHeight: 1.5 }}>{item.summary}</div>}
              <a href={`/jobs/${item.job.slug}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 700, color: '#2878B5', textDecoration: 'none' }}>
                View job &amp; tailor your CV
              </a>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: item.score >= 75 ? '#2EAA8A' : '#C99A12' }}>{item.score}<span style={{ fontSize: 11, color: '#999' }}>/100</span></div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <Button size="sm" variant="primary" disabled={busyId === item.id} onClick={() => decide(item, 'approve')}>Apply</Button>
                <Button size="sm" variant="outline" disabled={busyId === item.id} onClick={() => decide(item, 'skip')}>Skip</Button>
              </div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function Choice({ checked, onSelect, title, body }: { checked: boolean; onSelect: () => void; title: string; body: string }) {
  return (
    <label style={{
      display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
      border: checked ? '1.5px solid #2EAA8A' : '1.5px solid #E4E4E4', background: checked ? '#F2FBF8' : '#fff',
    }}>
      <input type="radio" checked={checked} onChange={onSelect} style={{ marginTop: 3 }} />
      <span>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 800 }}>{title}</span>
        <span style={{ display: 'block', fontSize: 12, color: '#6B6B6B', lineHeight: 1.5 }}>{body}</span>
      </span>
    </label>
  );
}
