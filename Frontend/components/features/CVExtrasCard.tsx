'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import SectionHeader from '@/components/ui/SectionHeader';
import { api, ApiError } from '@/lib/api';
import { toContent } from '@/lib/cvContent';
import type { CV, CVEducation } from '@/types';

interface Props {
  cv: CV;
  onCvChange: (cv: CV) => void;
}

const INPUT: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1.5px solid #E4E4E4', borderRadius: 6,
  fontFamily: 'Nunito, sans-serif', fontSize: 13, color: '#1A1A1A', outline: 'none', background: '#fff',
};
const LABEL: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', display: 'block', marginBottom: 5,
};

/** Skills and education — the sections a CV needs that the builder lacked. */
export default function CVExtrasCard({ cv, onCvChange }: Props) {
  const [skills, setSkills] = useState((cv.skills ?? []).join(', '));
  const [education, setEducation] = useState<CVEducation[]>(cv.education ?? []);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const setEdu = (i: number, patch: Partial<CVEducation>) =>
    setEducation((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const updated = await api.saveCVContent({
        ...toContent(cv),
        skills: skills.split(/[,\n]/).map((s) => s.trim()).filter(Boolean),
        education: education.filter((e) => e.school.trim() || e.degree.trim()),
      });
      onCvChange(updated);
      setSkills((updated.skills ?? []).join(', '));
      setEducation(updated.education ?? []);
      setMsg({ ok: true, text: 'Saved.' });
    } catch (err) {
      setMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Could not save.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <SectionHeader title="Skills & Education" style={{ marginBottom: 0 }} />
        <Button size="sm" variant="outline" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </div>

      <label style={LABEL}>Skills (comma separated)</label>
      <textarea
        value={skills}
        onChange={(e) => setSkills(e.target.value)}
        rows={2}
        placeholder="Go, SQL, Stakeholder management"
        style={{ ...INPUT, resize: 'vertical', marginBottom: 14 }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <label style={{ ...LABEL, marginBottom: 0 }}>Education</label>
        <Button size="sm" variant="outline" icon={<Plus size={12} />} onClick={() => setEducation((r) => [...r, { school: '', degree: '', dates: '' }])}>
          Add
        </Button>
      </div>
      {education.length === 0 && <div style={{ fontSize: 12, color: '#6B6B6B' }}>No education added yet.</div>}
      {education.map((row, i) => (
        <div key={row.id ?? `new-${i}`} style={{ background: '#F6F6F6', borderRadius: 8, padding: 10, marginBottom: 8 }}>
          <div className="cv-fields" style={{ marginBottom: 8 }}>
            <input value={row.school} onChange={(e) => setEdu(i, { school: e.target.value })} placeholder="School / University" style={INPUT} aria-label="School" />
            <input value={row.degree} onChange={(e) => setEdu(i, { degree: e.target.value })} placeholder="Degree / Qualification" style={INPUT} aria-label="Degree" />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={row.dates} onChange={(e) => setEdu(i, { dates: e.target.value })} placeholder="2016 – 2019" style={INPUT} aria-label="Dates" />
            <button
              onClick={() => setEducation((r) => r.filter((_, idx) => idx !== i))}
              aria-label="Remove education"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#aaa' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      {msg && <div style={{ fontSize: 12, marginTop: 6, color: msg.ok ? '#1F7D65' : '#BA1F4F' }}>{msg.text}</div>}
    </Card>
  );
}
