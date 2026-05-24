'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import SectionHeader from '@/components/ui/SectionHeader';
import { ATS_CHECKS, KEYWORD_SUGGESTIONS } from '@/lib/mock-data';
import { Check, AlertTriangle, X, Wand2, Download, Plus } from 'lucide-react';

const STATUS_ICON = {
  ok:   <Check size={14} color="#2EAA8A" />,
  warn: <AlertTriangle size={14} color="#F5C535" />,
  bad:  <X size={14} color="#E83567" />,
};

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

export default function CVBuilderView() {
  const [score, setScore] = useState(84);
  const [tailorMode, setTailorMode] = useState(true);
  const [jobDesc, setJobDesc] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setScore(Math.min(98, score + Math.floor(Math.random() * 8) + 4));
      setAnalyzing(false);
    }, 1800);
  };

  const scoreColor = score >= 90 ? '#2EAA8A' : score >= 75 ? '#F5C535' : '#E83567';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left — Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card>
            <SectionHeader tag="Feature 01" title="Personal Information" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Full Name', val: 'Amara Osei', type: 'text' },
                { label: 'Job Title', val: 'Product Manager', type: 'text' },
                { label: 'Email', val: 'amara@email.com', type: 'email' },
                { label: 'Location', val: 'Lagos, Nigeria', type: 'text' },
                { label: 'Phone', val: '+234 801 234 5678', type: 'tel' },
                { label: 'LinkedIn', val: 'linkedin.com/in/amaraosei', type: 'text' },
              ].map((f) => (
                <div key={f.label}>
                  <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', display: 'block', marginBottom: 5 }}>
                    {f.label}
                  </label>
                  <input defaultValue={f.val} type={f.type} style={INPUT_STYLE} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', display: 'block', marginBottom: 5 }}>
                Professional Summary
              </label>
              <textarea
                defaultValue="Results-driven Product Manager with 5+ years of experience building and scaling digital products across fintech and e-commerce in West Africa. Proven ability to lead cross-functional teams and deliver measurable user growth."
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
                onClick={() => setTailorMode(!tailorMode)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  background: tailorMode ? '#B3E8DC' : '#F0F0F0',
                  color: tailorMode ? '#1F7D65' : '#6B6B6B',
                  border: 'none',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'Nunito, sans-serif',
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: tailorMode ? '#2EAA8A' : '#ccc', display: 'block' }} />
                Auto-tailor {tailorMode ? 'ON' : 'OFF'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', display: 'block', marginBottom: 5 }}>
                  Role Applying For
                </label>
                <input defaultValue="Senior Product Manager" style={INPUT_STYLE} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', display: 'block', marginBottom: 5 }}>
                  Company
                </label>
                <input defaultValue="Paystack" style={INPUT_STYLE} />
              </div>
            </div>
            <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#6B6B6B', display: 'block', marginBottom: 5 }}>
              Job Description (paste to optimise)
            </label>
            <textarea
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
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
              <Button size="sm" variant="outline" icon={<Plus size={12} />}>Add</Button>
            </div>
            {[
              { role: 'Senior Product Manager', co: 'Carbon', dates: 'Jan 2022 – Present', bullets: ['Led 0→1 launch of Carbon Score, driving 40% user activation', 'Managed 3 PMs and 8 engineers across 2 squads'] },
              { role: 'Product Manager', co: 'Interswitch', dates: 'Mar 2019 – Dec 2021', bullets: ['Grew Quickteller transaction volume by 62% YoY', 'Launched card tokenisation feature across 4 African markets'] },
            ].map((exp) => (
              <div key={exp.co} style={{ borderBottom: '1px solid #F0F0F0', paddingBottom: 12, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>{exp.role}</div>
                    <div style={{ fontSize: 12, color: '#6B6B6B' }}>{exp.co}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#6B6B6B', textAlign: 'right' }}>{exp.dates}</div>
                </div>
                <ul style={{ paddingLeft: 14, margin: 0 }}>
                  {exp.bullets.map((b) => (
                    <li key={b} style={{ fontSize: 12, color: '#1A1A1A', marginBottom: 2 }}>{b}</li>
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

            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {ATS_CHECKS.map((check) => (
                <li
                  key={check.label}
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
          </Card>

          <Card>
            <SectionHeader title="Keyword Suggestions" />
            <p style={{ fontSize: 12, color: '#6B6B6B', marginBottom: 10 }}>Add these to improve your ATS score:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {KEYWORD_SUGGESTIONS.map((kw, i) => (
                <Tag
                  key={kw}
                  variant={['teal', 'teal', 'yellow', 'yellow', 'grey', 'grey', 'pink', 'blue', 'teal', 'yellow'][i] as any}
                >
                  {kw}
                </Tag>
              ))}
            </div>
            <Button variant="primary" fullWidth icon={<Wand2 size={13} />}>
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
