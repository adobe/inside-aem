# Goal 4 — AI-Searchable Knowledge Hub: Step-by-Step Implementation Plan

**Status:** Post-Thomas-conversation update. Supersedes the "what's left" framing in the discussion prompt — this is the working execution plan.
**Input from Thomas Cantonnet (FluffyJaws platform team):** build via a **FluffyPack**; no direct/alternative integration path offered. No detailed guidance given beyond that — most of the technical detail below still needs to come from `#fluffyjaws-enablement` or FluffyJaws docs/support.

---

## ✅ Update — Q0 resolved (2026-08-31, via Slack)

Asked Thomas directly whether a FluffyPack can be called from the website itself (not just linked out to the hosted FluffyPack UI), and flagged that the site is Adobe-SSO-gated with no anonymous audience.

**Thomas's answer:** *"technically it could be, you would have to fully build it on your website using the FJ API."*

**Reading confirmed:** this is Reading A from below — there's no drop-in widget, you build your own UI against the FJ API, and it's technically possible to do that from the website itself (not a forced redirect to `fluffyjaws.adobe.com`). This matches what §3 of the spec already assumed. Good news — the architecture holds.

**What's still open:** Thomas's answer doesn't spell out the auth mechanics. "Fully build it on your website using the FJ API" doesn't confirm whether the browser can call the FJ API directly using the visitor's existing Adobe SSO session, or whether the API still expects a service/app credential even for a client-side call. That's now the most important open question — see Q0b below, which replaces the original Q0.

---

## ⚠️ Update — Q0b resolved (2026-08-31, via Slack) — architecture change required

**Thomas's answer:** *"you don't need the user's sso login, you just need to login with your okta app that's whitelisted for FJ API use."*

**This contradicts the locked decision in spec §3/§7.** The FJ API is authenticated via an **Okta app credential** (a service-level credential registered/whitelisted for FJ API access) — not the visitor's own Adobe SSO session. This is a meaningful architecture change, not a detail:

- An Okta app credential **cannot** live in browser-side JavaScript. Anyone can open dev tools and read it straight out of the page, then call the FJ API as your app from anywhere. Client-side secrets are not a viable pattern here.
- This means the **"no backend proxy needed" assumption is no longer accurate.** A small backend component is now required, whose only job is to hold the Okta app credential and make the FJ API call on the site's behalf.
- **The visitor-facing experience is unaffected.** People still stay on the homepage/hub, type a question, and see an inline answer — the site itself remains Adobe-SSO-gated exactly as before. Only the plumbing between the browser and the FJ API changes.

**Revised architecture:**

```
Browser (Adobe-SSO-gated page, visitor's session)
  → our own lightweight backend/Edge Function
      (holds the Okta app credential server-side only)
    → FluffyJaws FJ API (Okta app auth)
      → FluffyPack → answer + citations
  → rendered inline in our EDS UI
```

**New open questions this raises — take these to `#fluffyjaws-enablement` next:**

1. **How is the Okta app credential provisioned?** Do we register our own Okta app and request FJ API whitelisting, or does the FluffyJaws platform team issue/manage this for us?
2. **What does "logging in with the Okta app" actually look like technically** — client-credentials OAuth flow, a static token, short-lived tokens we need to refresh? This determines how simple or involved the backend piece is.
3. **Where should this backend piece live?** Given the repo is an EDS static site with no existing server-side component, is an Edge Delivery Services / Adobe Edge Function appropriate, or does this need to sit on different infrastructure? (Worth asking whoever owns EDS tooling, not just the FluffyJaws team.)
4. **Rate limits/quota** — does the Okta app credential have its own request quota separate from per-user limits, and does that change anything about Q7 (rate limits) below?

**Practical effect on the plan:** Phase 3's "contingency" branch (below) is now the primary path, not a fallback. The "if Q0 confirms browser-direct" branch is no longer applicable and is kept below only for the record.

---

## ✅✅ Update — official API Guide reviewed (2026-08-31) — the no-backend path is back on the table

Read the full FluffyJaws API Guide (`fluffyjaws.adobe.com/docs/api`). It confirms **four** auth options, not just the Okta-service-token one Thomas described:

| Option | Sends | Needs a backend? |
|---|---|---|
| Browser session cookie | `Cookie: fjv3_session=...` | No, but doc explicitly says not to rely on this for real clients |
| **Service token** | `Authorization: Bearer <service-token>` (from Okta client-credentials, needs a client secret) | **Yes** — secret must stay server-side |
| Service on behalf of a user | Service token + `X-User-Token` | **Yes** — still needs the service token's secret server-side |
| **Raw user token** | `Authorization: Bearer <user-token>`, obtained via OAuth **Authorization Code + PKCE** — no client secret in the exchange at all | **No** — this is the standard "public client" OAuth pattern, designed to be safe in browser JS |

**This changes the conclusion from the Q0b update above.** Thomas's answer described the service-token path accurately, but there's a second, backend-free path he didn't mention: register a public (PKCE-capable) Okta client, register that client + your site's origins as a FluffyJaws integration for CORS, and have the browser do a standard OAuth login redirect to get a per-visitor user token, then call `/api/v1/stream` directly with that token.

The **"Calling from a browser"** section of the guide confirms this is an intended, supported pattern — not a workaround: registered origins can send credentialed cross-origin requests to `/api/v1/*`, and the guide's own advice is *"authenticate with a token rather than relying on a FluffyJaws cookie."*

**Why this is arguably the better architecture anyway, not just the simpler one:** rate limits are enforced *per identity* ("tens of chat requests per minute per identity, not hundreds"). A shared service-token identity would put your entire site's traffic under one shared budget. Per-user tokens give each visitor their own quota — much more scalable for a search box every employee might use.

**What's still open before committing to this path:**
1. ~~The guide doesn't say what *Okta application type* supports the PKCE flow~~ **RESOLVED (2026-08-31, asked FluffyJaws directly):** register an **OIDC Single Page Application** via `https://oss.corp.adobe.com/okta/` — OpenID Connect sign-on type, "Single Page Application" as the OIDC application type, PKCE flow, no client secret, redirect URI set to your site's callback. The OSS registration form supports this app type directly (distinct from the "Web Application"/confidential-client type used for the service-token path).
2. Whether the OAuth redirect flow can be made near-invisible for visitors who are already logged into Okta corporate-wide (e.g. silent/`prompt=none` authorization) — **still open**, worth testing once the app is registered rather than assuming either way.
3. ~~The "Register an Integration" doc's form asks for an "Okta client ID used for the service token" specifically~~ — **clarified:** that field is specific to the service-token registration path. Confirm when registering the SPA-based integration whether the same registration workspace has an equivalent field for a PKCE/public client, or whether it's handled differently — this is a small mechanical question, not an architecture one, best asked directly during registration rather than pre-emptively.

**One nuance worth flagging for the build itself:** Okta and Adobe IMS are two different identity systems — an Okta SPA registration produces an **Okta** access token, not an IMS token automatically. FluffyJaws's own API guide example code for the raw-user-token flow uses an Okta issuer directly (`$OKTA_ISSUER`, `$OKTA_TOKEN_URL`), so this lines up — the token FluffyJaws expects here is the Okta one, not IMS. No conflict, just worth being precise about which "user token" is meant when reading any given doc page.

**Architecture is now confirmed, no backend needed:**

```
Browser (Adobe-SSO-gated page)
  → OAuth Authorization Code + PKCE redirect to Adobe Okta
      (visitor signs in / silent-auth if already an Okta session)
  → browser holds a short-lived per-visitor Okta user token (no secret anywhere)
    → FluffyJaws stream API (Authorization: Bearer <user-token>)
      → FluffyPack → answer + citations
  → rendered inline in our EDS UI
```

This is not open anymore — it's the confirmed path for Phase 3.

### Other things this document resolved

- **Q3 — one pack vs. three:** **Resolved.** The `/api/v1/stream` request schema takes a single `fluffyPackSlug`/`fluffyPackUuid` per call, with no query-time content-source filter field. Confirms the original plan: **three separate FluffyPacks** (`inside-aem-all`, `inside-aem-blog`, `inside-aem-aicoc`).
- **Q6 — analytics beyond aggregate:** **Resolved, better than expected.** Three read-only export routes exist (`GET /api/v1/feedback/agent/:agentId`, `GET /api/v1/feedback/fluffypack/:slug-or-uuid`, `GET /api/v1/fluffypack/:slug-or-uuid/insights`) — metadata/aggregates only (never message content), access granted per integration on request. Update spec §9's assumption that FluffyJaws is aggregate-only.
- **Q7 — rate limits/timeouts:** **Resolved.** Plan for tens of chat requests/minute per identity (not hundreds); no `Retry-After` header, so build your own backoff; a stream is cut if it produces no first event within 30s or goes quiet for 90s mid-turn; 20MB per file / 30MB aggregate per request / 50 files max.
- **Q4 — citation schema:** **Still open, now with a clear next step.** Asked FluffyJaws directly (2026-08-31) — it could not verify a structured citation contract (no confirmed field like `title`/`canonicalUrl`/`sourceType`/`snippet`, no confirmed event name like `citation`/`sources`/`references`) for `/api/v1/stream`. **Do not build a production parser assuming a citation field exists.** The concrete next step: capture a real raw SSE stream from your actual FluffyPack (once built) — record every `event:` and `data:` frame including the terminal `response.completed` event — and inspect it directly rather than assuming a schema from docs. This is now a Phase 3 task, not a question to keep asking.
- **Q1/Q2 — SharePoint subfolder scoping, refresh cadence:** **Resolved as far as they can be — the answer is "plan around the limitation, don't wait for a better one."**
  - **Scoping:** current FluffyPack UI supports registering a canonical `/Shared Documents/...` folder path as a source (not a sharing link or `Doc.aspx` URL) — good, folder-level registration works. But there's **no documented exclude-subfolder rule**. Registering `content/en/aicoc/` will **not** automatically exclude `Transcripts/` underneath it. The only reliable options: move/copy `Transcripts/` outside the registered tree before registering the parent folder, or register a source scoped to a sibling structure that doesn't include it. This confirms the "physically separate Transcripts/" fallback from spec §4 is now the plan, not a fallback.
  - **Refresh cadence:** SharePoint ingestion is asynchronous, roughly **daily/overnight** — no confirmed manual re-index trigger exists. A content change can take up to ~24h to become searchable. Update spec §10's "freshness must be measured" exit criterion to expect same-day-not-instant freshness as the baseline, not a bug to chase.

<details>
<summary>Original Q0 framing (for reference)</summary>

The spec (§3, §7) locked in **browser/session auth**: the search UI calls the FluffyJaws API directly from the visitor's browser using their existing Adobe SSO session — no backend proxy, no server-held secret.

Thomas's earlier "it's a FluffyPack, not a direct integration" comment was ambiguous between two very different worlds:

| Reading | What it means for us |
|---|---|
| **A — Confirms what we assumed:** there's no drop-in widget/SDK; you consume the FluffyPack via the stream API and build your own UI (client-side, browser/session auth still applies) | No change to the plan. This is what §3 already assumed. |
| **B — Contradicts our assumption:** FluffyPacks can only be invoked from a trusted/server context (e.g. a backend service account), not directly from an end-user's browser session | We'd need a backend proxy after all — new component, new auth model, likely new questions about who runs/owns that backend |

Confirmed: Reading A.
</details>

**Do not proceed with UI build (Phase 3) until Q0b (auth mechanics) is confirmed.**

---

## Phase 0 — Lock remaining decisions (no platform dependency)

Can be done immediately, in parallel with everything else.

1. **Confirm target Q4 (which year)** and any interim checkpoint — internal decision, needs whoever owns the roadmap timeline.
2. **Decide FluffyPack ownership** — who administers the pack(s) day-to-day (re-indexing, adding sources, responding to platform-team changes) and who is the standing point of contact for `#fluffyjaws-enablement` follow-ups. Given Thomas is the entry point but not hands-on, this person becomes your actual working relationship on the platform side.

*Output: both checklist items in Phase 0 closed.*

---

## Phase 1 — Get the real answers from FluffyJaws (support/enablement channel)

Since Thomas didn't provide technical depth, treat `#fluffyjaws-enablement` (or FluffyJaws docs/support, if they have a self-serve knowledge base — worth asking Thomas if one exists) as the source for all of this. Ask in this order — question 0b blocks the architecture, the rest block Phase 2/3 build work.

**Q0 — RESOLVED (2026-08-31):** ~~When a FluffyPack is queried via the stream API, must the caller be a trusted backend/service identity, or can it be invoked directly from a browser?~~ Thomas confirmed it's technically possible to build this directly on the website using the FJ API — no forced redirect/widget model.

**Q0b (blocking, ask next):** *When calling the FJ API from our own custom UI, can the browser authenticate using the visitor's existing Adobe SSO session directly (since the site has no anonymous audience), or does the FJ API require a separate service/app credential even for a client-side call?* This is the detail that decides whether §3's "no backend proxy" architecture holds, or whether a small backend is still needed to hold a credential.

**Q1 (SharePoint scoping) — RESOLVED:** No exclude-subfolder rule exists. Register the narrowest canonical folder path; physically move/copy `Transcripts/` out of `content/en/aicoc/` before registering it as a source.

**Q2 (refresh cadence) — RESOLVED:** Ingestion is asynchronous, roughly daily/overnight. No confirmed manual trigger. Plan for up to ~24h freshness lag, not instant.

**Q3 (pack structure) — RESOLVED:** Three separate FluffyPacks (see Q3 above).

**Q4 (citation schema) — UNRESOLVED BY DOCS, resolved into an action:** No confirmed structured citation contract. Capture and inspect a real raw stream once the FluffyPack exists, rather than asking further — see Phase 3.

**Q6 (analytics) — RESOLVED:** per-integration export routes exist beyond aggregate volume (see Q6 above).

**Q7 (limits/cost) — RESOLVED:** rate limits and timeouts documented (see Q7 above). No confirmed cost/chargeback model — low priority, revisit only if usage becomes a real concern.

**Q5 (auth/CORS) — RESOLVED:** PKCE/SPA path confirmed, no backend needed (see architecture section above).

*Output: Phase 1 is functionally closed. Every checklist item under "Answer received" can be checked off, with the caveats above (no manual refresh trigger, no confirmed citation schema, no confirmed subfolder exclusion) carried forward as known constraints rather than open questions.*

---

## Phase 2 — FluffyPack setup (unblocked — all Phase 1 questions closed)

1. **Before registering `content/en/aicoc/`:** move or copy `Transcripts/` out of that folder tree (to a sibling location, e.g. `content/en/aicoc-transcripts-staging/` or similar, outside anything you're about to register). No exclude-subfolder mechanism exists, so this physical separation is required, not optional.
2. Register `content/en/publish/` as a FluffyJaws source, using the canonical `/Shared Documents/...` folder path (not a sharing link or `Doc.aspx` URL).
3. Register the now-transcript-free `content/en/aicoc/` as a second FluffyJaws source, same canonical-path approach.
4. **Click "Add source" explicitly after entering each source** — confirmed that Save alone does not register it.
5. Create three FluffyPacks: `inside-aem-all` (both sources), `inside-aem-blog` (publish only), `inside-aem-aicoc` (aicoc only) — per the confirmed Q3 answer.
6. **Expect a delay, not an error:** after adding sources, allow up to ~24h (overnight ingestion cycle) before content is queryable. A `0 files` indicator in the FluffyPack UI during this window isn't necessarily a failure — one documented case showed grounded answers despite that display. Don't debug prematurely; check back the next day before assuming something's wrong.
7. Once ingestion completes, manually test: does querying blog-only, AI CoC-only, and combined actually surface distinctly different, appropriately-scoped answers? Don't move to UI build until this checks out.

*Output: Phase 2 checklist items closed.*

---

## Phase 3 — Build the search UI (auth model now confirmed, no backend needed)

**Confirmed path:**

1. Register a new Okta application at `https://oss.corp.adobe.com/okta/` — OpenID Connect, **Single Page Application** type, PKCE, no client secret. Set the redirect URI to your homepage/hub's callback (e.g. `https://culture-tecture.adobe.com/auth/callback`).
2. Register that Okta client as a FluffyJaws integration (via the FluffyJaws "Register an Integration" workspace), with `culture-tecture.adobe.com` and `re-think.adobe.com` as CORS origins.
3. Build the OAuth Authorization Code + PKCE flow into the search UI. Test whether a silent/`prompt=none`-style auth works for visitors already signed into Okta corporate-wide, so the experience stays on-page; fall back to a visible redirect only if silent auth isn't available.
4. Once a per-visitor Okta user token is obtained, call `/api/v1/stream` directly from the browser with `Authorization: Bearer <user-token>` — each visitor's rate-limit budget is their own.
5. Build the compact search block for the homepage and the fuller block for the AI CoC hub as originally scoped (question in → streamed answer → "view sources").
6. **Before building citation rendering:** capture a real raw SSE stream from your actual FluffyPack — log every `event:` and `data:` frame verbatim, including the terminal `response.completed` event — and inspect it directly for whether citation/source info appears as a distinct field, inside a tool-result event, or only embedded in the answer text. No structured citation contract is confirmed to exist, so this has to be verified empirically against your own pack rather than assumed from docs.
7. Render citations based on what step 6 actually shows. If sources are text-embedded only, build a clearly-scoped extraction (e.g. matching your own known canonical URL patterns) rather than a generic regex, and treat it as something to re-validate if FluffyJaws changes its output format — per spec §8's original caution.
8. Style to match Inside AEM's brand.

**FALLBACK PATH — only relevant if the SPA/PKCE registration hits an unexpected blocker during setup:**

1. Stand up the small backend/Edge Function component that holds the Okta app credential and proxies FJ API calls. Scope this narrowly — its only job is: receive a query from the (already SSO-gated) page, call the FJ API with the Okta app credential, return the answer + citations.
2. Resolve the new open questions above (credential provisioning, auth flow shape, where this component should live) before writing code.
3. Build the compact search block for the homepage: question input → short answer preview → "View sources" expansion. This calls *our* backend endpoint, not the FJ API directly.
4. Build the fuller search block for the AI CoC hub: client-side conversation history, source cards, content-type/scope selector across the pack(s) — same pattern, calling our backend.
5. Render citations back to the original blog post or AI CoC session page — build this against whatever Q4 confirms (structured metadata vs. text parsing). If citations are text-only, treat any regex-based link extraction as a stopgap, not production-safe, per spec §8.
6. Style to match Inside AEM's brand (Adobe red/black/white).

**ORIGINAL PATH — kept for the record only, no longer applicable now that Q0b is resolved:**

*If Q0 had confirmed browser/session auth works directly (it did not):*

1. Build the compact search block for the homepage: question input → short answer preview → "View sources" expansion.
2. Build the fuller search block for the AI CoC hub: client-side conversation history, source cards, content-type/scope selector across the pack(s).
3. Wire both blocks to call the FluffyJaws stream API directly from the browser, same pattern as `session-feed.js` / `article-feed.js` already in the repo.
4. Render citations back to the original blog post or AI CoC session page — build this against whatever Q4 confirmed (structured metadata vs. text parsing). If citations are text-only, treat any regex-based link extraction as a stopgap, not production-safe, per spec §8.
5. Style to match Inside AEM's brand (Adobe red/black/white).

Everything else (UI shape, citation rendering, styling) stays the same regardless of which path — only the transport/auth layer between the browser and FluffyJaws changes.

*Output: Phase 3 checklist items closed, with the auth model correctly reflecting whichever path is confirmed (PKCE/no-backend as primary, service-token/backend as fallback).*

---

## Phase 4 — Validate before calling it live (POC exit criteria)

Run all of these before treating this as launch-ready — this is unchanged from the spec's exit criteria:

- Citations are clickable and land on the correct page.
- Scoped search (Blog / AI CoC / Both) returns distinctly different results.
- The same pack(s) work identically from both the homepage and hub placements.
- Freshness is measured: time from publishing a new post to it being searchable. **Expected baseline is now known:** roughly daily/overnight ingestion, so treat same-day (not instant) visibility as the pass condition, not a problem to fix.
- Rate-limit and retry behavior is measured under a burst of searches.
- Aggregate FluffyJaws usage view is confirmed visible for the registered app.
- Citation rendering matches what was actually observed in the captured SSE stream (Phase 3, step 6) — not an assumed schema.

---

## Phase 5 — Analytics (unchanged from spec)

1. Add a "Knowledge Hub" section/tab to the existing `admin/claps-analytics.html` dashboard.
2. Instrument site-side: query submitted, scope selected, no-result state, citation clicked, search-to-source click-through, auth success/failure, latency, rate-limit/error responses.
3. Confirm monthly searches/users can actually be reported from this combined FluffyJaws-aggregate + self-instrumented data, against the Q4 success measure.

---

## Phase 6 — Transcripts (explicit phase 2, after v1 ships)

1. Apply the confirmed filename mapping: `<write-up-slug>-transcript.<ext>`.
2. Add the `Source session write-up: <url>` line near the top of each transcript doc.
3. Add the now-separated `Transcripts/` folder as a source to the AI CoC pack (or as its own scoped source, given no exclude-subfolder mechanism exists — register it as a distinct canonical path rather than trying to fold it back into the parent folder).
4. Validate: a transcript-sourced answer actually cites the write-up URL, not the raw transcript file — this was flagged in the spec as something that must be validated in the POC, not assumed.

---

## Phase 7 — Launch

1. Final review with Stefan (and anyone else who needs to sign off).
2. Go live on the homepage and AI CoC hub.
3. Start tracking monthly searches/users against the Q4 success measure.

---

## Summary — Phase 1 is closed. What's left is execution, not questions.

Every platform-team question from spec §11 has a working answer now:

| # | Question | Status |
|---|---|---|
| Q0/Q0b | Browser-direct vs. backend | **Resolved** — browser-direct via Okta SPA + PKCE, no backend |
| Q1 | SharePoint subfolder scoping | **Resolved** — no exclude rule; physically separate `Transcripts/` |
| Q2 | Refresh cadence | **Resolved** — ~daily/overnight, no manual trigger |
| Q3 | One pack vs. three | **Resolved** — three packs |
| Q4 | Citation schema | **Resolved into an action** — capture and inspect a real stream in Phase 3, don't assume a schema |
| Q5 | CORS/browser auth | **Resolved** — confirmed supported, part of the Okta SPA setup |
| Q6 | Analytics beyond aggregate | **Resolved** — per-integration export routes exist |
| Q7 | Rate limits/cost | **Resolved** — limits documented; cost model not confirmed, low priority |

**Nothing is currently blocking Phase 2.** The next concrete actions are: separate the `Transcripts/` folder, register the two SharePoint sources, register the Okta SPA app, and register the FluffyJaws integration — all can start now, in any order, without waiting on anyone.
