import { useState, useMemo, useCallback } from 'react';
import { ZipUpload } from './components/ZipUpload.jsx';
import { FileSelector } from './components/FileSelector.jsx';
import { ScreenshotUpload } from './components/ScreenshotUpload.jsx';
import { ReportPreview } from './components/ReportPreview.jsx';
import { PdfExport } from './components/PdfExport.jsx';
import { buildTree } from './utils/zipAnalyzer.js';
import { isExcludedByDefault } from './utils/constants.js';
import './utils/prismSetup.js';
import './App.css';

function App() {
  const [project, setProject] = useState(null);
  const [selectedPaths, setSelectedPaths] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [expandAllForPdf, setExpandAllForPdf] = useState(false);
  const [reflectionEnabled, setReflectionEnabled] = useState(false);
  const [reflectionS, setReflectionS] = useState('');
  const [reflectionQ, setReflectionQ] = useState('');
  const [reflectionA, setReflectionA] = useState('');
  const [snackUrl, setSnackUrl] = useState('');

  const handleProjectLoaded = useCallback((proj) => {
    setProject(proj);
    const initial = (proj.files || []).filter(f => !isExcludedByDefault(f.path)).map(f => f.path);
    setSelectedPaths(initial);
  }, []);

  const reportProject = useMemo(() => {
    if (!project?.files?.length) return null;
    const pathsSet = new Set(selectedPaths);
    const files = project.files.filter(f => pathsSet.has(f.path));
    if (files.length === 0) return null;
    return {
      ...project,
      files,
      tree: buildTree(files.map(f => f.path)),
    };
  }, [project, selectedPaths]);

  const handleSelectionChange = useCallback((updater) => {
    setSelectedPaths(updater);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Project Report Generator</h1>
        <p>Upload a ZIP of your project and optional screenshots to generate a PDF report.</p>
      </header>

      <div className="app-actions">
        <ZipUpload onProjectLoaded={handleProjectLoaded} />
        <ScreenshotUpload
          screenshots={screenshots}
          onScreenshotsChange={setScreenshots}
        />
        <PdfExport
          project={reportProject}
          screenshots={screenshots}
          reflection={
            reflectionEnabled
              ? { s: reflectionS, q: reflectionQ, a: reflectionA }
              : null
          }
          snackUrl={snackUrl.trim()}
        />
      </div>

      {reportProject && (
        <div className="app-cover-field">
          <label className="app-cover-label">
            <span className="app-cover-label-text">Snack URL:</span>
            <input
              type="url"
              className="app-cover-input"
              value={snackUrl}
              onChange={(e) => setSnackUrl(e.target.value)}
              placeholder="https://snack.expo.dev/@username/project-name"
              required
            />
          </label>
          {snackUrl.trim() && !snackUrl.trim().startsWith('https://snack.expo.dev/') && (
            <p className="app-cover-hint">Recommended: URL should start with https://snack.expo.dev/</p>
          )}
        </div>
      )}

      <div className="app-reflection-toggle">
        <label className="reflection-toggle-label">
          <input
            type="checkbox"
            checked={reflectionEnabled}
            onChange={(e) => setReflectionEnabled(e.target.checked)}
            className="reflection-toggle-checkbox"
          />
          <span>Include SQA Reflection Section</span>
        </label>
      </div>

      {project?.files?.length > 0 && (
        <div className="app-fileselect">
          <FileSelector
            project={project}
            selectedPaths={selectedPaths}
            onSelectionChange={handleSelectionChange}
          />
        </div>
      )}

      <div className="app-preview">
        <h2>Preview</h2>
        <ReportPreview
            project={reportProject}
            hasProject={!!project}
            screenshots={screenshots}
            expandAllForPdf={expandAllForPdf}
            reflectionEnabled={reflectionEnabled}
            reflectionS={reflectionS}
            reflectionQ={reflectionQ}
            reflectionA={reflectionA}
            onReflectionS={setReflectionS}
            onReflectionQ={setReflectionQ}
            onReflectionA={setReflectionA}
            snackUrl={snackUrl}
          />
      </div>
    </div>
  );
}

export default App;
