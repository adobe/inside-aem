import { getMetadata, createOptimizedPicture, decorateIcons } from '../../scripts/lib-franklin.js';

// Icon markers — replaced with inline SVG by decorateIcons() at end of decorate.
// SVG sources live in /icons/<name>.svg.
const icon = (name) => `<span class="icon icon-${name}"></span>`;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('data-')) node.setAttribute(k, v);
    else node[k] = v;
  });
  children.flat().forEach((c) => {
    if (c == null) return;
    node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

/**
 * Best-effort parse of the site's MM-DD-YYYY publication-date strings.
 * Returns a Date or null.
 */
function parseSessionDate(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  // MM-DD-YYYY or MM/DD/YYYY (Safari-safe via slashes)
  const m = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const [, mm, dd, yyyy] = m;
    return new Date(Date.UTC(+yyyy, +mm - 1, +dd));
  }
  // Excel serial fallback (matches scripts.js formatLocalCardDate logic)
  if (/^\d+$/.test(trimmed)) {
    return new Date(Math.round((Number(trimmed) - (1 + 25567 + 1)) * 86400 * 1000));
  }
  return null;
}

function formatSessionDate(raw) {
  const d = parseSessionDate(raw);
  if (!d) return raw || '';
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

function splitCommaList(raw) {
  if (!raw) return [];
  return String(raw).split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Build the recording button — opens the recording in a new tab.
 * SharePoint URLs get a "Watch on SharePoint" label; everything else gets
 * "Watch recording".
 */
function buildRecording(url) {
  if (!url) return null;
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch (_) {
    // Malformed URL — fall through with empty host; we still render the link.
  }
  const label = host.includes('sharepoint.com') ? 'Watch on SharePoint' : 'Watch recording';
  return el('a', {
    class: 'btn btn-primary',
    href: url,
    target: '_blank',
    rel: 'noopener',
    html: `${icon('play')}<span>${label}</span>`,
  });
}

function buildDeckButton(url) {
  if (!url) return null;
  return el('a', {
    class: 'btn btn-secondary',
    href: url,
    target: '_blank',
    rel: 'noopener',
    html: `${icon('download')}<span>Slides</span>`,
  });
}

function buildSlackButton(slack) {
  if (!slack) return null;
  const trimmed = String(slack).trim();
  const isUrl = /^https?:\/\//i.test(trimmed);
  const label = isUrl ? 'Join the discussion' : trimmed;
  return el('a', {
    class: 'btn btn-tertiary',
    href: isUrl ? trimmed : '#',
    target: '_blank',
    rel: 'noopener',
    html: `${icon('slack')}<span>${label}</span>`,
  });
}

function buildPresenters(presenterStr) {
  const presenters = splitCommaList(presenterStr);
  if (!presenters.length) return null;
  const avatars = el('div', { class: 'session-header-avatars' });
  presenters.slice(0, 3).forEach((name) => {
    const initials = name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2)
      .join('')
      .toUpperCase();
    avatars.append(el('span', { class: 'session-header-avatar', title: name }, initials));
  });
  return el(
    'div',
    { class: 'session-header-presenters' },
    avatars,
    el('span', { class: 'session-header-presenter-names' }, presenters.join(' & ')),
  );
}

function buildPills(tags) {
  if (!tags.length) return null;
  const row = el('div', { class: 'session-header-pills' });
  // First tag = format (Brownbag, Deep Dive, etc.) — gets the accent pill style.
  tags.forEach((tag, i) => {
    const cls = i === 0 ? 'session-header-pill session-header-pill-format' : 'session-header-pill';
    row.append(el('span', { class: cls }, tag));
  });
  return row;
}

export default function decorate(block) {
  // Pull session metadata from the page head.
  const meta = {
    presenter: getMetadata('presenter'),
    sessionDate: getMetadata('session-date'),
    recording: getMetadata('recording'),
    deck: getMetadata('deck'),
    slack: getMetadata('slack'),
  };
  const author = getMetadata('author');
  const description = getMetadata('description');
  const tags = getMetadata('article:tag', true) || [];

  // Borrow the h1 from <main>. The first picture has already been moved into
  // the block by buildSessionHeader() in scripts.js (it has to happen there,
  // before buildImageBlocks wraps the picture in an <images> block which our
  // decorator would otherwise fail to find).
  const main = block.closest('main') || document.querySelector('main');
  const h1 = main.querySelector('h1');
  const figureSlot = block.querySelector('.session-header-figure-slot');
  const heroPicture = figureSlot ? figureSlot.querySelector('picture') : null;

  // Fall back to author when presenter wasn't filled in.
  const presenterText = meta.presenter || author || '';

  // ── Build the hero ────────────────────────────────────────────────────
  const breadcrumb = el(
    'nav',
    { class: 'session-header-breadcrumb', 'aria-label': 'Breadcrumb' },
    el('a', { href: '/en/aicochub' }, 'AI CoC Hub'),
    el('span', { class: 'session-header-breadcrumb-sep' }, '›'),
    el('span', { class: 'session-header-breadcrumb-current' }, formatSessionDate(meta.sessionDate) || 'Session'),
  );

  const titleEl = h1 ? h1.cloneNode(true) : el('h1', {}, 'Session');
  titleEl.classList.add('session-header-title');

  // Meta row (date · presenters).
  const metaRow = el('div', { class: 'session-header-meta-row-inline' });
  const dateText = formatSessionDate(meta.sessionDate);
  if (dateText) {
    metaRow.append(el('span', { class: 'session-header-meta-item', html: `${icon('calendar')}<span>${dateText}</span>` }));
  }
  const presenters = buildPresenters(presenterText);
  if (presenters) metaRow.append(presenters);

  // CTAs.
  const ctaRow = el('div', { class: 'session-header-ctas' });
  const watch = buildRecording(meta.recording);
  if (watch) ctaRow.append(watch);
  const deck = buildDeckButton(meta.deck);
  if (deck) ctaRow.append(deck);
  const slack = buildSlackButton(meta.slack);
  if (slack) ctaRow.append(slack);

  const heroInner = el(
    'div',
    { class: 'session-header-inner' },
    breadcrumb,
    buildPills(tags),
    titleEl,
    description ? el('p', { class: 'session-header-description' }, description) : null,
    metaRow,
    ctaRow.childNodes.length ? ctaRow : null,
  );

  const hero = el('div', { class: 'session-header-hero' }, heroInner);

  // ── Hero figure ──────────────────────────────────────────────────────
  // The picture was moved into the block by buildSessionHeader() before
  // buildImageBlocks could touch it, so it's just sitting in figureSlot.
  // Build the right-side figure card from it and clean up the slot.
  if (heroPicture) {
    const img = heroPicture.querySelector('img');
    if (img && img.src) {
      const optimised = createOptimizedPicture(img.src, img.alt || '', true, [{ width: '750' }]);
      const figure = document.createElement('figure');
      figure.className = 'session-header-figure';
      figure.append(optimised);
      hero.append(figure);
      hero.classList.add('has-figure');
    }
  }
  if (figureSlot) figureSlot.remove();

  // ── Final assembly ────────────────────────────────────────────────────
  block.innerHTML = '';
  block.append(hero);

  // Remove the original h1 from main now that the hero owns the title.
  if (h1 && h1 !== titleEl) h1.remove();

  // Swap the <span class="icon icon-*"> markers for inline SVGs from /icons/.
  decorateIcons(block);
}
