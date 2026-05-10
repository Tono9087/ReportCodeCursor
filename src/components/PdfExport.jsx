import { useState } from 'react';
import { buildPdf } from '../utils/pdfBuilder.js';

const SNACK_URL_PREFIX = 'https://snack.expo.dev/';

export function PdfExport({ project, screenshots = [], reflection = null, snackUrl = '', noSnackUrl = false, projectTitle = '', githubUrl = '', coverEditMode = false, freeCoverContent = '', disabled }) {
  const [exporting, setExporting] = useState(false);
  const trimmedSnack = snackUrl.trim();
  const isValidSnackUrl = trimmedSnack.length > 0 && trimmedSnack.startsWith(SNACK_URL_PREFIX);
  const canExport = project && (noSnackUrl || isValidSnackUrl) && !disabled;

  async function handleExport() {
    if (!project) return;
    
    if (!noSnackUrl) {
      if (!trimmedSnack) {
        alert('Snack URL es obligatorio para generar el reporte o marque la casilla de "No hay link de snack".');
        return;
      }
      if (!trimmedSnack.startsWith(SNACK_URL_PREFIX)) {
        alert('La Snack URL debe comenzar con https://snack.expo.dev/');
        return;
      }
    }

    setExporting(true);
    try {
      const exportSnackUrl = noSnackUrl ? '' : trimmedSnack;
      const doc = await buildPdf(project, screenshots, reflection, exportSnackUrl, projectTitle, githubUrl, coverEditMode, freeCoverContent);
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
      title={(!noSnackUrl && !isValidSnackUrl) ? 'Snack URL es obligatorio o marque la casilla de omitir' : undefined}
    >
      {exporting ? 'Generando PDF…' : 'Generar PDF'}
    </button>
  );
}
