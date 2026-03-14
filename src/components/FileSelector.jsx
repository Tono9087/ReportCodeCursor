import { useState, useMemo, useEffect, useRef } from 'react';
import { SOURCE_EXTENSIONS, LARGE_FILE_THRESHOLD } from '../utils/constants.js';

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

function getExtension(path) {
  const name = path.replace(/\\/g, '/').split('/').pop() || '';
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

function isSourceFile(path) {
  return SOURCE_EXTENSIONS.has(getExtension(path));
}

function isJsFile(path) {
  return getExtension(path) === 'js';
}

function FolderCheckbox({ allChecked, someChecked, onToggle }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = someChecked && !allChecked;
  }, [allChecked, someChecked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={allChecked}
      onChange={onToggle}
      className="file-selector-checkbox"
    />
  );
}

/** Collect all file paths under a folder prefix (inclusive of prefix as file path) */
function getPathsUnderPrefix(files, pathPrefix) {
  const norm = pathPrefix.replace(/\\/g, '/');
  return files.filter(f => f.path === norm || f.path.startsWith(norm + '/')).map(f => f.path);
}

export function FileSelector({ project, selectedPaths, onSelectionChange }) {
  const [collapsed, setCollapsed] = useState(() => new Set());
  const pathToFile = useMemo(() => {
    const m = new Map();
    (project?.files || []).forEach(f => m.set(f.path, f));
    return m;
  }, [project?.files]);

  const allPaths = useMemo(() => (project?.files || []).map(f => f.path), [project?.files]);
  const selectedSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);

  function toggleFile(path, checked) {
    onSelectionChange(prev =>
      checked ? [...prev, path] : prev.filter(p => p !== path)
    );
  }

  function toggleFolder(pathPrefix, currentlyChecked) {
    const paths = getPathsUnderPrefix(project.files, pathPrefix);
    onSelectionChange(prev => {
      if (currentlyChecked) return prev.filter(p => !paths.includes(p));
      const next = new Set(prev);
      paths.forEach(p => next.add(p));
      return Array.from(next);
    });
  }

  function selectAll() {
    onSelectionChange(() => [...allPaths]);
  }

  function deselectAll() {
    onSelectionChange(() => []);
  }

  function selectOnlySource() {
    const sourcePaths = project.files.filter(f => isSourceFile(f.path)).map(f => f.path);
    onSelectionChange(() => sourcePaths);
  }

  function selectOnlyJs() {
    const jsPaths = project.files.filter(f => isJsFile(f.path)).map(f => f.path);
    onSelectionChange(() => jsPaths);
  }

  function toggleCollapse(pathPrefix) {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(pathPrefix)) next.delete(pathPrefix);
      else next.add(pathPrefix);
      return next;
    });
  }

  if (!project?.files?.length) return null;

  return (
    <div className="file-selector">
      <div className="file-selector-toolbar">
        <span className="file-selector-title">Select files to include in the report</span>
        <div className="file-selector-batch">
          <button type="button" className="file-selector-btn" onClick={selectAll}>
            Select All
          </button>
          <button type="button" className="file-selector-btn" onClick={deselectAll}>
            Deselect All
          </button>
          <button type="button" className="file-selector-btn" onClick={selectOnlySource}>
            Select Only Source Files
          </button>
          <button type="button" className="file-selector-btn" onClick={selectOnlyJs}>
            Select Only .js Files
          </button>
        </div>
      </div>
      <div className="file-selector-tree">
        <TreeNode
          nodes={project.tree}
          pathPrefix=""
          pathToFile={pathToFile}
          projectFiles={project.files}
          selectedSet={selectedSet}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          onToggleFile={toggleFile}
          onToggleFolder={toggleFolder}
          depth={0}
        />
      </div>
    </div>
  );
}

function TreeNode({
  nodes,
  pathPrefix,
  pathToFile,
  projectFiles,
  selectedSet,
  collapsed,
  onToggleCollapse,
  onToggleFile,
  onToggleFolder,
  depth,
}) {
  if (!nodes?.length) return null;

  return (
    <ul className="file-selector-list" style={{ marginLeft: depth ? '1em' : 0 }}>
      {nodes.map((node, i) => {
        if (node.file != null) {
          const path = node.file;
          const file = pathToFile.get(path);
          const size = file?.size ?? 0;
          const checked = selectedSet.has(path);
          const isLarge = size > LARGE_FILE_THRESHOLD;
          return (
            <li key={path} className="file-selector-item file-selector-file">
              <label className="file-selector-file-label">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => onToggleFile(path, e.target.checked)}
                  title={isLarge ? `Large file (${formatSize(size)}). Consider excluding to keep the report small.` : undefined}
                  className={isLarge ? 'file-selector-checkbox file-selector-checkbox--large' : 'file-selector-checkbox'}
                />
                <span className="file-selector-name">{node.name}</span>
                <span className="file-selector-meta">
                  {path}
                  {size > 0 && <span className="file-selector-size" title={isLarge ? 'Large file' : undefined}>{formatSize(size)}</span>}
                </span>
              </label>
            </li>
          );
        }

        const folderPathPrefix = pathPrefix ? pathPrefix + '/' + node.name : node.name;
        const pathsUnder = getPathsUnderPrefix(projectFiles, folderPathPrefix);
        const allChecked = pathsUnder.length > 0 && pathsUnder.every(p => selectedSet.has(p));
        const someChecked = pathsUnder.some(p => selectedSet.has(p));
        const isCollapsed = collapsed.has(folderPathPrefix);

        return (
          <li key={folderPathPrefix} className="file-selector-item file-selector-folder">
            <div className="file-selector-folder-header">
              <button
                type="button"
                className="file-selector-folder-toggle"
                onClick={() => onToggleCollapse(folderPathPrefix)}
                aria-expanded={!isCollapsed}
                aria-label={isCollapsed ? 'Expand folder' : 'Collapse folder'}
              >
                {isCollapsed ? '▶' : '▼'}
              </button>
              <label className="file-selector-folder-label">
                <FolderCheckbox
                  allChecked={allChecked}
                  someChecked={someChecked}
                  onToggle={() => onToggleFolder(folderPathPrefix, allChecked)}
                />
                <span className="file-selector-name file-selector-folder-name">{node.name}/</span>
              </label>
            </div>
            {!isCollapsed && (
              <TreeNode
                nodes={node.children}
                pathPrefix={folderPathPrefix}
                pathToFile={pathToFile}
                projectFiles={projectFiles}
                selectedSet={selectedSet}
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
                onToggleFile={onToggleFile}
                onToggleFolder={onToggleFolder}
                depth={depth + 1}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
