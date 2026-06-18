import { loadCSS, decorateIcons } from '../../scripts/lib-franklin.js';
import { buildSessionCard } from '../session-card/session-card.js';

const INDEX_URL = '/en/aicoc-index.json';
const PAGE_SIZE = 12;

let cache = null; // memoized fetch result so multiple feeds on a page share data

// ─────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────

function parseTags(raw) {
  if (!raw) return [];
  return String(raw)
    .replace(/[[\]"]/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalize(row) {
  return {
    path: (row.path || '').split('.')[0],
    title: row.title || '',
    description: row.description || '',
    image: row.image || '',
    imageAlt: row.imageAlt || '',
    sessionDate: row.sessionDate || row.date || '',
    presenter: row.presenter || row.author || '',
    recording: row.recording || '',
    deck: row.deck || '',
    slack: row.slack || '',
    tags: parseTags(row.tags),
  };
}

function parseDateLoose(raw) {
  if (!raw) return null;
  const t = String(raw).trim();
  // MM-DD-YYYY or MM/DD/YYYY
  const m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return new Date(Date.UTC(+m[3], +m[1] - 1, +m[2]));
  // Excel serial
  if (/^\d+$/.test(t)) return new Date(Math.round((Number(t) - (1 + 25567 + 1)) * 86400 * 1000));
  return null;
}

async function fetchAllSessions() {
  if (cache) return cache;
  const pageSize = 500;
  const sessions = [];
  let offset = 0;
  // Loop in case there's ever >500 sessions.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const resp = await fetch(`${INDEX_URL}?limit=${pageSize}&offset=${offset}`);
    if (!resp.ok) break;
    // eslint-disable-next-line no-await-in-loop
    const json = await resp.json();
    if (!json.data) break;
    json.data.forEach((row) => sessions.push(normalize(row)));
    const consumed = (json.offset || 0) + (json.limit || json.data.length);
    if (!json.total || consumed >= json.total || json.data.length === 0) break;
    offset = consumed;
  }
  // Newest session first.
  sessions.sort((a, b) => {
    const da = parseDateLoose(a.sessionDate);
    const db = parseDateLoose(b.sessionDate);
    return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
  });
  cache = sessions;
  return sessions;
}

// ─────────────────────────────────────────────────────────────────────────
// Filtering
// ─────────────────────────────────────────────────────────────────────────

/**
 * Session format lives in the title (there are no usable tags): titles read
 * like "[AI CoC] AI Assisted Brownbag - …" or "[AI CoC] Show & Tell - …".
 */
function sessionFormat(s) {
  if (/brownbag/i.test(s.title)) return 'Brownbag';
  if (/show\s*(?:&|and)\s*tell/i.test(s.title)) return 'Show & Tell';
  return '';
}

function applyFilters(sessions, { q, presenter, format }) {
  const needle = (q || '').toLowerCase().trim();
  const presenterNeedle = (presenter || '').toLowerCase().trim();
  return sessions.filter((s) => {
    if (format && sessionFormat(s) !== format) return false;
    if (presenterNeedle && !s.presenter.toLowerCase().includes(presenterNeedle)) return false;
    if (needle) {
      const hay = `${s.title} ${s.description} ${s.presenter}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });
}

function uniquePresenters(sessions) {
  const set = new Set();
  sessions.forEach((s) => {
    s.presenter.split(',').map((p) => p.trim()).filter(Boolean).forEach((p) => set.add(p));
  });
  return [...set].sort((a, b) => a.localeCompare(b));
}

// ─────────────────────────────────────────────────────────────────────────
// URL state
// ─────────────────────────────────────────────────────────────────────────

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  return {
    q: params.get('q') || '',
    presenter: params.get('presenter') || '',
    format: params.get('format') || '',
  };
}

function writeUrlState(state) {
  const url = new URL(window.location.href);
  if (state.q) url.searchParams.set('q', state.q); else url.searchParams.delete('q');
  if (state.presenter) url.searchParams.set('presenter', state.presenter); else url.searchParams.delete('presenter');
  if (state.format) url.searchParams.set('format', state.format); else url.searchParams.delete('format');
  window.history.replaceState({}, '', url);
}

// ─────────────────────────────────────────────────────────────────────────
// Skeletons + empty state
// ─────────────────────────────────────────────────────────────────────────

function renderSkeletons(grid, count = 6) {
  grid.innerHTML = '';
  for (let i = 0; i < count; i += 1) {
    const s = document.createElement('div');
    s.className = 'session-card-skeleton';
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = `
      <div class="ssk-media"></div>
      <div class="ssk-body">
        <div class="ssk-line ssk-line-long"></div>
        <div class="ssk-line ssk-line-medium"></div>
        <div class="ssk-line ssk-line-short"></div>
      </div>
    `;
    grid.append(s);
  }
}

function renderEmpty(grid, message) {
  grid.innerHTML = '';
  const empty = document.createElement('div');
  empty.className = 'session-feed-empty';
  empty.innerHTML = `<p><strong>${message}</strong></p>`
    + '<p>Try clearing the filters or searching for a different presenter or topic.</p>';
  grid.append(empty);
}

// ─────────────────────────────────────────────────────────────────────────
// Block
// ─────────────────────────────────────────────────────────────────────────

export default async function decorate(block) {
  // Card CSS isn't auto-loaded (no .session-card block decoration on page),
  // so ensure it's present before rendering.
  loadCSS(`${window.hlx.codeBasePath}/blocks/session-card/session-card.css`);

  // Clear any author-provided content; we own the markup here.
  block.innerHTML = '';

  const state = readUrlState();

  // ── Controls (search + presenter dropdown) ──
  const controls = document.createElement('div');
  controls.className = 'session-feed-controls';

  // Search box.
  const searchWrap = document.createElement('label');
  searchWrap.className = 'session-feed-search';
  searchWrap.innerHTML = '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">'
    + '<path d="M14 2A8 8 0 0 0 7.4 14.5L2.4 19.4a1.5 1.5 0 0 0 2.1 2.1L9.5 16.6A8 8 0 1 0 14 2Zm0 14.1A6.1 6.1 0 1 1 20.1 10 6.1 6.1 0 0 1 14 16.1Z"/>'
    + '</svg>';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Search sessions by title, description, or presenter';
  searchInput.value = state.q;
  searchInput.setAttribute('aria-label', 'Search sessions');
  searchWrap.append(searchInput);

  // Presenter dropdown (populated after fetch).
  const presenterSelect = document.createElement('select');
  presenterSelect.className = 'session-feed-presenter session-feed-select';
  presenterSelect.setAttribute('aria-label', 'Filter by presenter');

  // Format dropdown (Show & Tell / Brownbag).
  const formatSelect = document.createElement('select');
  formatSelect.className = 'session-feed-format session-feed-select';
  formatSelect.setAttribute('aria-label', 'Filter by format');
  [
    ['', 'All formats'],
    ['Show & Tell', 'Show & Tell'],
    ['Brownbag', 'Brownbag'],
  ].forEach(([value, label]) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    if (value === state.format) opt.selected = true;
    formatSelect.append(opt);
  });

  // Result count badge.
  const count = document.createElement('span');
  count.className = 'session-feed-count';

  // Order: search (left, wide) · presenter · format.
  controls.append(searchWrap, presenterSelect, formatSelect, count);
  block.append(controls);

  // ── Grid ──
  const grid = document.createElement('div');
  grid.className = 'session-feed-grid';
  block.append(grid);

  // ── Load more ──
  const loadMoreWrap = document.createElement('div');
  loadMoreWrap.className = 'session-feed-load-more-wrap';
  const loadMoreBtn = document.createElement('button');
  loadMoreBtn.type = 'button';
  loadMoreBtn.className = 'session-feed-load-more';
  loadMoreBtn.textContent = 'Load more sessions';
  loadMoreWrap.append(loadMoreBtn);
  block.append(loadMoreWrap);

  // Initial skeletons while fetching.
  renderSkeletons(grid, 6);
  loadMoreWrap.hidden = true;

  // ── Fetch ──
  let sessions;
  try {
    sessions = await fetchAllSessions();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('session-feed: failed to load index', err);
    renderEmpty(grid, 'Unable to load sessions right now.');
    return;
  }

  // Populate presenter dropdown.
  const presenters = uniquePresenters(sessions);
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'All presenters';
  presenterSelect.append(allOption);
  presenters.forEach((p) => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    if (p === state.presenter) opt.selected = true;
    presenterSelect.append(opt);
  });

  // ── Rendering ──
  let visibleCount = 0;
  let filtered = [];

  function renderPage(reset) {
    if (reset) {
      visibleCount = 0;
      grid.innerHTML = '';
    }
    const end = Math.min(filtered.length, visibleCount + PAGE_SIZE);
    for (let i = visibleCount; i < end; i += 1) {
      grid.append(buildSessionCard(filtered[i], visibleCount < 6));
    }
    visibleCount = end;
    loadMoreWrap.hidden = visibleCount >= filtered.length;
    // Swap any <span class="icon icon-*"> markers (e.g. the card play overlay)
    // for inline SVGs from /icons/.
    decorateIcons(grid);
  }

  function refilter() {
    filtered = applyFilters(sessions, state);
    count.textContent = `${filtered.length} session${filtered.length === 1 ? '' : 's'}`;
    if (!filtered.length) {
      renderEmpty(grid, 'No sessions match your filters.');
      loadMoreWrap.hidden = true;
      return;
    }
    renderPage(true);
  }

  refilter();

  // ── Events ──
  let searchTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = searchInput.value.trim();
      writeUrlState(state);
      refilter();
    }, 200);
  });

  presenterSelect.addEventListener('change', () => {
    state.presenter = presenterSelect.value;
    writeUrlState(state);
    refilter();
  });

  formatSelect.addEventListener('change', () => {
    state.format = formatSelect.value;
    writeUrlState(state);
    refilter();
  });

  loadMoreBtn.addEventListener('click', () => renderPage(false));
}
