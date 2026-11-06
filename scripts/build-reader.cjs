const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const output = join(root, 'src', 'generated');
const engine = readFileSync(require.resolve('pdfjs-dist/legacy/build/pdf.min.mjs'), 'base64');
const worker = readFileSync(require.resolve('pdfjs-dist/legacy/build/pdf.worker.min.mjs'), 'base64');
const viewer = readFileSync(require.resolve('pdfjs-dist/legacy/web/pdf_viewer.mjs'), 'base64');
const viewerStyles = readFileSync(require.resolve('pdfjs-dist/legacy/web/pdf_viewer.css'), 'utf8');
const template = readFileSync(join(__dirname, 'reader.html'), 'utf8');

mkdirSync(output, { recursive: true });
writeFileSync(
  join(output, 'reader.html'),
  template
    .replace('__PDF_ENGINE__', engine)
    .replace('__PDF_WORKER__', worker)
    .replace('__PDF_VIEWER__', viewer)
    .replace('__PDF_VIEWER_STYLES__', () => viewerStyles),
);
