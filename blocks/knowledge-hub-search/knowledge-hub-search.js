/**
 * AI CoC hub's fuller knowledge-hub search — multi-turn conversation held
 * client-side, source cards (upgraded from bare links when a URL matches a
 * known blog article or AI CoC session), scope selector across the three
 * FluffyPacks, defaulting to AI CoC sessions (per spec §2/§8). See
 * docs/goal4-implementation-plan.md (Phase 3) / docs/goal4-checklist.md.
 *
 * Compare blocks/knowledge-search/ — the homepage's single-turn, plain-link
 * compact variant. Shares the same auth/client modules, different UI.
 */

import { getAccessToken, isAuthenticated } from '../../scripts/fluffyjaws-auth.js';
import streamFluffyJawsQuery, { isRateLimited } from '../../scripts/fluffyjaws-client.js';
import resolveCitations from '../../scripts/fluffyjaws-citations.js';
import markdownToHtml from '../../scripts/markdown.js';

const PACK_BY_SCOPE = {
  aicoc: 'inside-aem-aicoc',
  blog: 'inside-aem-blog',
  '': 'inside-aem-all',
};

const PENDING_KEY = 'fj:knowledge-hub-search:pending';

function buildSourceCard({
  url, title, kind, meta,
}) {
  const li = document.createElement('li');
  li.className = 'khs-source-card';
  const a = document.createElement('a');
  a.href = url;
  if (title) {
    const kindEl = document.createElement('span');
    kindEl.className = 'khs-source-kind';
    kindEl.textContent = kind || '';
    const titleEl = document.createElement('strong');
    titleEl.className = 'khs-source-title';
    titleEl.textContent = title;
    a.append(kindEl, titleEl);
    if (meta) {
      const metaEl = document.createElement('span');
      metaEl.className = 'khs-source-meta';
      metaEl.textContent = meta;
      a.append(metaEl);
    }
  } else {
    a.textContent = url.replace(/^https:\/\//, '');
  }
  li.append(a);
  return li;
}

// ─────────────────────────────────────────────────────────────────────────
// Block
// ─────────────────────────────────────────────────────────────────────────

export default function decorate(block) {
  block.innerHTML = '';

  const scopeWrap = document.createElement('div');
  scopeWrap.className = 'khs-scope-wrap';
  const scopeLabel = document.createElement('span');
  scopeLabel.className = 'khs-scope-label';
  scopeLabel.textContent = 'Search:';
  const scopeSelect = document.createElement('select');
  scopeSelect.className = 'khs-scope';
  scopeSelect.setAttribute('aria-label', 'Search scope');
  [['aicoc', 'AI CoC sessions'], ['blog', 'Blog'], ['', 'Everything']].forEach(([value, label]) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    scopeSelect.append(opt);
  });
  scopeWrap.append(scopeLabel, scopeSelect);

  const transcript = document.createElement('div');
  transcript.className = 'khs-transcript';

  const form = document.createElement('form');
  form.className = 'khs-form';
  const input = document.createElement('input');
  input.type = 'text';
  input.required = true;
  input.placeholder = 'Ask a follow-up, or start a new question…';
  input.setAttribute('aria-label', 'Ask the Inside AEM knowledge hub');
  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = 'Ask';
  // Scope selector sits in the same row as the question input, not on its
  // own line above it.
  form.append(scopeWrap, input, submitBtn);

  const status = document.createElement('p');
  status.className = 'khs-status';
  status.setAttribute('aria-live', 'polite');

  block.append(transcript, form, status);

  let history = [];
  let activeAbort = null;

  function appendTurn(question) {
    const turn = document.createElement('div');
    turn.className = 'khs-turn';

    const q = document.createElement('p');
    q.className = 'khs-question';
    q.textContent = question;

    const answer = document.createElement('div');
    answer.className = 'khs-answer';
    const answerText = document.createElement('div');
    answerText.className = 'khs-answer-text';
    const sourcesToggle = document.createElement('button');
    sourcesToggle.type = 'button';
    sourcesToggle.className = 'khs-sources-toggle';
    sourcesToggle.textContent = 'View sources';
    sourcesToggle.hidden = true;
    sourcesToggle.setAttribute('aria-expanded', 'false');
    const sourcesList = document.createElement('ul');
    sourcesList.className = 'khs-sources';
    sourcesList.hidden = true;

    sourcesToggle.addEventListener('click', () => {
      const expanded = sourcesToggle.getAttribute('aria-expanded') === 'true';
      sourcesToggle.setAttribute('aria-expanded', String(!expanded));
      sourcesList.hidden = expanded;
      sourcesToggle.textContent = expanded ? 'View sources' : 'Hide sources';
    });

    answer.append(answerText, sourcesToggle, sourcesList);
    turn.append(q, answer);
    transcript.append(turn);
    turn.scrollIntoView({ block: 'nearest' });

    return { answerText, sourcesToggle, sourcesList };
  }

  async function finalizeSources(fullText, sourcesToggle, sourcesList) {
    const sources = await resolveCitations(fullText);
    if (!sources.length) return;
    sourcesList.innerHTML = '';
    sources.forEach((citation) => sourcesList.append(buildSourceCard(citation)));
    sourcesToggle.hidden = false;
  }

  async function runTurn(question, scope, { answerText, sourcesToggle, sourcesList }) {
    activeAbort?.abort();
    const abort = new AbortController();
    activeAbort = abort;

    status.textContent = 'Thinking…';
    submitBtn.disabled = true;

    let accessToken;
    try {
      accessToken = await getAccessToken();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('knowledge-hub-search: auth failed', err);
      status.textContent = 'Sign-in failed — please try again.';
      submitBtn.disabled = false;
      return;
    }
    // Falsy token: getAccessToken() just started the Okta redirect. Leave
    // PENDING_KEY in place (holding the full transcript + this question) so
    // the conversation resumes, including everything asked before this
    // turn, once we land back here.
    if (!accessToken) return;
    sessionStorage.removeItem(PENDING_KEY);

    let fullText = '';
    try {
      // eslint-disable-next-line no-restricted-syntax
      for await (const event of streamFluffyJawsQuery({
        accessToken,
        message: question,
        history,
        fluffyPackSlug: PACK_BY_SCOPE[scope],
        signal: abort.signal,
      })) {
        if (event.type === 'response.output_text.delta') {
          // Field name confirmed against a real captured stream —
          // see docs/goal4-checklist.md, Phase 3.
          fullText += event.delta ?? event.text ?? '';
          answerText.innerHTML = markdownToHtml(fullText);
          status.textContent = '';
        }
      }
    } catch (err) {
      if (abort.signal.aborted) return;
      // eslint-disable-next-line no-console
      console.error('knowledge-hub-search: FluffyJaws request failed', err);
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

    history = [...history, { role: 'user', content: question }, { role: 'assistant', content: fullText }];
    await finalizeSources(fullText, sourcesToggle, sourcesList);
  }

  function savePending(question) {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({
      question, scope: scopeSelect.value, history,
    }));
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    input.value = '';
    savePending(question);
    const refs = appendTurn(question);
    runTurn(question, scopeSelect.value, refs);
  });

  // Starting a new scope mid-conversation is treated as a fresh
  // conversation — mixing turns scoped to different FluffyPacks in one
  // transcript would be a confusing (and semantically odd) thing to resend
  // as history on the next turn.
  scopeSelect.addEventListener('change', () => {
    history = [];
    transcript.innerHTML = '';
    sessionStorage.removeItem(PENDING_KEY);
  });

  // Resume a conversation interrupted by an Okta login redirect — restores
  // every prior turn, not just the one that was in flight.
  const pending = sessionStorage.getItem(PENDING_KEY);
  if (pending) {
    const returningFromOkta = new URLSearchParams(window.location.search).has('code');
    if (returningFromOkta || isAuthenticated()) {
      const restored = JSON.parse(pending);
      scopeSelect.value = restored.scope;
      history = [];
      for (let i = 0; i < restored.history.length; i += 2) {
        const userMsg = restored.history[i];
        const assistantMsg = restored.history[i + 1];
        if (!userMsg || !assistantMsg) break;
        const refs = appendTurn(userMsg.content);
        refs.answerText.innerHTML = markdownToHtml(assistantMsg.content);
        history = [...history, userMsg, assistantMsg];
        // eslint-disable-next-line no-loop-func
        finalizeSources(assistantMsg.content, refs.sourcesToggle, refs.sourcesList);
      }
      const refs = appendTurn(restored.question);
      runTurn(restored.question, restored.scope, refs);
    }
  }
}
