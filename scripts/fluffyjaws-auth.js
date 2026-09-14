/**
 * FluffyJaws browser auth (Okta SPA + PKCE, no backend).
 *
 * Goal 4 knowledge hub search calls FluffyJaws's `/api/v1/stream` directly
 * from the browser with a per-visitor Okta access token — see
 * docs/goal4-implementation-plan.md (Phase 3) for the architecture and
 * docs/goal4-checklist.md for the registered Okta app / FluffyJaws
 * integration this talks to.
 *
 * IMPORTANT: the Okta app's redirect URIs are registered for exactly four
 * pages (culture-tecture.adobe.com/, re-think.adobe.com/, and the two
 * .../en/aicochub equivalents). This module only works when the current
 * page is one of those four — there is no dedicated /auth/callback route,
 * the login flow redirects back to the page it was started from.
 */

const CLIENT_ID = '0oa28nqie1kVri8670h8';
const ISSUER = 'https://adobe.okta.com';
const AUTHORIZE_ENDPOINT = `${ISSUER}/oauth2/v1/authorize`;
const TOKEN_ENDPOINT = `${ISSUER}/oauth2/v1/token`;
const KEYS_ENDPOINT = `${ISSUER}/oauth2/v1/keys`;
const SCOPES = 'openid profile';

// Buffer so we treat a token as expired a little before Okta actually
// expires it, to avoid firing off a FluffyJaws request with a token that
// dies mid-flight.
const EXPIRY_LEEWAY_MS = 30 * 1000;

const STORAGE = {
  verifier: 'fj:pkce:verifier',
  state: 'fj:pkce:state',
  nonce: 'fj:pkce:nonce',
  session: 'fj:session',
};

let jwksCache = null; // memoized JWKS fetch, shared by every validation call

// ─────────────────────────────────────────────────────────────────────────
// base64url + PKCE helpers
// ─────────────────────────────────────────────────────────────────────────

function base64UrlEncode(bytes) {
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecodeToBytes(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function base64UrlDecodeToJSON(str) {
  const bytes = base64UrlDecodeToBytes(str);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function randomString(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function sha256Base64Url(input) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return base64UrlEncode(new Uint8Array(digest));
}

// ─────────────────────────────────────────────────────────────────────────
// ID token validation
// Per the Okta app-registration's "OIDC token Validation Instructions"
// agreement: validate issuer, audience, signature (via /keys), expiry, and
// nonce (when one was sent) before trusting anything in the ID token.
// ─────────────────────────────────────────────────────────────────────────

async function fetchJwks() {
  if (jwksCache) return jwksCache;
  const resp = await fetch(KEYS_ENDPOINT);
  if (!resp.ok) throw new Error(`fluffyjaws-auth: failed to fetch JWKS (${resp.status})`);
  const { keys } = await resp.json();
  jwksCache = keys;
  return keys;
}

async function verifySignature(signingInput, signatureB64Url, kid) {
  const keys = await fetchJwks();
  const jwk = keys.find((k) => k.kid === kid);
  if (!jwk) throw new Error('fluffyjaws-auth: no matching JWKS key for ID token');
  if (jwk.alg && jwk.alg !== 'RS256') {
    throw new Error(`fluffyjaws-auth: unsupported ID token signing algorithm ${jwk.alg}`);
  }
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    base64UrlDecodeToBytes(signatureB64Url),
    new TextEncoder().encode(signingInput),
  );
  if (!valid) throw new Error('fluffyjaws-auth: ID token signature verification failed');
}

async function validateIdToken(idToken, expectedNonce) {
  const [headerB64, payloadB64, signatureB64] = idToken.split('.');
  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new Error('fluffyjaws-auth: malformed ID token');
  }
  const header = base64UrlDecodeToJSON(headerB64);
  const payload = base64UrlDecodeToJSON(payloadB64);

  await verifySignature(`${headerB64}.${payloadB64}`, signatureB64, header.kid);

  if (payload.iss !== ISSUER) throw new Error('fluffyjaws-auth: ID token issuer mismatch');
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!audiences.includes(CLIENT_ID)) throw new Error('fluffyjaws-auth: ID token audience mismatch');
  if (Date.now() >= payload.exp * 1000) throw new Error('fluffyjaws-auth: ID token expired');
  if (expectedNonce && payload.nonce !== expectedNonce) {
    throw new Error('fluffyjaws-auth: ID token nonce mismatch');
  }
  return payload;
}

// ─────────────────────────────────────────────────────────────────────────
// Session storage (per-tab; short-lived OAuth transaction + resulting token)
// ─────────────────────────────────────────────────────────────────────────

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE.session) || 'null');
  } catch {
    return null;
  }
}

function writeSession(session) {
  sessionStorage.setItem(STORAGE.session, JSON.stringify(session));
}

function clearPkceTransaction() {
  sessionStorage.removeItem(STORAGE.verifier);
  sessionStorage.removeItem(STORAGE.state);
  sessionStorage.removeItem(STORAGE.nonce);
}

function currentRedirectUri() {
  // Must exactly match one of the four registered redirect URIs — the
  // current page, stripped of query string/hash.
  return `${window.location.origin}${window.location.pathname}`;
}

// ─────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────

/**
 * Kicks off the Authorization Code + PKCE redirect. Never returns — the
 * browser navigates away to Okta (and straight back, silently, if the
 * visitor already has a live Okta session; confirmed working 2026-09-01).
 */
async function login() {
  const verifier = randomString();
  const challenge = await sha256Base64Url(verifier);
  const state = randomString(16);
  const nonce = randomString(16);

  sessionStorage.setItem(STORAGE.verifier, verifier);
  sessionStorage.setItem(STORAGE.state, state);
  sessionStorage.setItem(STORAGE.nonce, nonce);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    scope: SCOPES,
    redirect_uri: currentRedirectUri(),
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  window.location.assign(`${AUTHORIZE_ENDPOINT}?${params.toString()}`);
}

/**
 * If the current URL is an Okta redirect back to us (?code=&state=),
 * completes the token exchange, validates the ID token, stores the
 * resulting session, and strips the OAuth params from the URL.
 * Returns the access token, or null if this isn't a callback.
 */
async function handleRedirectCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  if (!code) return null;

  const expectedState = sessionStorage.getItem(STORAGE.state);
  const verifier = sessionStorage.getItem(STORAGE.verifier);
  const nonce = sessionStorage.getItem(STORAGE.nonce);
  clearPkceTransaction();

  // Clean the URL regardless of outcome so a failed/replayed exchange
  // doesn't linger in the address bar or get bookmarked.
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete('code');
  cleanUrl.searchParams.delete('state');
  window.history.replaceState({}, '', cleanUrl);

  if (!expectedState || state !== expectedState) {
    throw new Error('fluffyjaws-auth: OAuth state mismatch (possible CSRF or stale transaction)');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    redirect_uri: currentRedirectUri(),
    code,
    code_verifier: verifier,
  });
  const resp = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!resp.ok) throw new Error(`fluffyjaws-auth: token exchange failed (${resp.status})`);
  const token = await resp.json();

  await validateIdToken(token.id_token, nonce);

  const session = {
    accessToken: token.access_token,
    expiresAt: Date.now() + (token.expires_in * 1000),
  };
  writeSession(session);
  return session.accessToken;
}

/**
 * Returns a valid access token for calling FluffyJaws, handling whichever
 * state the page is in:
 *  - already has a live session → returns it immediately
 *  - just got redirected back from Okta → completes the exchange
 *  - neither → starts the login redirect (does not return)
 *
 * Callers (the search blocks) should just `await getAccessToken()` before
 * calling FluffyJaws; on a fresh, unauthenticated visit this will navigate
 * away and back, so don't assume the calling code resumes.
 */
export async function getAccessToken() {
  const session = readSession();
  if (session && Date.now() < session.expiresAt - EXPIRY_LEEWAY_MS) {
    return session.accessToken;
  }

  const fromCallback = await handleRedirectCallback();
  if (fromCallback) return fromCallback;

  await login();
  return null; // unreachable in practice — login() navigates away
}

export function isAuthenticated() {
  const session = readSession();
  return !!session && Date.now() < session.expiresAt - EXPIRY_LEEWAY_MS;
}
