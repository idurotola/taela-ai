'use client';

import { useRef, useState } from 'react';
import { Download, FileText, Trash2, Upload } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import SectionHeader from '@/components/ui/SectionHeader';
import { api, ApiError } from '@/lib/api';
import { formatBytes } from '@/lib/cvContent';
import type { CV, CVContent } from '@/types';

interface Props {
  cv: CV;
  onCvChange: (cv: CV) => void;
}

/**
 * Upload an existing CV (PDF or DOCX). The original file is stored so it can
 * be re-downloaded or sent with applications; if the server could read it,
 * the extracted details are shown for review and only replace the user's CV
 * when they accept.
 */
export default function CVUploadCard({ cv, onCvChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [parsed, setParsed] = useState<CVContent | null>(null);
  const [applying, setApplying] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setNote('');
    setParsed(null);
    if (file.size > 5 * 1024 * 1024) {
      setError('That file is over 5 MB. Please upload a smaller PDF or DOCX.');
      return;
    }
    setUploading(true);
    try {
      const res = await api.uploadCV(file);
      onCvChange(res.cv);
      setParsed(res.parsed);
      setNote(res.parseNote ?? '');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  };

  const accept = async () => {
    if (!parsed) return;
    setApplying(true);
    try {
      onCvChange(await api.saveCVContent(parsed));
      setParsed(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the details.');
    } finally {
      setApplying(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete the uploaded file? Your CV details below are kept.')) return;
    try {
      await api.deleteCVFile();
      onCvChange({ ...cv, sourceFileName: '', sourceFileSize: 0 });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the file.');
    }
  };

  return (
    <Card>
      <SectionHeader title="Upload your CV" />
      <p style={{ fontSize: 12, color: '#6B6B6B', margin: '0 0 12px', lineHeight: 1.5 }}>
        Already have a CV? Upload it as a PDF or Word file (up to 5 MB) and we&rsquo;ll read it into the
        sections below. You review everything before it&rsquo;s saved.
      </p>

      <input
        ref={input}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => handleFile(e.target.files?.[0])}
        style={{ display: 'none' }}
        aria-label="Upload CV file"
      />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button variant="primary" icon={<Upload size={13} />} disabled={uploading} onClick={() => input.current?.click()}>
          {uploading ? 'Reading your CV…' : cv.sourceFileName ? 'Replace file' : 'Upload CV'}
        </Button>
        {cv.sourceFileName && (
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#444' }}>
              <FileText size={13} /> {cv.sourceFileName}
              {!!cv.sourceFileSize && <span style={{ color: '#999' }}>({formatBytes(cv.sourceFileSize)})</span>}
            </span>
            <Button size="sm" variant="outline" icon={<Download size={12} />} onClick={() => api.downloadCVFile().catch(() => setError('Could not download the file.'))}>
              Download
            </Button>
            <Button size="sm" variant="ghost" icon={<Trash2 size={12} />} onClick={remove}>Delete</Button>
          </>
        )}
      </div>

      {error && <div style={{ fontSize: 12, color: '#BA1F4F', background: '#FEE8EF', borderRadius: 8, padding: '8px 12px', marginTop: 12 }}>{error}</div>}
      {note && !parsed && <div style={{ fontSize: 12, color: '#977411', background: '#FEF3B0', borderRadius: 8, padding: '8px 12px', marginTop: 12 }}>{note}</div>}

      {parsed && (
        <div style={{ marginTop: 14, background: '#E6F7F3', border: '1px solid #B3E8DC', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#1F7D65', marginBottom: 4 }}>We read your CV</div>
          <div style={{ fontSize: 12, color: '#333', lineHeight: 1.6 }}>
            {parsed.fullName || 'Name not found'}
            {parsed.jobTitle && <> · {parsed.jobTitle}</>}
            <br />
            {parsed.experiences.length} role{parsed.experiences.length === 1 ? '' : 's'},{' '}
            {parsed.education.length} education entr{parsed.education.length === 1 ? 'y' : 'ies'},{' '}
            {parsed.skills.length} skill{parsed.skills.length === 1 ? '' : 's'}
          </div>
          <div style={{ fontSize: 11, color: '#6B6B6B', margin: '8px 0 10px' }}>
            Using this replaces your current details (name, summary, skills, experience and education). Automatic
            reading can make mistakes, so check each section afterwards.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="teal" size="sm" disabled={applying} onClick={accept}>
              {applying ? 'Saving…' : 'Use these details'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setParsed(null)}>Keep my current details</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
