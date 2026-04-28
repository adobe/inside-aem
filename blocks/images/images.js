import { buildFigure } from '../../scripts/scripts.js';

function buildColumns(rowEl, count) {
  const columnEls = Array.from(rowEl.children);
  columnEls.forEach((columnEl) => {
    const figEl = buildFigure(columnEl);
    columnEl.remove();
    rowEl.append(figEl);
  });
  rowEl.classList.add('images-list', `images-list-${count}`);
}

function openOverlay(imgSrc) {
  const overlay = document.createElement('div');
  overlay.className = 'images-overlay';
  const close = document.createElement('button');
  close.className = 'images-overlay-close';
  close.setAttribute('aria-label', 'Close');
  close.textContent = '×';
  const img = document.createElement('img');
  img.src = imgSrc;
  overlay.append(close, img);
  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add('images-overlay-open'));

  let onKey;
  const dismiss = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  onKey = (e) => { if (e.key === 'Escape') dismiss(); };
  close.addEventListener('click', dismiss);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) dismiss(); });
  document.addEventListener('keydown', onKey);
}

function decorateShowOriginal(blockEl) {
  blockEl.querySelectorAll('picture img').forEach((img) => {
    const originalSrc = img.src.split('?')[0];
    const a = document.createElement('a');
    a.href = originalSrc;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      openOverlay(originalSrc);
    });
    img.parentElement.replaceWith(a);
    a.append(img);
  });
}

export default function decorateImages(blockEl) {
  const blockCount = blockEl.firstElementChild.childElementCount;
  if (blockCount > 1) {
    buildColumns(blockEl.firstElementChild, blockCount);
  } else {
    const figEl = buildFigure(blockEl.firstElementChild.firstElementChild);
    blockEl.innerHTML = '';
    blockEl.append(figEl);
  }
  if (blockEl.classList.contains('show-original')) {
    decorateShowOriginal(blockEl);
  }
}
