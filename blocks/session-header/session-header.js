import { getMetadata, createOptimizedPicture, decorateIcons } from '../../scripts/lib-franklin.js';

/**
 * Hosts whose URLs can safely be iframe-embedded as a video player.
 * Anything else (SharePoint, intranet, unknown) renders as a "Watch recording"
 * button that opens in a new tab.
 */
const EMBEDDABLE_HOSTS = new Set([
  'web.microsoftstream.com',
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
]);

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
 * Build the recording widget. SharePoint and unknown hosts render as a
 * "Watch recording" button (opens in a new tab). Public Stream / YouTube
 * URLs become an inline iframe.
 */
function buildRecording(url) {
  if (!url) return null;
  let host = '';
  try { host = new URL(url).hostname.toLowerCase(); } catch (_) { /* malformed */ }

  if (EMBEDDABLE_HOSTS.has(host)) {
    return el(
      'div',
      { class: 'session-header-embed' },
      el('iframe', {
        src: url,
        title: 'Session recording',
        allowFullscreen: true,
        frameBorder: '0',
        allow: 'autoplay; encrypted-media; picture-in-picture',
      }),
    );
  }

  // Default: SharePoint or unknown → button (opens in a new tab)
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

function buildSidebar({
  sessionDate, presenter, recording, deck, slack,
}) {
  const rows = [];
  const addRow = (k, v) => {
    if (!v) return;
    rows.push(
      el(
        'div',
        { class: 'session-header-meta-row' },
        el('span', { class: 'session-header-meta-key' }, k),
        el('span', { class: 'session-header-meta-val', html: v }),
      ),
    );
  };
  addRow('Date', formatSessionDate(sessionDate));
  addRow('Presenters', splitCommaList(presenter).join('<br>'));
  if (recording) addRow('Recording', `<a href="${recording}" target="_blank" rel="noopener">Open ↗</a>`);
  if (deck) addRow('Slides', `<a href="${deck}" target="_blank" rel="noopener">Open ↗</a>`);
  if (slack) {
    const t = String(slack).trim();
    const href = /^https?:\/\//i.test(t) ? t : '#';
    addRow('Slack', `<a href="${href}" target="_blank" rel="noopener">${t}</a>`);
  }

  if (!rows.length) return null;
  return el(
    'aside',
    { class: 'session-header-sidebar' },
    el(
      'div',
      { class: 'session-header-sidebar-card' },
      el('h3', { class: 'session-header-sidebar-title' }, 'Session details'),
      el('div', { class: 'session-header-meta' }, ...rows),
    ),
  );
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

  // Borrow the h1 + first picture from <main> so they don't appear twice.
  const main = block.closest('main') || document.querySelector('main');
  const h1 = main.querySelector('h1');
  const heroPicture = main.querySelector('picture');

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

  // ── Optional background image ─────────────────────────────────────────
  // If the doc has a hero picture, use it as a subtle dark-tinted backdrop.
  if (heroPicture) {
    const img = heroPicture.querySelector('img');
    if (img && img.src) {
      const optimised = createOptimizedPicture(img.src, img.alt || '', true, [{ width: '1600' }]);
      optimised.classList.add('session-header-bg-picture');
      hero.prepend(optimised);
      hero.classList.add('has-bg');
      // Remove from <main> so the doc doesn't show it twice.
      heroPicture.closest('p')?.remove();
    }
  }

  // ── Final assembly ────────────────────────────────────────────────────
  block.innerHTML = '';
  block.append(hero);
  const sidebar = buildSidebar(meta);
  if (sidebar) block.append(sidebar);

  // Remove the original h1 from main now that the hero owns the title.
  if (h1 && h1 !== titleEl) h1.remove();

  // Swap the <span class="icon icon-*"> markers for inline SVGs from /icons/.
  decorateIcons(block);
}
