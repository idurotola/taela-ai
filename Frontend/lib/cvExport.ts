import { CV } from '@/types';

function fileBaseName(cv: CV): string {
  return (cv.fullName || 'cv').trim().replace(/\s+/g, '_').replace(/[^\w-]/g, '') || 'cv';
}

/** Plain-text rendering shared by clipboard copy and as a fallback for exports. */
export function buildCvText(cv: CV): string {
  const lines: string[] = [];
  lines.push(cv.fullName || 'Your Name');
  if (cv.jobTitle) lines.push(cv.jobTitle);
  const contact = [cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join(' | ');
  if (contact) lines.push(contact);
  lines.push('');

  if (cv.summary) {
    lines.push('SUMMARY');
    lines.push(cv.summary);
    lines.push('');
  }

  if (cv.experiences.length > 0) {
    lines.push('EXPERIENCE');
    cv.experiences.forEach((exp) => {
      const header = [exp.role, exp.company].filter(Boolean).join(' — ');
      lines.push(exp.dates ? `${header} (${exp.dates})` : header);
      exp.bullets.forEach((b) => lines.push(`  • ${b}`));
      lines.push('');
    });
  }

  return lines.join('\n').trim();
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadCvPdf(cv: CV): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 48;
  const pageWidth = doc.internal.pageSize.getWidth() - marginX * 2;
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 56;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 48) {
      doc.addPage();
      y = 56;
    }
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(cv.fullName || 'Your Name', marginX, y);
  y += 22;

  if (cv.jobTitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(cv.jobTitle, marginX, y);
    y += 16;
  }

  const contact = [cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join('   •   ');
  if (contact) {
    doc.setFontSize(9.5);
    doc.setTextColor(90);
    doc.text(contact, marginX, y);
    doc.setTextColor(0);
    y += 20;
  }

  if (cv.summary) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('SUMMARY', marginX, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(cv.summary, pageWidth);
    ensureSpace(lines.length * 13);
    doc.text(lines, marginX, y);
    y += lines.length * 13 + 12;
  }

  if (cv.experiences.length > 0) {
    ensureSpace(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('EXPERIENCE', marginX, y);
    y += 16;

    cv.experiences.forEach((exp) => {
      ensureSpace(28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text([exp.role, exp.company].filter(Boolean).join(' — '), marginX, y);
      if (exp.dates) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(exp.dates, marginX + pageWidth, y, { align: 'right' });
      }
      y += 14;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      exp.bullets.forEach((b) => {
        const lines = doc.splitTextToSize(`•  ${b}`, pageWidth - 10);
        ensureSpace(lines.length * 12);
        doc.text(lines, marginX + 8, y);
        y += lines.length * 12 + 2;
      });
      y += 8;
    });
  }

  doc.save(`${fileBaseName(cv)}_CV.pdf`);
}

export async function downloadCvDocx(cv: CV): Promise<void> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
  const children: InstanceType<typeof Paragraph>[] = [];

  children.push(new Paragraph({ text: cv.fullName || 'Your Name', heading: HeadingLevel.TITLE }));
  if (cv.jobTitle) children.push(new Paragraph({ text: cv.jobTitle }));
  const contact = [cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join('  |  ');
  if (contact) children.push(new Paragraph({ text: contact }));

  if (cv.summary) {
    children.push(new Paragraph({ text: 'Summary', heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ text: cv.summary }));
  }

  if (cv.experiences.length > 0) {
    children.push(new Paragraph({ text: 'Experience', heading: HeadingLevel.HEADING_2 }));
    cv.experiences.forEach((exp) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: [exp.role, exp.company].filter(Boolean).join(' — '), bold: true }),
            ...(exp.dates ? [new TextRun({ text: `    ${exp.dates}`, italics: true })] : []),
          ],
        })
      );
      exp.bullets.forEach((b) => {
        children.push(new Paragraph({ text: b, bullet: { level: 0 } }));
      });
    });
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${fileBaseName(cv)}_CV.docx`);
}
