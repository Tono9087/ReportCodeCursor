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
  const [projectTitle, setProjectTitle] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [coverEditMode, setCoverEditMode] = useState(false);
  const [freeCoverContent, setFreeCoverContent] = useState('');

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

  function buildDefaultCoverContent(title, snack, github) {
    const lines = [
      'Título del Proyecto',
      '',
      title || '(Título del proyecto)',
      '',
      'Snack URL:',
      snack || '(obligatorio)',
      '',
      'Repositorio de GitHub:',
      github || '(opcional)',
    ];
    return lines.join('\n');
  }

  const handleCoverEditToggle = useCallback((enabled) => {
    setCoverEditMode(enabled);
    if (enabled) {
      setFreeCoverContent(buildDefaultCoverContent(
        projectTitle.trim() || reportProject?.projectName,
        snackUrl.trim(),
        githubUrl.trim()
      ));
    }
  }, [projectTitle, snackUrl, githubUrl, reportProject]);

  const handleProjectLoaded = useCallback((proj) => {
    setProject(proj);
    setProjectTitle(proj.projectName || '');
    const initial = (proj.files || []).filter(f => !isExcludedByDefault(f.path)).map(f => f.path);
    setSelectedPaths(initial);
  }, []);

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
          projectTitle={projectTitle.trim() || reportProject?.projectName || ''}
          githubUrl={githubUrl.trim()}
          coverEditMode={coverEditMode}
          freeCoverContent={freeCoverContent}
        />
      </div>

      {reportProject && (
        <>
        <div className="app-cover-edit-toggle">
          <label className="reflection-toggle-label">
            <input
              type="checkbox"
              checked={coverEditMode}
              onChange={(e) => handleCoverEditToggle(e.target.checked)}
              className="reflection-toggle-checkbox"
            />
            <span>Editar portada manualmente</span>
          </label>
        </div>
        <div className="app-cover-fields">
          <label className="app-cover-label">
            <span className="app-cover-label-text">Título del Proyecto:</span>
            <input
              type="text"
              className="app-cover-input"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder={reportProject.projectName}
            />
          </label>
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
            <p className="app-cover-hint">La URL debe comenzar con https://snack.expo.dev/</p>
          )}
          <label className="app-cover-label">
            <span className="app-cover-label-text">Repositorio de GitHub (opcional):</span>
            <input
              type="url"
              className="app-cover-input"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/usuario/repositorio"
            />
          </label>
          {githubUrl.trim() && !githubUrl.trim().startsWith('https://github.com/') && (
            <p className="app-cover-hint">Recomendado: la URL debe comenzar con https://github.com/</p>
          )}
        </div>
        </>
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
            projectTitle={projectTitle.trim() || reportProject?.projectName || ''}
            githubUrl={githubUrl}
            coverEditMode={coverEditMode}
            freeCoverContent={freeCoverContent}
            onFreeCoverChange={setFreeCoverContent}
          />
      </div>
    </div>
  );
}

export default App;
