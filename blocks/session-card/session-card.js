import { createOptimizedPicture } from '../../scripts/lib-franklin.js';

/**
 * Format whatever the index gives us for sessionDate into a short,
 * human-readable string. Word doc cells that look like dates get serialised
 * as Excel serial numbers ("46175") by the publishing pipeline — without
 * this, the card shows the raw serial. Plain MM-DD-YYYY strings get
 * pretty-formatted too.
 */
function formatSessionDate(raw) {
  if (!raw) return '';
  const t = String(raw).trim();
  let d = null;
  const m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    d = new Date(Date.UTC(+m[3], +m[1] - 1, +m[2]));
  } else if (/^\d+$/.test(t)) {
    // Excel serial → JS Date. Same epoch math as session-feed.js.
    d = new Date(Math.round((Number(t) - (1 + 25567 + 1)) * 86400 * 1000));
  }
  if (!d || Number.isNaN(d.getTime())) return t;
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

/**
 * Build a session card.
 *
 * Used inside `session-feed` to render each row from /en/aicoc-index.json.
 * Pattern mirrors `buildArticleCard` in scripts.js — returns DOM directly so
 * the feed block can paginate cheaply without redecorating.
 *
 * Layout:
 *   ┌──────────────────────────────┐
 *   │ [AI COC]                     │  ← dark media area (gradient or image)
 *   │                              │     holds the format pill (top-left)
 *   │                              │     and the session TITLE (bottom)
 *   │  Session title goes here     │
 *   ├──────────────────────────────┤
 *   │ Short description text…      │  ← white body holds the description
 *   │                              │     and the presenter name(s).
 *   │ Presenter Names              │
 *   └──────────────────────────────┘
 *
 * @param {Object} session — one row from the index (already-typed by parseSessions in session-feed)
 * @param {boolean} eager — pass true for above-the-fold cards so the picture isn't lazy
 * @returns {HTMLAnchorElement}
 */
export function buildSessionCard(session, eager = false) {
  const {
    path,
    title,
    description,
    image,
    imageAlt,
    sessionDate,
    presenter,
    tags = [],
  } = session;

  const card = document.createElement('a');
  card.className = 'session-card';
  // Tag image-less cards so the CSS can collapse the empty 16:9 media area
  // to a compact pill strip — otherwise it's just dead space above the title.
  if (!image) card.classList.add('session-card--no-image');
  if (/brownbag/i.test(title)) card.classList.add('session-card--brownbag');
  card.href = path;

  // ── media (dark area) ────────────────────────────────────────────────
  // Holds: "AI CoC" ghost badge (top-left), title (bottom), play overlay.
  const media = document.createElement('div');
  media.className = 'session-card-media';

  if (image) {
    const picture = createOptimizedPicture(image, imageAlt || title, eager, [{ width: '600' }]);
    picture.classList.add('session-card-media-picture');
    media.append(picture);
    const scrim = document.createElement('div');
    scrim.className = 'session-card-media-scrim';
    scrim.setAttribute('aria-hidden', 'true');
    media.append(scrim);
  }

  // "AI CoC" ghost badge — always shown in the media area.
  const aiBadge = document.createElement('span');
  aiBadge.className = 'session-card-ai-badge';
  aiBadge.textContent = 'AI CoC';
  media.append(aiBadge);

  const titleEl = document.createElement('h3');
  titleEl.className = 'session-card-title';
  titleEl.textContent = title || '';
  media.append(titleEl);

  media.insertAdjacentHTML(
    'beforeend',
    '<span class="session-card-play" aria-hidden="true"><span class="icon icon-play"></span></span>',
  );

  // ── body (light area) ────────────────────────────────────────────────
  // Format badge + date, description, divider, SP avatar + presenter.
  const body = document.createElement('div');
  body.className = 'session-card-body';

  // Format badge + date row
  const formatRow = document.createElement('div');
  formatRow.className = 'session-card-format-row';
  const format = tags[0];
  if (format) {
    const badge = document.createElement('span');
    badge.className = 'session-card-format';
    badge.textContent = /brownbag/i.test(title) ? 'Brownbag' : 'Show & Tell';
    formatRow.append(badge);
  }
  const dateText = formatSessionDate(sessionDate);
  if (dateText) {
    const dateEl = document.createElement('span');
    dateEl.className = 'session-card-date';
    dateEl.textContent = dateText;
    formatRow.append(dateEl);
  }
  body.append(formatRow);

  if (description) {
    const descEl = document.createElement('p');
    descEl.className = 'session-card-description';
    descEl.textContent = description;
    body.append(descEl);
  }

  // Divider + presenter row
  const divider = document.createElement('hr');
  divider.className = 'session-card-divider';
  body.append(divider);

  const presenterRow = document.createElement('div');
  presenterRow.className = 'session-card-presenter-row';

  const avatar = document.createElement('span');
  avatar.className = 'session-card-avatar';
  avatar.textContent = 'SP';
  presenterRow.append(avatar);

  if (presenter) {
    const presenterEl = document.createElement('span');
    presenterEl.className = 'session-card-presenter';
    presenterEl.textContent = presenter;
    presenterRow.append(presenterEl);
  }
  body.append(presenterRow);

  card.append(media, body);
  return card;
}

/**
 * Standard EDS block decorator — only used if someone authors a `.session-card`
 * directly in a Word doc (uncommon). The feed block uses buildSessionCard()
 * directly instead.
 */
export default function decorate(/* block */) {
  // intentionally no-op — cards are constructed by session-feed
}
