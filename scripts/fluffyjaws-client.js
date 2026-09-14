/**
 * FluffyJaws `/api/v1/stream` client — hand-rolled SSE parsing, since
 * EventSource doesn't support POST/custom headers and this call needs a
 * Bearer token (see scripts/fluffyjaws-auth.js for how that's obtained).
 *
 * Schema below is from the FluffyJaws API Guide (fluffyjaws.adobe.com/docs/api,
 * reviewed 2026-09-04) — see docs/goal4-checklist.md for how the integration
 * itself was registered.
 */

const STREAM_ENDPOINT = 'https://api.fluffyjaws.adobe.com/api/v1/stream';

// Per the API guide's "Limits, versioning, and compatibility" section.
const FIRST_EVENT_TIMEOUT_MS = 30 * 1000;
const IDLE_TIMEOUT_MS = 90 * 1000;

export class FluffyJawsError extends Error {
  constructor(message, { status, code, cause } = {}) {
    super(message);
    this.name = 'FluffyJawsError';
    this.status = status;
    this.code = code;
    if (cause) this.cause = cause;
  }
}

export function isRateLimited(err) {
  return err instanceof FluffyJawsError && err.status === 429;
}

// ─────────────────────────────────────────────────────────────────────────
// SSE frame parsing
// ─────────────────────────────────────────────────────────────────────────

/**
 * Splits one SSE frame (everything between blank-line separators) into its
 * `event:`/`data:` parts. Comment lines (keep-alives, per the guide) and any
 * other field we don't recognise (id:, retry:, ...) are ignored — forward
 * compatible, per the guide's own "ignore fields you don't recognise" note.
 */
function parseFrame(frameText) {
  const dataLines = [];
  let eventName;
  frameText.split('\n').forEach((line) => {
    if (!line || line.startsWith(':')) return; // comment / keep-alive
    if (line.startsWith('event:')) { eventName = line.slice(6).trim(); return; }
    if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
  });
  return { event: eventName, dataText: dataLines.join('\n') };
}

function buildRequestBody({
  message, history, fluffyPackSlug, fluffyPackUuid, webSearchEnabled,
}) {
  const body = {
    messages: [...history, { role: 'user', content: message }],
    // Default off: this is a scoped search over our own blog/AI CoC
    // content, not a general web-search assistant. toolsEnabled/canvasMode
    // are intentionally left untouched (platform defaults apply) — nothing
    // in this product needs them overridden.
    webSearchEnabled,
  };
  if (fluffyPackSlug) body.fluffyPackSlug = fluffyPackSlug;
  if (fluffyPackUuid) body.fluffyPackUuid = fluffyPackUuid;
  return body;
}

/**
 * Streams one chat turn from a FluffyPack.
 *
 * @param {object} options
 * @param {string} options.accessToken - per-visitor Okta token (see fluffyjaws-auth.js)
 * @param {string} options.message - the visitor's question for this turn
 * @param {Array<{role:string, content:string}>} [options.history] - prior turns;
 *   resent in full each call, per the guide's recommendation for self-contained requests
 * @param {string} [options.fluffyPackSlug] - e.g. 'inside-aem-blog' / 'inside-aem-aicoc' /
 *   'inside-aem-all'
 * @param {string} [options.fluffyPackUuid]
 * @param {boolean} [options.webSearchEnabled] - default false, see buildRequestBody
 * @param {AbortSignal} [options.signal] - lets the caller cancel (e.g. a new search
 *   superseding this one)
 * @param {(rawFrameText: string) => void} [options.onRawFrame] - called with every raw SSE
 *   frame verbatim, before parsing. Hook this up when capturing a real stream to inspect the
 *   citation format (see docs/goal4-checklist.md Phase 3 step 6) — not used in normal operation.
 * @returns {AsyncGenerator<object>} parsed event objects, each with at least a `.type`
 */
export default async function* streamFluffyJawsQuery({
  accessToken,
  message,
  history = [],
  fluffyPackSlug,
  fluffyPackUuid,
  webSearchEnabled = false,
  signal,
  onRawFrame,
} = {}) {
  const controller = new AbortController();
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', () => controller.abort(signal.reason));
  }

  let watchdog;
  const armWatchdog = (ms) => {
    clearTimeout(watchdog);
    watchdog = setTimeout(
      () => controller.abort(new DOMException('FluffyJaws stream timed out', 'TimeoutError')),
      ms,
    );
  };
  armWatchdog(FIRST_EVENT_TIMEOUT_MS);

  const resp = await fetch(STREAM_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(buildRequestBody({
      message, history, fluffyPackSlug, fluffyPackUuid, webSearchEnabled,
    })),
    signal: controller.signal,
  });

  if (!resp.ok) {
    clearTimeout(watchdog);
    let body = {};
    try {
      body = await resp.json();
    } catch {
      // error bodies are documented as always-JSON, but don't crash on a
      // non-JSON error page (proxy/edge failure etc.)
    }
    throw new FluffyJawsError(body.message || `FluffyJaws request failed (${resp.status})`, {
      status: resp.status,
      code: body.error,
    });
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const { value, done } = await reader.read();
      if (done) break;

      armWatchdog(IDLE_TIMEOUT_MS);
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

      let separatorIndex = buffer.indexOf('\n\n');
      while (separatorIndex !== -1) {
        const frameText = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        onRawFrame?.(frameText);

        if (frameText.trim()) {
          const { dataText } = parseFrame(frameText);
          if (dataText.trim() === '[DONE]') return;
          if (dataText) {
            let parsed;
            try {
              parsed = JSON.parse(dataText);
            } catch {
              parsed = { type: 'unknown', raw: dataText };
            }
            if (parsed.type === 'error') {
              throw new FluffyJawsError(parsed.message || 'FluffyJaws stream reported an error', {
                code: parsed.code,
                cause: parsed,
              });
            }
            yield parsed;
          }
        }
        separatorIndex = buffer.indexOf('\n\n');
      }
    }
    // Stream closed without a [DONE] line — the guide says [DONE] is always
    // the last line, but we don't treat an early close as fatal here; the
    // caller will simply see the generator end without a response.completed.
  } finally {
    clearTimeout(watchdog);
    reader.releaseLock();
  }
}
