import JSZip from 'jszip';
import { IGNORE_DIRS } from './constants.js';

/**
 * Check if path starts with any ignored segment (e.g. "src/node_modules/..." or "node_modules/...")
 */
function isIgnoredPath(path) {
  const segments = path.replace(/\\/g, '/').split('/');
  return segments.some(seg => IGNORE_DIRS.has(seg));
}

/**
 * Recursively collect file entries from ZIP (relative paths, no leading slash).
 * Includes all files except those under IGNORE_DIRS (e.g. node_modules, .git).
 */
function* walkZip(zip, prefix = '') {
  const entries = Object.entries(zip.files);
  for (const [fullPath, entry] of entries) {
    const normalized = fullPath.replace(/\\/g, '/').replace(/\/$/, '');
    if (entry.dir) continue;
    const rel = prefix ? normalized.replace(prefix, '').replace(/^\//, '') : normalized;
    if (isIgnoredPath(rel)) continue;
    const name = rel.split('/').pop();
    yield { path: rel, name, content: entry };
  }
}

/**
 * Extract project from ZIP file (client-side).
 * @param {File} file - The .zip file
 * @returns {Promise<{ projectName: string, files: Array<{path, name, content}>, tree: Array }>}
 */
export async function extractProjectFromZip(file) {
  const zip = await JSZip.loadAsync(file);
  const prefix = getRootPrefix(zip);
  const files = [];
  for (const { path, name, content } of walkZip(zip, prefix)) {
    const text = await content.async('string');
    files.push({ path, name, content: text, size: text.length });
  }
  const tree = buildTree(files.map(f => f.path));
  const projectName = file.name.replace(/\.zip$/i, '') || 'Project';
  return { projectName, files, tree };
}

/**
 * If all paths share a single root folder (e.g. "my-app/src/..."), return "my-app/" so we can strip it.
 */
function getRootPrefix(zip) {
  const paths = Object.keys(zip.files)
    .filter(p => !zip.files[p].dir)
    .map(p => p.replace(/\\/g, '/'));
  if (paths.length === 0) return '';
  const parts = paths[0].split('/');
  let prefix = '';
  for (let i = 0; i < parts.length - 1; i++) {
    const candidate = parts.slice(0, i + 1).join('/') + '/';
    if (paths.every(p => p === candidate || p.startsWith(candidate))) {
      prefix = candidate;
    } else break;
  }
  return prefix;
}

/**
 * Build a tree structure from a list of file paths.
 * @param {string[]} paths - e.g. ["src/App.jsx", "src/utils/helper.js"]
 * @returns {Array<{ name, children?: Array, file?: string }>}
 */
export function buildTree(paths) {
  const root = { children: [] };
  for (const path of paths) {
    const segments = path.replace(/\\/g, '/').split('/');
    let current = root;
    for (let i = 0; i < segments.length; i++) {
      const name = segments[i];
      const isFile = i === segments.length - 1;
      let next = current.children?.find(n => n.name === name);
      if (!next) {
        next = isFile ? { name, file: path } : { name, children: [] };
        current.children = current.children || [];
        current.children.push(next);
      }
      current = next;
    }
  }
  sortTree(root);
  return root.children || [];
}

function sortTree(node) {
  if (node.children) {
    node.children.sort((a, b) => {
      const aIsDir = !!a.children;
      const bIsDir = !!b.children;
      if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
      return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    });
    node.children.forEach(sortTree);
  }
}
