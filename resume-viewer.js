import { getDocument, GlobalWorkerOptions, TextLayer } from './vendor/pdfjs/build/pdf.mjs';

GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/build/pdf.worker.mjs', import.meta.url).href;
const en = new URLSearchParams(location.search).get('lang') === 'en';
const pdfUrl = new URL('./downloads/han-zhaoling-profile.pdf', import.meta.url);
pdfUrl.searchParams.set('v', new URLSearchParams(location.search).get('v') || String(Date.now()));
document.documentElement.lang = en ? 'en' : 'zh-CN';
const pages = document.getElementById('pages');
const status = document.getElementById('status');
pages.setAttribute('aria-label', en ? 'Resume pages' : '简历正文');
status.textContent = en ? 'Loading resume…' : '正在加载简历…';
let pdf;
let zoom = 1;
let generation = 0;
let resizeTimer;

async function render() {
  if (!pdf) return;
  const current = ++generation;
  const padding = innerWidth <= 600 ? 16 : 32;
  const width = Math.max(200, document.documentElement.clientWidth - padding);
  const first = await pdf.getPage(1);
  const scale = Math.min(width / first.getViewport({ scale: 1 }).width, 1.5) * zoom;
  if (current !== generation) return;
  pages.replaceChildren();
  parent.postMessage({ type: 'resume-state', pages: pdf.numPages, zoom }, location.origin);
  for (let index = 1; index <= pdf.numPages; index++) {
    const page = await pdf.getPage(index);
    if (current !== generation) return;
    const viewport = page.getViewport({ scale });
    const sheet = document.createElement('section');
    sheet.className = 'pdf-page';
    sheet.setAttribute('aria-label', en ? `Page ${index}` : `第 ${index} 页`);
    sheet.style.width = `${viewport.width}px`;
    sheet.style.height = `${viewport.height}px`;
    sheet.style.setProperty('--scale-factor', String(scale));
    sheet.style.setProperty('--user-unit', String(viewport.userUnit));
    sheet.style.setProperty('--total-scale-factor', String(scale * viewport.userUnit));
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * ratio);
    canvas.height = Math.floor(viewport.height * ratio);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    sheet.append(canvas);
    pages.append(sheet);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport, transform: [ratio, 0, 0, ratio, 0, 0] }).promise;
    if (current !== generation) return;
    const text = document.createElement('div');
    text.className = 'textLayer';
    sheet.append(text);
    await new TextLayer({ textContentSource: await page.getTextContent(), container: text, viewport }).render();
  }
  status.hidden = true;
}

function reportError() {
  status.hidden = false;
  status.textContent = en ? 'Preview could not load. Use “Open separately” above to read the PDF.' : '预览暂时无法加载，可点击上方“新窗口打开”阅读 PDF。';
}
window.addEventListener('message', (event) => {
  if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'resume-action' || !pdf) return;
  if (event.data.action === 'out') zoom = Math.max(0.6, Math.round((zoom - 0.2) * 10) / 10);
  else if (event.data.action === 'in') zoom = Math.min(2, Math.round((zoom + 0.2) * 10) / 10);
  else if (event.data.action === 'fit') zoom = 1;
  else return;
  render().catch(reportError);
});
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => render().catch(reportError), 150); });
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') parent.postMessage({ type: 'resume-close' }, location.origin);
});
try {
  pdf = await getDocument({
    url: pdfUrl.href,
    cMapUrl: new URL('./vendor/pdfjs/cmaps/', import.meta.url).href,
    cMapPacked: true,
    standardFontDataUrl: new URL('./vendor/pdfjs/standard_fonts/', import.meta.url).href,
    wasmUrl: new URL('./vendor/pdfjs/wasm/', import.meta.url).href,
  }).promise;
  await render();
} catch { reportError(); }
