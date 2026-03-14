/** Supported source file extensions for the report */
export const SOURCE_EXTENSIONS = new Set([
  'js', 'ts', 'jsx', 'tsx',
  'py',
  'html', 'css',
  'json',
  'md',
]);

/** Directory names to ignore when scanning the project (excluded from extraction) */
export const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'build',
  'dist',
  '.next',
]);

/** Paths or filenames that appear in the file list but are unchecked by default */
export const IGNORE_BY_DEFAULT_NAMES = new Set([
  '.gitignore',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.env',
]);
/** Path segments: if path contains any of these, it's unchecked by default */
export const IGNORE_BY_DEFAULT_SEGMENTS = new Set([
  '.git',
  'node_modules',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'dist',
  'build',
  '.next',
  'coverage',
  '.env',
]);

/** Known folder names for logical documentation structure */
export const KNOWN_FOLDERS = [
  'src',
  'components',
  'pages',
  'store',
  'utils',
  'assets',
];

/** Screenshot MIME types and extensions */
export const SCREENSHOT_ACCEPT = '.png,.jpg,.jpeg,.webp';
export const SCREENSHOT_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** File size (bytes) above which we warn / discourage selection */
export const LARGE_FILE_THRESHOLD = 1024 * 1024; // 1 MB

/** Whether a path should be unchecked by default in the file selector */
export function isExcludedByDefault(path) {
  const normalized = path.replace(/\\/g, '/');
  const segments = normalized.split('/');
  const fileName = segments[segments.length - 1] || '';
  if (IGNORE_BY_DEFAULT_NAMES.has(fileName)) return true;
  return segments.some(seg => IGNORE_BY_DEFAULT_SEGMENTS.has(seg));
}
