'use client';

import { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tag, { TagVariant } from '@/components/ui/Tag';
import SectionHeader from '@/components/ui/SectionHeader';
import { api, ApiError } from '@/lib/api';
import { CV } from '@/types';
import { Check, AlertTriangle, X, Wand2, Download, Plus } from 'lucide-react';

const STATUS_ICON = {
  ok:   <Check size={14} color="#2EAA8A" />,
  warn: <AlertTriangle size={14} color="#F5C535" />,
  bad:  <X size={14} color="#E83567" />,
};

const TAG_CYCLE: TagVariant[] = ['teal', 'teal', 'yellow', 'yellow', 'grey', 'grey', 'pink', 'blue', 'teal', 'yellow'];

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

type FieldKey = 'fullName' | 'jobTitle' | 'email' | 'location' | 'phone' | 'linkedin';

const PERSONAL_FIELDS: { key: FieldKey; label: string; type: string }[] = [
  { key: 'fullName', label: 'Full Name', type: 'text' },
  { key: 'jobTitle', label: 'Job Title', type: 'text' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'tel' },
  { key: 'linkedin', label: 'LinkedIn', type: 'text' },
];

export default function CVBuilderView() {
  const [cv, setCv] = useState<CV | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [addingExp, setAddingExp] = useState(false);

  useEffect(() => {
    Promise.all([api.cv(), api.keywords()])
      .then(([cvData, kw]) => {
        setCv(cvData);
        setKeywords(kw);
      })
      .catch(() => setError('Could not load your CV right now.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 20, color: '#6B6B6B', fontSize: 13 }}>Loading your CV…</div>;
  if (error || !cv) return <div style={{ padding: 20, color: '#BA1F4F', fontSize: 13 }}>{error || 'Something went wrong.'}</div>;

  const setField = <K extends keyof CV>(key: K, value: CV[K]) => setCv(prev => prev ? { ...prev, [key]: value } : prev);

  const persist = async (patch: Partial<CV>) => {
    setSaving(true);
    try {
      const updated = await api.updateCV(patch);
      setCv(prev => prev ? { ...prev, ...updated } : updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = () => persist({
    fullName: cv.fullName, jobTitle: cv.jobTitle, email: cv.email, location: cv.location,
    phone: cv.phone, linkedin: cv.linkedin, summary: cv.summary,
  });

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      // Persist the latest tailoring inputs so the server scores against them.
      await api.updateCV({
        summary: cv.summary, targetRole: cv.targetRole, targetCompany: cv.targetCompany,
        jobDescription: cv.jobDescription, autoTailor: cv.autoTailor,
      });
      const analyzed = await api.analyzeCV();
      setCv(analyzed);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to analyze CV.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddExperience = async () => {
    const role = window.prompt('Role title?');
    if (!role) return;
    const company = window.prompt('Company?');
    if (!company) return;
    const dates = window.prompt('Dates (e.g. "Jan 2022 – Present")?') || '';
    const bulletsRaw = window.prompt('Achievements, separated by "|"?') || '';
    const bullets = bulletsRaw.split('|').map(b => b.trim()).filter(Boolean);

    setAddingExp(true);
    try {
      const exp = await api.addCVExperience({ role, company, dates, bullets });
      setCv(prev => prev ? { ...prev, experiences: [...prev.experiences, exp] } : prev);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add experience.');
    } finally {
      setAddingExp(false);
    }
  };

  const handleAutoAddKeywords = () => {
    const missing = keywords.filter(kw => !cv.jobDescription.toLowerCase().includes(kw.toLowerCase()));
    if (missing.length === 0) return;
    setField('jobDescription', [cv.jobDescription, missing.join(', ')].filter(Boolean).join('\n'));
  };

  const score = cv.score;
  const scoreColor = score >= 90 ? '#2EAA8A' : score >= 75 ? '#F5C535' : '#E83567';

  return (
    <div>
      <div className="cv-grid">
        {/* Left — Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <SectionHeader title="Personal Information" style={{ marginBottom: 0 }} />
              <Button size="sm" variant="outline" onClick={handleSaveProfile} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
            <div className="cv-fields">
              {PERSONAL_FIELDS.map((f) => (
                <div key={f.key}>
                  <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', display: 'block', marginBottom: 5 }}>
                    {f.label}
                  </label>
                  <input
                    value={cv[f.key] as string}
                    onChange={(e) => setField(f.key, e.target.value)}
                    type={f.type}
                    style={INPUT_STYLE}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', display: 'block', marginBottom: 5 }}>
                Professional Summary
              </label>
              <textarea
                value={cv.summary}
                onChange={(e) => setField('summary', e.target.value)}
                style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 80 }}
              />
            </div>
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#6B6B6B', fontWeight: 700, marginBottom: 3 }}>AI Feature</div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>Auto-Tailor for Role</div>
              </div>
              <button
                onClick={() => setField('autoTailor', !cv.autoTailor)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  background: cv.autoTailor ? '#B3E8DC' : '#F0F0F0',
                  color: cv.autoTailor ? '#1F7D65' : '#6B6B6B',
                  border: 'none',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'Nunito, sans-serif',
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: cv.autoTailor ? '#2EAA8A' : '#ccc', display: 'block' }} />
                Auto-tailor {cv.autoTailor ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="cv-fields" style={{ marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', display: 'block', marginBottom: 5 }}>
                  Role Applying For
                </label>
                <input value={cv.targetRole} onChange={(e) => setField('targetRole', e.target.value)} style={INPUT_STYLE} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', display: 'block', marginBottom: 5 }}>
                  Company
                </label>
                <input value={cv.targetCompany} onChange={(e) => setField('targetCompany', e.target.value)} style={INPUT_STYLE} />
              </div>
            </div>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', display: 'block', marginBottom: 5 }}>
              Job Description (paste to optimise)
            </label>
            <textarea
              value={cv.jobDescription}
              onChange={(e) => setField('jobDescription', e.target.value)}
              placeholder="Paste the job description here to automatically optimise your CV keywords and summary…"
              style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 70, marginBottom: 10 }}
            />
            <Button
              variant="teal"
              fullWidth
              icon={<Wand2 size={14} />}
              onClick={handleAnalyze}
              disabled={analyzing}
            >
              {analyzing ? 'Analysing…' : 'AI Tailor This CV'}
            </Button>
          </Card>

          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <SectionHeader title="Work Experience" style={{ marginBottom: 0 }} />
              <Button size="sm" variant="outline" icon={<Plus size={12} />} onClick={handleAddExperience} disabled={addingExp}>Add</Button>
            </div>
            {cv.experiences.length === 0 && (
              <div style={{ fontSize: 12, color: '#6B6B6B' }}>No experience added yet — click &quot;Add&quot; to build your work history.</div>
            )}
            {cv.experiences.map((exp) => (
              <div key={exp.id} style={{ borderBottom: '1px solid #F0F0F0', paddingBottom: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>{exp.role}</div>
                    <div style={{ fontSize: 12, color: '#6B6B6B' }}>{exp.company}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#6B6B6B', textAlign: 'right' }}>{exp.dates}</div>
                </div>
                <ul style={{ paddingLeft: 14, margin: 0 }}>
                  {exp.bullets.map((b, i) => (
                    <li key={i} style={{ fontSize: 12, color: '#1A1A1A', marginBottom: 2 }}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </Card>
        </div>

        {/* Right — Score + Keywords */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card>
            <SectionHeader title="ATS Score" />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px 20px',
                background: '#F6F6F6',
                borderRadius: 10,
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 56, fontWeight: 800, color: scoreColor, lineHeight: 1, transition: 'color 0.3s' }}>
                {score}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', marginTop: 6 }}>
                ATS Compatibility Score
              </div>
              <div style={{ width: '100%', maxWidth: 200, height: 6, background: '#E4E4E4', borderRadius: 20, marginTop: 12, overflow: 'hidden' }}>
                <div style={{ width: `${score}%`, height: '100%', background: scoreColor, borderRadius: 20, transition: 'width 0.5s ease' }} />
              </div>
            </div>

            {cv.atsChecks.length === 0 ? (
              <div style={{ fontSize: 12, color: '#6B6B6B' }}>Run &quot;AI Tailor This CV&quot; to generate your ATS checklist.</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {cv.atsChecks.map((check) => (
                  <li
                    key={check.id || check.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '7px 0',
                      borderBottom: '1px solid #F0F0F0',
                      fontSize: 13,
                    }}
                  >
                    {STATUS_ICON[check.status]}
                    {check.label}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <SectionHeader title="Keyword Suggestions" />
            <p style={{ fontSize: 12, color: '#6B6B6B', marginBottom: 10 }}>Add these to improve your ATS score:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {keywords.map((kw, i) => (
                <Tag key={kw} variant={TAG_CYCLE[i % TAG_CYCLE.length]}>
                  {kw}
                </Tag>
              ))}
            </div>
            <Button variant="primary" fullWidth icon={<Wand2 size={13} />} onClick={handleAutoAddKeywords}>
              Auto-add Missing Keywords
            </Button>
          </Card>

          <Card>
            <SectionHeader title="Export & Download" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button variant="teal" fullWidth icon={<Download size={14} />}>
                Download ATS-Optimised PDF
              </Button>
              <Button variant="outline" fullWidth icon={<Download size={14} />}>
                Download Word (.docx)
              </Button>
              <Button variant="outline" fullWidth>
                Copy to Clipboard
              </Button>
            </div>
            <p style={{ fontSize: 11, color: '#6B6B6B', marginTop: 10, lineHeight: 1.5 }}>
              Your CV is automatically tailored for each application. Each download creates a unique version.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
