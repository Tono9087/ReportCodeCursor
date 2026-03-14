import { KNOWN_FOLDERS } from './constants.js';

/** Map first segment of path to doc section: components, pages, store, utils, other */
const FOLDER_TO_SECTION = {
  components: 'Components',
  pages: 'Pages',
  store: 'Store / State',
  utils: 'Utilities',
  assets: 'Assets',
  src: 'Source',
};

/**
 * Group project files into logical documentation sections.
 * @param {{ path: string, name: string, content: string }[]} files
 * @returns {Array<{ section: string, files: Array }>}
 */
export function buildDocSections(files) {
  const groups = new Map();
  const add = (section, file) => {
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section).push(file);
  };

  for (const file of files) {
    const path = file.path.replace(/\\/g, '/');
    const top = path.split('/')[0]?.toLowerCase();
    const section = FOLDER_TO_SECTION[top] || 'Other';
    add(section, file);
  }

  const order = ['Components', 'Pages', 'Store / State', 'Utilities', 'Assets', 'Source', 'Other'];
  return order
    .filter(s => groups.has(s))
    .map(section => ({ section, files: groups.get(section) }));
}

/**
 * Detect which known folders exist in the project (from file paths).
 */
export function detectProjectFolders(files) {
  const firstSegments = new Set();
  for (const f of files) {
    const top = f.path.replace(/\\/g, '/').split('/')[0];
    if (top) firstSegments.add(top);
  }
  return KNOWN_FOLDERS.filter(name => firstSegments.has(name));
}
