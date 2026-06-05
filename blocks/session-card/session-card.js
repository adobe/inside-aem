import { createOptimizedPicture } from '../../scripts/lib-franklin.js';

/**
 * Build a session card.
 *
 * Used inside `session-feed` to render each row from /en/aicoc-index.json.
 * Pattern mirrors `buildArticleCard` in scripts.js — returns DOM directly so
 * the feed block can paginate cheaply without redecorating.
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
  card.href = path;

  // ── media ─────────────────────────────────────────────────────────────
  const media = document.createElement('div');
  media.className = 'session-card-media';

  if (image) {
    const picture = createOptimizedPicture(image, imageAlt || title, eager, [{ width: '600' }]);
    media.append(picture);
  } else {
    // Visual placeholder so cards line up even without a hero image.
    const placeholder = document.createElement('div');
    placeholder.className = 'session-card-placeholder';
    placeholder.setAttribute('aria-hidden', 'true');
    media.append(placeholder);
  }

  // Format badge (first tag — e.g. "Brownbag", "Deep Dive").
  const format = tags[0];
  if (format) {
    const badge = document.createElement('span');
    badge.className = 'session-card-format';
    badge.textContent = format;
    media.append(badge);
  }

  // Play-button overlay so the recording affordance is visible.
  // The inner <span class="icon icon-play"> is swapped for the inline SVG by
  // decorateIcons() in session-feed.js after the card is appended.
  media.insertAdjacentHTML(
    'beforeend',
    '<span class="session-card-play" aria-hidden="true"><span class="icon icon-play"></span></span>',
  );

  // ── body ──────────────────────────────────────────────────────────────
  const body = document.createElement('div');
  body.className = 'session-card-body';

  const titleEl = document.createElement('h3');
  titleEl.className = 'session-card-title';
  titleEl.textContent = title || '';
  body.append(titleEl);

  if (description) {
    const descEl = document.createElement('p');
    descEl.className = 'session-card-description';
    descEl.textContent = description;
    body.append(descEl);
  }

  const meta = document.createElement('p');
  meta.className = 'session-card-meta';
  const parts = [];
  if (sessionDate) parts.push(`<span class="session-card-date">${sessionDate}</span>`);
  if (presenter) parts.push(`<span class="session-card-presenter">${presenter}</span>`);
  meta.innerHTML = parts.join('<span class="session-card-sep">·</span>');
  body.append(meta);

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
