/**
 * Text-based PDF generation using jsPDF (no canvas/rasterization).
 * Produces selectable, searchable PDF with wrapped code and page breaks.
 */
import { jsPDF } from 'jspdf';

/** Load image from data URL; return { dataUrl, width, height } (and convert WebP to JPEG). */
function loadImageForPdf(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let finalDataUrl = dataUrl;
      let fmt = 'PNG';
      if (dataUrl.startsWith('data:image/png')) fmt = 'PNG';
      else if (dataUrl.startsWith('data:image/webp')) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          finalDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          fmt = 'JPEG';
        } catch (e) {
          reject(e);
          return;
        }
      } else fmt = 'JPEG';
      resolve({
        dataUrl: finalDataUrl,
        fmt,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      });
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = dataUrl;
  });
}
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
import { buildDocSections } from './docStructure.js';
import { getLanguage } from './prismSetup.js';

const EXT_TO_LANG = {
  js: 'javascript', ts: 'typescript', jsx: 'jsx', tsx: 'tsx',
  py: 'python', html: 'markup', css: 'css', json: 'json', md: 'markdown',
};

// Prism token type -> RGB (Tomorrow-like, for PDF text color)
const TOKEN_COLORS = {
  comment: [150, 152, 150],
  prolog: [150, 152, 150],
  doctype: [150, 152, 150],
  cdata: [150, 152, 150],
  punctuation: [197, 200, 198],
  namespace: [197, 200, 198],
  property: [222, 147, 95],
  tag: [252, 146, 158],
  boolean: [197, 134, 192],
  number: [181, 206, 168],
  constant: [197, 134, 192],
  symbol: [181, 206, 168],
  selector: [222, 147, 95],
  attrname: [222, 147, 95],
  string: [181, 206, 168],
  char: [181, 206, 168],
  builtin: [130, 170, 255],
  operator: [197, 200, 198],
  entity: [181, 206, 168],
  url: [181, 206, 168],
  variable: [197, 200, 198],
  atrule: [197, 134, 192],
  regex: [181, 206, 168],
  keyword: [197, 134, 192],
  function: [130, 170, 255],
  'class-name': [222, 147, 95],
  important: [249, 145, 87],
  plain: [66, 66, 66],
};

function getTokenColor(type) {
  if (!type) return TOKEN_COLORS.plain;
  const t = Array.isArray(type) ? type[0] : type;
  return TOKEN_COLORS[t] || TOKEN_COLORS.plain;
}

/** Flatten Prism token stream to [{ type, content: string }] */
function flattenTokenStream(stream, baseType = 'plain') {
  const out = [];
  for (const t of stream) {
    if (typeof t === 'string') {
      if (t.length) out.push({ type: baseType, content: t });
    } else {
      const type = t.type || baseType;
      if (typeof t.content === 'string') {
        out.push({ type, content: t.content });
      } else {
        out.push(...flattenTokenStream(t.content, type));
      }
    }
  }
  return out;
}

/** Tokenize a single line (avoids cross-line token spans). */
function tokenizeLine(line, lang) {
  const grammar = Prism.languages[lang] || Prism.languages.plaintext;
  try {
    const stream = Prism.tokenize(line, grammar);
    return flattenTokenStream(stream);
  } catch {
    return [{ type: 'plain', content: line }];
  }
}

const MARGIN = 14;
const A4_WIDTH = 210;
const A4_HEIGHT = 297;
const CONTENT_WIDTH = A4_WIDTH - 2 * MARGIN;
const CONTENT_HEIGHT = A4_HEIGHT - 2 * MARGIN;
const LINE_HEIGHT_NORMAL = 6;
const LINE_HEIGHT_CODE = 4;
const FONT_SIZE_NORMAL = 11;
const FONT_SIZE_HEADING = 16;
const FONT_SIZE_SUB = 14;
const FONT_SIZE_CODE = 8;
const CODE_INDENT_CHARS = 4; // number of spaces to treat as one indent level for wrap continuation

export async function buildPdf(project, screenshots = [], reflection = null, snackUrl = '', projectTitle = '', githubUrl = '', coverEditMode = false, freeCoverContent = '') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  let y = MARGIN;

  function checkPageBreak(requiredHeight = LINE_HEIGHT_NORMAL) {
    if (y + requiredHeight > A4_HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function addParagraph(text, opts = {}) {
    const font = opts.font || 'helvetica';
    const size = opts.fontSize ?? FONT_SIZE_NORMAL;
    const lh = opts.lineHeight ?? LINE_HEIGHT_NORMAL;
    doc.setFont(font, 'normal');
    doc.setFontSize(size);
    doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
    for (const line of lines) {
      checkPageBreak(lh);
      doc.text(line, MARGIN, y);
      y += lh;
    }
    y += 2;
  }

  function addHeading(text, level = 1) {
    checkPageBreak(LINE_HEIGHT_NORMAL * 1.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(level === 1 ? FONT_SIZE_HEADING : FONT_SIZE_SUB);
    doc.setTextColor(0, 0, 0);
    doc.text(text, MARGIN, y);
    y += level === 1 ? 10 : 8;
  }

  function addCodeLine(line, docRef, options) {
    const { contentWidth, lineHeight, marginLeft, font } = options;
    const indentMatch = line.match(/^(\s*)/);
    const indentStr = indentMatch ? indentMatch[1] : '';
    const rest = line.slice(indentStr.length);
    const indentWidth = docRef.getTextWidth(indentStr);
    const maxWidth = contentWidth - indentWidth;
    if (maxWidth <= 0) {
      addWrappedLine(docRef, line, marginLeft, contentWidth, lineHeight, font, options);
      return;
    }
    const wrapped = docRef.splitTextToSize(rest, maxWidth);
    const continuationIndent = indentStr; // preserve indent on wrapped lines
    wrapped.forEach((part, i) => {
      checkPageBreak(lineHeight);
      const text = i === 0 ? indentStr + part : continuationIndent + part;
      docRef.text(text, marginLeft, y);
      y += lineHeight;
    });
  }

  function addWrappedLine(docRef, text, x, maxWidth, lineHeight, font, options) {
    const { marginLeft } = options;
    docRef.setFont(font, 'normal');
    const wrapped = docRef.splitTextToSize(text, maxWidth);
    wrapped.forEach(line => {
      checkPageBreak(lineHeight);
      docRef.text(line, marginLeft, y);
      y += lineHeight;
    });
  }

  function addCodeBlockWithHighlight(file, lang) {
    doc.setFont('courier', 'normal');
    doc.setFontSize(FONT_SIZE_CODE);
    const lines = file.content.split(/\r?\n/);
    const left = MARGIN + 2;
    const baseIndentWidth = doc.getTextWidth('    ');
    const contentLeft = left + baseIndentWidth;
    const maxX = MARGIN + CONTENT_WIDTH - 2;
    const maxContentWidth = maxX - left;

    for (const line of lines) {
      const tokens = tokenizeLine(line, lang);
      if (tokens.length === 0) {
        checkPageBreak(LINE_HEIGHT_CODE);
        y += LINE_HEIGHT_CODE;
        continue;
      }
      if (tokens.length === 1 && tokens[0].type === 'plain') {
        addCodeLine(line, doc, {
          contentWidth: CONTENT_WIDTH - 4,
          lineHeight: LINE_HEIGHT_CODE,
          marginLeft: left,
          font: 'courier',
          docRef: doc,
        });
        continue;
      }
      const indentMatch = line.match(/^(\s*)/);
      const baseIndent = indentMatch ? indentMatch[1] : '';
      const indentW = doc.getTextWidth(baseIndent);
      const lineContentLeft = left + indentW;
      const tokenMaxWidth = maxX - lineContentLeft;
      let x = lineContentLeft;
      const lineStartY = y;
      if (baseIndent) doc.text(baseIndent, left, y);

      for (const token of tokens) {
        doc.setTextColor(...getTokenColor(token.type));
        const parts = doc.splitTextToSize(token.content, tokenMaxWidth);
        for (let i = 0; i < parts.length; i++) {
          checkPageBreak(LINE_HEIGHT_CODE);
          const segment = parts[i];
          const w = doc.getTextWidth(segment);
          if (i > 0) {
            y += LINE_HEIGHT_CODE;
            x = lineContentLeft;
            doc.text(baseIndent, left, y);
          }
          doc.text(segment, x, y);
          x += w;
        }
      }
      y += LINE_HEIGHT_CODE;
    }
    y += 4;
  }

  function addCodeBlockPlain(file, options) {
    const { contentWidth, lineHeight, marginLeft, font } = options;
    doc.setFont(font, 'normal');
    doc.setFontSize(FONT_SIZE_CODE);
    doc.setTextColor(40, 40, 40);
    const lines = file.content.split(/\r?\n/);
    for (const line of lines) {
      addCodeLine(line, doc, { ...options, contentWidth: contentWidth - 4, marginLeft: marginLeft + 2 });
    }
    y += 4;
  }

  function treeToLines(nodes, indent = '') {
    const lines = [];
    for (const n of nodes || []) {
      if (n.file != null) {
        lines.push(indent + n.name);
      } else {
        lines.push(indent + n.name + '/');
        lines.push(...treeToLines(n.children, indent + '  '));
      }
    }
    return lines;
  }

  const sections = buildDocSections(project.files);
  const coverTitle = (projectTitle || project.projectName || '').trim() || project.projectName;

  // Cover: editable (free text) or structured
  if (coverEditMode && freeCoverContent.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    let coverY = MARGIN;
    const coverLines = freeCoverContent.split(/\r?\n/);
    for (const line of coverLines) {
      const wrapped = doc.splitTextToSize(line || ' ', CONTENT_WIDTH);
      for (const w of wrapped) {
        if (coverY > A4_HEIGHT - MARGIN) break;
        doc.text(w, MARGIN, coverY);
        coverY += LINE_HEIGHT_NORMAL;
      }
      coverY += 2;
    }
  } else {
    // Structured cover: Reporte del Proyecto, título, Snack URL, GitHub (solo si hay URL)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Reporte del Proyecto', A4_WIDTH / 2, 75, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    const titleW = doc.getTextWidth(coverTitle);
    doc.text(coverTitle, (A4_WIDTH - titleW) / 2, 92);
    let coverY = 108;
    if (snackUrl.trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text('Snack URL:', A4_WIDTH / 2, coverY, { align: 'center' });
      coverY += 6;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 255);
      const fullUrl = snackUrl.trim();
      let displayUrl = fullUrl;
      if (doc.getTextWidth(displayUrl) > CONTENT_WIDTH) {
        const maxChars = Math.floor(CONTENT_WIDTH / doc.getTextWidth('m'));
        displayUrl = displayUrl.slice(0, Math.max(0, maxChars - 3)) + '...';
      }
      const urlX = (A4_WIDTH - doc.getTextWidth(displayUrl)) / 2;
      if (typeof doc.textWithLink === 'function') {
        doc.textWithLink(displayUrl, urlX, coverY, { url: fullUrl });
      } else {
        doc.text(displayUrl, urlX, coverY);
      }
      doc.setTextColor(0, 0, 0);
      coverY += 10;
    }
    if (githubUrl.trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text('Repositorio de GitHub:', A4_WIDTH / 2, coverY, { align: 'center' });
      coverY += 6;
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 255);
      const fullGh = githubUrl.trim();
      let displayGh = fullGh;
      if (doc.getTextWidth(displayGh) > CONTENT_WIDTH) {
        const maxChars = Math.floor(CONTENT_WIDTH / doc.getTextWidth('m'));
        displayGh = displayGh.slice(0, Math.max(0, maxChars - 3)) + '...';
      }
      const ghX = (A4_WIDTH - doc.getTextWidth(displayGh)) / 2;
      if (typeof doc.textWithLink === 'function') {
        doc.textWithLink(displayGh, ghX, coverY, { url: fullGh });
      } else {
        doc.text(displayGh, ghX, coverY);
      }
      doc.setTextColor(0, 0, 0);
    }
  }
  doc.addPage();
  y = MARGIN;

  // 1. Estructura del Proyecto
  addHeading('1. Estructura del Proyecto', 2);
  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const treeLines = treeToLines(project.tree);
  for (const line of treeLines) {
    checkPageBreak(LINE_HEIGHT_NORMAL);
    doc.text(line, MARGIN, y);
    y += 5;
  }
  y += 8;
  doc.setFont('helvetica', 'normal');

  // 2. Código Fuente
  addHeading('2. Código Fuente', 2);
  const codeOpts = {
    contentWidth: CONTENT_WIDTH,
    lineHeight: LINE_HEIGHT_CODE,
    marginLeft: MARGIN,
    font: 'courier',
    docRef: doc,
  };

  for (const { section, files } of sections) {
    for (const file of files) {
      // Each code file section starts on a new page: header (name + path) at top, then code
      doc.addPage();
      y = MARGIN;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FONT_SIZE_NORMAL);
      doc.setTextColor(0, 0, 0);
      doc.text(file.name, MARGIN, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(file.path, MARGIN, y);
      y += 6;

      const lang = EXT_TO_LANG[file.name.split('.').pop()?.toLowerCase()] || 'plaintext';
      const useHighlight = Prism.languages[lang];
      if (useHighlight) {
        addCodeBlockWithHighlight(file, lang);
      } else {
        addCodeBlockPlain(file, codeOpts);
      }
    }
  }

  // 3. Capturas de Pantalla
  if (screenshots.length > 0) {
    doc.addPage();
    y = MARGIN;
    addHeading('3. Capturas de Pantalla', 2);
    for (let i = 0; i < screenshots.length; i++) {
      checkPageBreak(20);
      const img = screenshots[i];
      try {
        const { dataUrl, fmt, width: imgNaturalW, height: imgNaturalH } = await loadImageForPdf(img.dataUrl);
        const maxW = CONTENT_WIDTH;
        const maxH = A4_HEIGHT - MARGIN - y - 16;
        const scale = Math.min(maxW / imgNaturalW, maxH / imgNaturalH, 1);
        const imgW = imgNaturalW * scale;
        const imgH = imgNaturalH * scale;
        const x = MARGIN + (CONTENT_WIDTH - imgW) / 2;
        doc.addImage(dataUrl, fmt, x, y, imgW, imgH, undefined, 'FAST');
        y += imgH + 4;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text(`Captura ${i + 1}`, MARGIN, y);
        y += 8;
      } catch (e) {
        addParagraph(`Captura ${i + 1} (no se pudo incrustar la imagen)`);
      }
    }
  }

  // 4. Optional SQA Reflection (at the end, on a new page)
  if (reflection) {
    doc.addPage();
    y = MARGIN;
    addHeading('4. Reflexión SQA', 2);
    addParagraph('Responde estas tres breves preguntas:', { lineHeight: 6 });
    y += 4;

    const reflectionLabels = [
      'S (Lo que Sabía):',
      'Q (Lo que Quería saber):',
      'A (Lo que Aprendí):',
    ];
    const reflectionValues = [reflection.s || '', reflection.q || '', reflection.a || ''];

    for (let i = 0; i < 3; i++) {
      checkPageBreak(LINE_HEIGHT_NORMAL * 4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FONT_SIZE_NORMAL);
      doc.setTextColor(0, 0, 0);
      doc.text(reflectionLabels[i], MARGIN, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      const text = reflectionValues[i].trim() || '(Sin respuesta)';
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const wrapped = doc.splitTextToSize(line || ' ', CONTENT_WIDTH);
        for (const w of wrapped) {
          checkPageBreak(LINE_HEIGHT_NORMAL);
          doc.text(w, MARGIN, y);
          y += LINE_HEIGHT_NORMAL;
        }
      }
      y += 8;
    }
  }

  return doc;
}
