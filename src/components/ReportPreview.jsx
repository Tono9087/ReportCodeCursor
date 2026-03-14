import { useRef, useMemo, useState, useEffect } from 'react';
import { buildDocSections } from '../utils/docStructure.js';
import { highlightCode, getLanguage } from '../utils/prismSetup.js';

function TreeView({ nodes, level = 0 }) {
  if (!nodes?.length) return null;
  return (
    <ul className="tree-list" style={{ marginLeft: level ? '1.2em' : 0 }}>
      {nodes.map((node, i) => (
        <li key={i} className="tree-item">
          {node.file != null ? (
            <span className="tree-file">{node.name}</span>
          ) : (
            <>
              <span className="tree-dir">{node.name}/</span>
              <TreeView nodes={node.children} level={level + 1} />
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

const LARGE_FILE_LINES = 150;

function CodeBlock({ file, expandAll }) {
  const lang = getLanguage(file.name);
  const lines = file.content.split('\n');
  const isLarge = lines.length > LARGE_FILE_LINES;
  const [expanded, setExpanded] = useState(false);
  const showFull = expandAll || !isLarge || expanded;
  const content = showFull ? file.content : lines.slice(0, LARGE_FILE_LINES).join('\n');
  const hiddenLineCount = lines.length - LARGE_FILE_LINES;

  const highlighted = useMemo(
    () => highlightCode(content, lang),
    [content, file.name]
  );
  return (
    <div className="report-code-block page-break-after">
      <div className="report-code-header">
        <span className="report-code-filename">{file.name}</span>
        <span className="report-code-path">{file.path}</span>
      </div>
      <pre className="report-code-pre">
        <code className={`language-${lang}`} dangerouslySetInnerHTML={{ __html: highlighted }} />
      </pre>
      {isLarge && !showFull && (
        <button
          type="button"
          className="code-expand-btn"
          onClick={() => setExpanded(true)}
        >
          Show full file ({hiddenLineCount} more lines)
        </button>
      )}
    </div>
  );
}

export function ReportPreview({
  project,
  hasProject,
  screenshots,
  expandAllForPdf,
  reflectionEnabled,
  reflectionS,
  reflectionQ,
  reflectionA,
  onReflectionS,
  onReflectionQ,
  onReflectionA,
  snackUrl = '',
  projectTitle = '',
  githubUrl = '',
  coverEditMode = false,
  freeCoverContent = '',
  onFreeCoverChange,
}) {
  const containerRef = useRef(null);
  const coverEditorRef = useRef(null);
  const prevCoverEditModeRef = useRef(false);

  useEffect(() => {
    if (coverEditMode && !prevCoverEditModeRef.current && coverEditorRef.current) {
      coverEditorRef.current.innerText = freeCoverContent;
    }
    prevCoverEditModeRef.current = coverEditMode;
  }, [coverEditMode, freeCoverContent]);

  const sections = useMemo(
    () => (project?.files ? buildDocSections(project.files) : []),
    [project?.files]
  );
  if (!project) {
    return (
      <div className="report-placeholder" ref={containerRef}>
        <p>Upload a ZIP file to generate the report preview.</p>
      </div>
    );
  }
  if (hasProject && !project) {
    return (
      <div className="report-placeholder" ref={containerRef}>
        <p>Select at least one file above to include in the report.</p>
      </div>
    );
  }

  return (
    <article className="report-preview" id="report-preview" ref={containerRef}>
      {/* Cover */}
      <section className="report-cover">
        {coverEditMode ? (
          <div
            ref={coverEditorRef}
            className="report-cover-editor"
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => onFreeCoverChange?.(e.currentTarget.innerText)}
            role="textbox"
            aria-label="Portada editable"
          />
        ) : (
          <>
            <h1 className="report-cover-title">{projectTitle || project.projectName}</h1>
            <p className="report-cover-subtitle">Reporte del Proyecto</p>
            {snackUrl.trim() && (
              <p className="report-cover-field">
                <strong>Snack URL:</strong>
                <br />
                <span className="report-cover-url">{snackUrl.trim()}</span>
              </p>
            )}
            {githubUrl.trim() && (
              <p className="report-cover-field">
                <strong>Repositorio de GitHub:</strong>
                <br />
                <span className="report-cover-url">{githubUrl.trim()}</span>
              </p>
            )}
          </>
        )}
      </section>

      <div className="page-break" />

      {/* 1. Estructura del Proyecto */}
      <section id="structure" className="report-section">
        <h2>1. Estructura del Proyecto</h2>
        <div className="report-tree">
          <TreeView nodes={project.tree} />
        </div>
      </section>

      <div className="page-break" />

      {/* 2. Código Fuente */}
      <section id="source" className="report-section">
        <h2>2. Código Fuente</h2>
        {sections.map(({ section, files }) => (
          <div key={section} className="report-source-group">
            <h3>{section}</h3>
            {files.map((file, i) => (
              <CodeBlock key={`${file.path}-${i}`} file={file} expandAll={expandAllForPdf} />
            ))}
          </div>
        ))}
      </section>

      {/* 4. Screenshots */}
      {screenshots.length > 0 && (
        <>
          <div className="page-break" />
          <section id="screenshots" className="report-section">
            <h2>3. Capturas de Pantalla</h2>
            {screenshots.map((s, i) => (
              <figure key={i} className="report-screenshot page-break-inside-avoid">
                <img src={s.dataUrl} alt={`Screenshot ${i + 1}`} className="report-screenshot-img" />
                <figcaption>Captura {i + 1}</figcaption>
              </figure>
            ))}
          </section>
        </>
      )}

      {reflectionEnabled && (
        <>
          <div className="page-break" />
          <section id="reflection" className="report-section report-reflection">
            <h2>4. Reflexión SQA</h2>
            <p className="report-reflection-subtitle">Responde estas tres breves preguntas:</p>
            <div className="report-reflection-field">
              <label className="report-reflection-label">S (Lo que Sabía):</label>
              <textarea
                className="report-reflection-textarea"
                value={reflectionS}
                onChange={(e) => onReflectionS?.(e.target.value)}
                placeholder="Escribe tu respuesta aquí..."
                rows={4}
              />
            </div>
            <div className="report-reflection-field">
              <label className="report-reflection-label">Q (Lo que Quería saber):</label>
              <textarea
                className="report-reflection-textarea"
                value={reflectionQ}
                onChange={(e) => onReflectionQ?.(e.target.value)}
                placeholder="Escribe tu respuesta aquí..."
                rows={4}
              />
            </div>
            <div className="report-reflection-field">
              <label className="report-reflection-label">A (Lo que Aprendí):</label>
              <textarea
                className="report-reflection-textarea"
                value={reflectionA}
                onChange={(e) => onReflectionA?.(e.target.value)}
                placeholder="Escribe tu respuesta aquí..."
                rows={4}
              />
            </div>
          </section>
        </>
      )}
    </article>
  );
}

export function getReportElement() {
  return document.getElementById('report-preview');
}
