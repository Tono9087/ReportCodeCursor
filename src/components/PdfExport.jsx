import { useState } from 'react';
import { buildPdf } from '../utils/pdfBuilder.js';

const SNACK_URL_PREFIX = 'https://snack.expo.dev/';

export function PdfExport({ project, screenshots = [], reflection = null, snackUrl = '', projectTitle = '', githubUrl = '', coverEditMode = false, freeCoverContent = '', disabled }) {
  const [exporting, setExporting] = useState(false);
  const trimmedSnack = snackUrl.trim();
  const isValidSnackUrl = trimmedSnack.length > 0 && trimmedSnack.startsWith(SNACK_URL_PREFIX);
  const canExport = project && isValidSnackUrl && !disabled;

  async function handleExport() {
    if (!project) return;
    if (!trimmedSnack) {
      alert('Snack URL es obligatorio para generar el reporte.');
      return;
    }
    if (!trimmedSnack.startsWith(SNACK_URL_PREFIX)) {
      alert('La Snack URL debe comenzar con https://snack.expo.dev/');
      return;
    }
    setExporting(true);
    try {
      const doc = await buildPdf(project, screenshots, reflection, trimmedSnack, projectTitle, githubUrl, coverEditMode, freeCoverContent);
      doc.save(`${project.projectName}_reporte.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error al generar el PDF: ' + (err.message || 'Error desconocido'));
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
      title={!isValidSnackUrl ? 'Snack URL es obligatorio y debe comenzar con https://snack.expo.dev/' : undefined}
    >
      {exporting ? 'Generando PDF…' : 'Generar PDF'}
    </button>
  );
}
