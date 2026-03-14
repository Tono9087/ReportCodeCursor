import { useRef } from 'react';

export function ZipUpload({ onProjectLoaded, disabled }) {
  const inputRef = useRef(null);

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      alert('Please upload a .zip file.');
      return;
    }
    try {
      const { extractProjectFromZip } = await import('../utils/zipAnalyzer.js');
      const project = await extractProjectFromZip(file);
      onProjectLoaded(project);
    } catch (err) {
      console.error(err);
      alert('Failed to read ZIP: ' + (err.message || 'Unknown error'));
    }
    e.target.value = '';
  }

  return (
    <div className="upload-card">
      <label className="upload-label">
        <span className="upload-title">Upload ZIP</span>
        <span className="upload-hint">Programming project as .zip</span>
        <input
          ref={inputRef}
          type="file"
          accept=".zip"
          onChange={handleChange}
          disabled={disabled}
          className="upload-input"
        />
      </label>
    </div>
  );
}
