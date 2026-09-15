# Goal 4 — AI-Searchable Knowledge Hub: How We Got Here

**Status as of 2026-09-15:** live on two pages — the homepage (`index.docx`) and the AI CoC hub (`aicochub.docx`) — both backed by FluffyJaws, Adobe's internal LLM platform. Visitors can ask a question in plain English and get a synthesized answer with clickable sources, drawn from every Inside AEM blog post and AI CoC session write-up/transcript.

This document is a narrative summary of what was built and why. For the live, granular status tracker (what's checked off, what's still open, dated findings), see [goal4-checklist.md](goal4-checklist.md). For the original architecture decisions, see [goal4-implementation-plan.md](goal4-implementation-plan.md).

---

## The goal

One search experience, two placements:

- **Homepage** (`re-think.adobe.com` / `culture-tecture.adobe.com`) — a compact search box: ask a question, get a short answer, optionally view sources. Scoped to Blog, AI CoC, or both.
- **AI CoC Hub** (`/en/aicochub`) — a fuller, multi-turn chat experience with source cards, scoped to AI CoC sessions by default, sitting alongside the hub's existing browse/filter feed.

No backend. The browser calls FluffyJaws's API directly, authenticated per-visitor via Okta.

## Architecture, end to end

```
Browser (Adobe-SSO-gated page)
  → OAuth Authorization Code + PKCE redirect to Adobe Okta
      (silent for visitors already signed into Okta corporate-wide — confirmed, no visible login screen)
  → browser holds a short-lived per-visitor Okta access token
    → FluffyJaws /api/v1/stream (Authorization: Bearer <token>)
      → FluffyPack (one of three: inside-aem-all / inside-aem-blog / inside-aem-aicoc)
      → answer streamed back as Server-Sent Events, citations resolved client-side
  → rendered inline in the block, as real Markdown (headers, bold, links, lists)
```

### Why no backend

FluffyJaws documents four auth options. Three need a server-held secret. The fourth — a public OAuth client using PKCE — is designed to be safe directly in browser JavaScript, and per-visitor tokens mean each visitor gets their own rate-limit budget instead of the whole site sharing one. That's the path this uses.

### The registered app, exactly

- **Okta app:** `inside-aem-knowledge-hub`, Client ID `0oa28nqie1kVri8670h8`, OIDC Single Page Application, PKCE, no client secret, Data Classification "Confidential", Environment "Production".
- **Issuer:** `https://adobe.okta.com` — authorize at `/oauth2/v1/authorize`, exchange the code at `/oauth2/v1/token`, verify ID token signatures against `/oauth2/v1/keys`.
- **Redirect URIs (all four, exact matches required):** `https://culture-tecture.adobe.com/`, `https://re-think.adobe.com/`, `https://culture-tecture.adobe.com/en/aicochub`, `https://re-think.adobe.com/en/aicochub`.
- **FluffyJaws integration:** `inside-aem-knowledge-hub`, registered at `fluffyjaws.adobe.com/integrations/apps` (a different tool from the FluffyPack/data-source config app), CORS origins `https://culture-tecture.adobe.com` and `https://re-think.adobe.com`.
- **Production API host:** `https://api.fluffyjaws.adobe.com/api/v1/stream`.

### The three code modules

- **`scripts/fluffyjaws-auth.js`** — the PKCE login flow.
  - `login()` generates a fresh `code_verifier`/`code_challenge`/`state`/`nonce`, stores them in `sessionStorage`, and redirects to the authorize endpoint. The `redirect_uri` it sends is computed as `window.location.origin + window.location.pathname` — i.e. whichever of the four registered pages the visitor is actually on — rather than a hardcoded value.
  - `handleRedirectCallback()` runs when the page reloads with `?code=&state=` in the URL: checks `state` matches what was stored, `POST`s to the token endpoint (`grant_type=authorization_code`, `client_id`, `redirect_uri`, `code`, `code_verifier` — no secret, since this is a public client), then validates the returned ID token itself: issuer matches, `aud` contains the client ID, signature verifies against a key fetched from the JWKS endpoint, `exp` hasn't passed, and `nonce` matches if one was sent.
  - `getAccessToken()` is the one export the blocks actually call: returns a cached valid token, or completes a callback if one is pending, or calls `login()` (which navigates away — callers must handle a `null`/never-resolving return, not assume synchronous completion).
- **`scripts/fluffyjaws-client.js`** — calls `/api/v1/stream` and hand-parses the response as Server-Sent Events (`EventSource` can't do POST or custom headers). Request body is `{ messages: [...history, { role: 'user', content: message }], fluffyPackSlug, webSearchEnabled: false }` — `messages` is the only field the API actually requires. Response frames are `data: {"type": "...", ...}\n\n` (no `event:` line — the type lives inside the JSON payload, OpenAI-Responses-API style); `[DONE]` is always the last line. Enforces the documented timeouts (30s to first event, 90s idle between events) via an internal watchdog that aborts the fetch, and treats the `error` event type as the real failure signal — a stream failure still returns HTTP 200, so the status code alone can't be trusted.
- **`scripts/fluffyjaws-citations.js`** — resolves whatever citation a FluffyJaws answer contains into a real, clickable public URL. This turned out to be the trickiest part — see "What we learned the hard way" below for exactly what it has to work around.

### The two blocks

- **`blocks/knowledge-search/`** — the homepage block. Single question in, single answer out, a scope dropdown, and a "View sources" list. Uses the site's own indigo accent.
- **`blocks/knowledge-hub-search/`** — the AI CoC hub block. Holds a client-side conversation history and resends the full transcript each turn (simpler and more robust than the API's optional `previousResponseId` shortcut). Upgrades bare citation links into real source cards (title, kind, presenter/author) by matching them against the site's own content indexes. Styled red/black/white, matching the hub's existing brand direction — the site-wide indigo button style is explicitly overridden here.

Both blocks render the streamed answer as actual Markdown (headers, bold, bullet lists, links) via a small shared renderer (`scripts/markdown.js`), not as raw text — FluffyJaws's own system prompt requires it to answer in Markdown, so the alternative was showing visitors literal `###` and `**` characters.

## What had to be set up outside the code

None of this is in git — it's all manual configuration in web UIs. In order:

1. **Register the Okta app**, at `https://oss.corp.adobe.com/okta/` → "Register New Application" → OpenID Connect → OIDC Application Type "Single Page Application". Filled in: name, description, Data Classification "Confidential", "Is this a third party application?" No, Environment "Production", the four redirect URIs (primary + three under "Other Sign-in redirect URIs"), "Application Access" left blank initially. Accept the OIDC token-validation compliance dialog it requires before finishing — that's exactly what `fluffyjaws-auth.js`'s ID-token validation satisfies. Copy the resulting Client ID off the app's own detail page — the creation confirmation screen showed it as "undefined" on the first attempt (a tool bug); the app's detail page always has the real value.
   - **Gotcha:** leaving "Application Access" blank auto-created an empty access group with only the creator as a member — nobody else could log in until IT support (via a filed ticket) set the app's own access field to "All" directly. The group itself turned out to be unrelated once that happened.
2. **Register the FluffyJaws integration**, at `https://fluffyjaws.adobe.com/integrations/apps` (a separate tool from the FluffyPack config app) → "Create a registration": application name, an external application ID (any stable unique string), the Okta Client ID from step 1, a description, and the two CORS origins.
3. **Register the SharePoint sources and build the FluffyPacks**, in the main FluffyJaws app:
   - First, share both SharePoint folders (`content/en/publish/` and `content/en/aicoc/`) with the service account `aemcswrkspce@adobe.com` — FluffyJaws refuses to index anything not shared with it first.
   - New FluffyPack → Knowledge step → "Add source" → "Attach exact SharePoint file" (despite the name, it accepts a folder URL) → paste the canonical `.../Shared Documents/content/en/...` folder path → "Include subfolders" → classify sensitivity ("No" here, since this is internal-but-not-restricted content any Adobe employee can already see) → check the authorization confirmation → "Add source".
   - Repeat for three packs: `inside-aem-all` (both sources), `inside-aem-blog` (publish source only), `inside-aem-aicoc` (aicoc source only). Access left at the default "Everyone at Adobe".
   - **Gotcha:** the creation wizard can report a source as added when it silently wasn't — verify via each pack's own settings page afterward (Knowledge card should say "N searchable sources"), not by trusting the wizard's in-progress state.
4. **Prep the transcripts, then register `content/en/aicoc/`.** Add a `Source session write-up: https://culture-tecture.adobe.com/en/aicoc/<slug>` line near the top of every AI CoC session transcript doc, and make sure every write-up docx itself uses a clean URL-safe slug as its filename (a handful were still under raw meeting-title filenames and had to be renamed first, since a docx's filename becomes its published URL path directly). Do this *before* registering the source, not after — the source is registered once, but re-indexing the SharePoint content into FluffyJaws is asynchronous and roughly daily.
5. **Place the blocks.** In SharePoint, open `index.docx` and `aicochub.docx`, insert a table, and type the block name (`Knowledge Search` / `Knowledge Hub Search`) as the only content in the first cell — EDS maps that name to the matching `blocks/<name>/` folder automatically. Preview, then Publish, via the AEM Sidekick browser extension.

## What we learned the hard way

A few things only became clear by testing against the real, live system rather than the documentation alone:

1. **FluffyJaws never returns structured citations.** The API's `annotations` field (its equivalent of a citation slot) came back empty on every real request we captured — confirmed by capturing an actual raw SSE stream against the live `inside-aem-aicoc` pack (via `curl`, using a manually-completed PKCE exchange). Citations only ever appear as plain text embedded in the answer, as a raw SharePoint document link like `https://adobe.sharepoint.com/sites/InsideAEM/Shared Documents/content/en/aicoc/<filename>.docx` — never a link to the public site. `fluffyjaws-citations.js` handles this in two steps: a regex pulls out both that raw SharePoint pattern and any already-public `culture-tecture.adobe.com`/`re-think.adobe.com` links from the answer text; then, for a raw SharePoint URL, it takes the filename, strips `.docx` and a trailing `-transcript`, and looks that slug up against the site's own `/en/query-index.json` (blog) and `/en/aicoc-index.json` (AI CoC) indexes to find the real public page. Unresolvable links are dropped rather than shown broken. It also has to tolerate a real, observed malformed-Markdown pattern — `[[AI CoC] Session Title](url)` — since many session titles themselves start with a bracketed prefix, which a naive link regex can't parse correctly without allowing one level of nested brackets.
2. **The transcript annotation line doesn't reliably change what gets cited.** Even with `Source session write-up: <url>` embedded in a transcript, a real captured answer still cited the raw transcript file. The citation-resolution fix above works regardless of that, so it wasn't a blocker — just a reminder not to assume a text hint controls model behavior.
3. **FluffyPack creation can silently fail to save its sources.** Two of the three packs came out of the creation wizard with zero attached sources despite the wizard visually showing them added — only caught by checking each pack's own settings page afterward, not by trusting the creation flow.
4. **SharePoint sources need to be shared with a service account first** (`aemcswrkspce@adobe.com`) — not mentioned in the original plan, discovered only when the registration UI itself said so.
5. **Section spacing bugs need the real DOM, not assumptions.** A `:has()`-based CSS selector silently failed to apply on the live site for reasons never fully pinned down; switching to a directly-confirmed class name fixed it. Several rounds of visual polish (spacing, alignment, a wrapping label) only got resolved by inspecting the actual live page rather than guessing from a screenshot.

## What's still open

See [goal4-checklist.md](goal4-checklist.md) for the complete, current list. In short: full Phase 4 validation (rate-limit behavior under load, freshness measurement, usage-view confirmation), Phase 5 analytics (a dashboard tab, click-through instrumentation), and the formal Phase 7 launch review are all still ahead. The code itself, and both live placements, are done and working.
