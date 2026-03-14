import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/themes/prism-tomorrow.css';

const EXT_TO_LANG = {
  js: 'javascript',
  ts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  py: 'python',
  html: 'markup',
  css: 'css',
  json: 'json',
  md: 'markdown',
};

/**
 * Get Prism language id for a filename.
 */
export function getLanguage(filename) {
  const ext = filename.split('.').pop()?.toLowerCase();
  return EXT_TO_LANG[ext] || 'plaintext';
}

/**
 * Highlight code string with Prism.
 */
export function highlightCode(code, language) {
  const lang = EXT_TO_LANG[language] || language || 'plaintext';
  if (Prism.languages[lang]) {
    return Prism.highlight(code, Prism.languages[lang], lang);
  }
  return Prism.util.encode(code);
}
