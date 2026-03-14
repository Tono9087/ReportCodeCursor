import { useState } from 'react';
import { buildPdf } from '../utils/pdfBuilder.js';

export function PdfExport({ project, screenshots = [], reflection = null, snackUrl = '', disabled }) {
  const [exporting, setExporting] = useState(false);
  const isValidSnackUrl = snackUrl.trim().length > 0;
  const canExport = project && isValidSnackUrl && !disabled;

  async function handleExport() {
    if (!project) return;
    if (!snackUrl.trim()) {
      alert('Snack URL is required to generate the report.');
      return;
    }
    setExporting(true);
    try {
      const doc = await buildPdf(project, screenshots, reflection, snackUrl.trim());
      doc.save(`${project.projectName}_report.pdf`);
    } catch (err) {
      console.error(err);
      alert('PDF export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      type="button"
      className="btn-primary"
      onClick={handleExport}
      disabled={!canExport || exporting}
      title={!isValidSnackUrl ? 'Snack URL is required to generate the report.' : undefined}
    >
      {exporting ? 'Generating PDF…' : 'Export PDF'}
    </button>
  );
}
