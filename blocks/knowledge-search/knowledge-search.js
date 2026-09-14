/**
 * Homepage compact knowledge-hub search — one-line question in, streamed
 * answer preview, "view sources" expansion. See docs/goal4-implementation-plan.md
 * (Phase 3) and docs/goal4-checklist.md for the architecture this implements.
 *
 * Single-turn only (no client-side conversation history) — the fuller,
 * multi-turn AI CoC hub variant is a separate block.
 */

import { getAccessToken, isAuthenticated } from '../../scripts/fluffyjaws-auth.js';
import streamFluffyJawsQuery, { isRateLimited } from '../../scripts/fluffyjaws-client.js';
import resolveCitations from '../../scripts/fluffyjaws-citations.js';

const PACK_BY_SCOPE = {
  '': 'inside-aem-all',
  blog: 'inside-aem-blog',
  aicoc: 'inside-aem-aicoc',
};

// Survives the Okta login redirect (a full page navigation away and back),
// so a search the visitor typed before we knew they needed to sign in
// resumes automatically once they land back here.
const PENDING_KEY = 'fj:knowledge-search:pending';

function renderSources(list, sources) {
  list.innerHTML = '';
  sources.forEach(({ url, title }) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = url;
    a.textContent = title || url.replace(/^https:\/\//, '');
    li.append(a);
    list.append(li);
  });
}

export default function decorate(block) {
  block.innerHTML = '';

  // ── controls (search + scope) ──
  const form = document.createElement('form');
  form.className = 'knowledge-search-form';

  const field = document.createElement('label');
  field.className = 'knowledge-search-field';
  field.innerHTML = '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">'
    + '<path d="M14 2A8 8 0 0 0 7.4 14.5L2.4 19.4a1.5 1.5 0 0 0 2.1 2.1L9.5 16.6A8 8 0 1 0 14 2Zm0 14.1A6.1 6.1 0 1 1 20.1 10 6.1 6.1 0 0 1 14 16.1Z"/>'
    + '</svg>';
  const input = document.createElement('input');
  input.type = 'search';
  input.required = true;
  input.placeholder = 'Ask about a blog post or AI CoC session…';
  input.setAttribute('aria-label', 'Search the Inside AEM knowledge hub');
  field.append(input);

  const scopeSelect = document.createElement('select');
  scopeSelect.className = 'knowledge-search-scope';
  scopeSelect.setAttribute('aria-label', 'Search scope');
  [['', 'All'], ['blog', 'Blog'], ['aicoc', 'AI CoC']].forEach(([value, label]) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    scopeSelect.append(opt);
  });

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = 'Search';

  form.append(field, scopeSelect, submitBtn);

  // ── status + answer ──
  const status = document.createElement('p');
  status.className = 'knowledge-search-status';
  status.setAttribute('aria-live', 'polite');

  const answerWrap = document.createElement('div');
  answerWrap.className = 'knowledge-search-answer';
  answerWrap.hidden = true;

  const answerText = document.createElement('p');
  answerText.className = 'knowledge-search-answer-text';

  const sourcesToggle = document.createElement('button');
  sourcesToggle.type = 'button';
  sourcesToggle.className = 'knowledge-search-sources-toggle';
  sourcesToggle.textContent = 'View sources';
  sourcesToggle.hidden = true;
  sourcesToggle.setAttribute('aria-expanded', 'false');

  const sourcesList = document.createElement('ul');
  sourcesList.className = 'knowledge-search-sources';
  sourcesList.hidden = true;

  answerWrap.append(answerText, sourcesToggle, sourcesList);
  block.append(form, status, answerWrap);

  sourcesToggle.addEventListener('click', () => {
    const expanded = sourcesToggle.getAttribute('aria-expanded') === 'true';
    sourcesToggle.setAttribute('aria-expanded', String(!expanded));
    sourcesList.hidden = expanded;
    sourcesToggle.textContent = expanded ? 'View sources' : 'Hide sources';
  });

  let activeAbort = null;

  async function runSearch(query, scope) {
    activeAbort?.abort();
    const abort = new AbortController();
    activeAbort = abort;

    answerWrap.hidden = false;
    answerText.textContent = '';
    sourcesToggle.hidden = true;
    sourcesToggle.setAttribute('aria-expanded', 'false');
    sourcesList.hidden = true;
    sourcesList.innerHTML = '';
    status.textContent = 'Searching…';
    submitBtn.disabled = true;

    let accessToken;
    try {
      accessToken = await getAccessToken();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('knowledge-search: auth failed', err);
      status.textContent = 'Sign-in failed — please try again.';
      submitBtn.disabled = false;
      return;
    }
    // A falsy token means getAccessToken() just kicked off the Okta login
    // redirect — the page is navigating away. Leave PENDING_KEY in place so
    // the search resumes once we land back here; do not clear it below.
    if (!accessToken) return;
    sessionStorage.removeItem(PENDING_KEY);

    let fullText = '';
    try {
      // eslint-disable-next-line no-restricted-syntax
      for await (const event of streamFluffyJawsQuery({
        accessToken,
        message: query,
        fluffyPackSlug: PACK_BY_SCOPE[scope],
        signal: abort.signal,
      })) {
        if (event.type === 'response.output_text.delta') {
          // Field name confirmed against a real captured stream —
          // see docs/goal4-checklist.md, Phase 3.
          fullText += event.delta ?? event.text ?? '';
          answerText.textContent = fullText;
          status.textContent = '';
        }
      }
    } catch (err) {
      if (abort.signal.aborted) return; // superseded by a newer search
      // eslint-disable-next-line no-console
      console.error('knowledge-search: FluffyJaws request failed', err);
      status.textContent = isRateLimited(err)
        ? 'Too many searches right now — please wait a moment and try again.'
        : 'Something went wrong answering that — please try again.';
      submitBtn.disabled = false;
      return;
    }

    submitBtn.disabled = false;
    if (!fullText) {
      status.textContent = "Didn't get an answer for that — try rephrasing.";
      return;
    }

    const sources = await resolveCitations(fullText);
    if (sources.length) {
      renderSources(sourcesList, sources);
      sourcesToggle.hidden = false;
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) return;
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ query, scope: scopeSelect.value }));
    runSearch(query, scopeSelect.value);
  });

  // Resume a search that was interrupted by an Okta login redirect. Only
  // fires when there's actually something to resume — visiting the
  // homepage never triggers a login on its own, only submitting a search
  // does (via getAccessToken() inside runSearch above).
  const pending = sessionStorage.getItem(PENDING_KEY);
  if (pending) {
    const returningFromOkta = new URLSearchParams(window.location.search).has('code');
    if (returningFromOkta || isAuthenticated()) {
      const { query, scope } = JSON.parse(pending);
      input.value = query;
      scopeSelect.value = scope;
      runSearch(query, scope);
    }
  }
}
