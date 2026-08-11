# Goal 4 — AI-Searchable Knowledge Hub: Concept Spec

**Status:** Concept / pre-POC — no implementation started.
**Owner:** Dominik Steinacher
**Last updated:** 2026-08-05

## 1. Goal

Create a knowledge database on Re-Think that uses AI to make all blog posts and AI CoC sessions searchable in one place.

- **Success measure:** Hub live by Q4 [year TBD]; adoption tracked via monthly searches/users; measurable drop in time spent hunting for past content.
- **Impact:** Extends the AI CoC beyond live sessions and doubles as a live example of the automation the CoC champions — linking Goal 1 and Goal 3.
- **Chosen engine:** FluffyJaws (Adobe's internal LLM platform).

## 2. Product concept

Two placements, one underlying search/answer engine:

1. **Homepage (re-think.adobe.com / culture-tecture.adobe.com):** a single search field. If the user picks a scope (Blog / AI CoC / Both), search respects it; if nothing is picked, it searches everything.
2. **AI CoC Hub (culture-tecture.adobe.com):** a dedicated search field alongside the existing hub content, likely scoped to AI CoC sessions by default.

Both placements are answered by the same underlying knowledge base(s) — no separate content pipeline per placement.

## 3. Architecture

No official FluffyJaws website widget/iframe/SDK exists today (confirmed via internal FluffyJaws platform assessment). The pattern is:

```
EDS static site (this repo)
  → custom search/chat UI (built by us)
    → FluffyJaws production API (https://api.fluffyjaws.adobe.com)
      → FluffyPack(s): Inside AEM (indexed blog + AI CoC sources)
        → answer + citation info
      → rendered in our EDS UI, with canonical source-page links
```

- Invocation: FluffyPack via the stream API, identified by UUID (not display name).
- **Auth model (confirmed):** the whole site is already Adobe-SSO-gated, same as the blog today — there is no anonymous/public audience to support. This means the **browser/session** auth pattern applies directly: the search UI calls the FluffyJaws API straight from the browser using the visitor's existing Adobe SSO session. No backend proxy, no server-held secret, no Edge Function middleware needed. This is what makes the build self-contained — it's the same kind of client-side block already used elsewhere in this repo (e.g. `session-feed.js`, `article-feed.js`).

## 4. Content sources — confirmed by direct inspection

All content lives in SharePoint, at the same site this repo's `fstab.yaml` already mounts as its authoring source (`sites/InsideAEM/Shared Documents/content`). Verified directly (not assumed):

| Source | Path | Status |
|---|---|---|
| Blog articles | `sites/InsideAEM/Shared Documents/content/en/publish/{yyyy}/{mm}/{dd}/` | ✅ Clean — one write-up `.docx` per dated folder, nothing else. Matches `/en/query-index.json`. |
| AI CoC sessions | `sites/InsideAEM/Shared Documents/content/en/aicoc/` (top level only) | ✅ Clean — ~50 write-up docs, one stray non-article file (`aicoc-stats.xlsx`, an unrelated filetype the connector likely won't ingest anyway). Matches `/en/aicoc-index.json`. |
| AI CoC transcripts | `.../content/en/aicoc/Transcripts/` | ✅ Cleaned and fully mapped (see §6) — held out of v1, candidate for phase 2. |

**Explicitly out of scope — do not register these as sources:**
- `en/drafts/Blog`, `en/drafts/Newsletter`, `drafts/` — unpublished content.
- `en/promotions`, `en/authors`, `en/topics`, `experiments/`, `.helix`, `icons/`, `Videos/` — site scaffolding/assets, not articles.
- `plahub/blogs`, `techfactory/blogs` — legacy, pre-rebrand content trees (last touched 2023).
- The separate **`sites/AICoC`** SharePoint site (different from InsideAEM) — holds raw session recordings (`.mp4`) and an "AI CoC org team" internal-planning folder. Not reviewed for public/searchable exposure; excluded from this concept entirely unless a future phase deliberately scopes it in.
- A personal OneDrive folder surfaced as a banner-asset source — personal drives should not be used as FluffyJaws sources (governance risk).

**Open platform question (replaces the earlier "can it crawl our domain" ask):** can a FluffyJaws SharePoint source be scoped to specific subfolders (`content/en/publish/`, `content/en/aicoc/`, non-recursive or excluding `Transcripts/`), or does registration only work at the site/library level? If all-or-nothing, we may need `Transcripts/` physically separated before registering the parent folder.

## 5. Scoping strategy (Blog / AI CoC / Both)

**This is a backend detail, invisible to the end user.** Whoever's searching still only ever sees one search field on the homepage and one (fuller) search field on the AI CoC hub — nothing about this changes what they see or how many places they search.

Query-time dynamic filtering of a single configured pack is **not confirmed** to exist — we don't yet know if FluffyJaws can take one combined knowledge base and filter it to "AI CoC only" at query time. Until that's confirmed, the safer default is three separate FluffyPacks with deterministic boundaries:

| Pack | Sources | Used by |
|---|---|---|
| `inside-aem-all` | Blog + AI CoC | Homepage default (nothing selected) |
| `inside-aem-blog` | Blog only | Homepage "Blog" scope |
| `inside-aem-aicoc` | AI CoC only | Homepage "AI CoC" scope, AI CoC Hub field |

This is provisional: if the platform team confirms a real query-time source filter exists (see §11, question 3), we collapse this down to a single pack — simpler to maintain, same user experience either way. Avoid relying on prompt-level instructions ("only answer from AI CoC sessions") as the sole enforcement mechanism for production — treat that as an experiment, not a guarantee.

## 6. Phase 2 candidate: session transcripts

`Transcripts/` originally mixed real transcripts with internal-only meeting notes, a blank template, and duplicates. This has been cleaned:

- Removed: internal team/planning meeting docs that weren't session transcripts, a blank template, and all duplicate file pairs (copy files, docx+pdf pairs of the same session).
- Kept and reviewed: 34 real session transcripts (2 of the originally-ambiguous files confirmed as real transcripts via content match; 1 ambiguous file deleted).
- Every remaining transcript has been matched 1:1 to its corresponding published write-up and has a proposed rename to `<write-up-slug>-transcript.<ext>` for a stable, traceable link.

**Decision (confirmed):** transcripts will **not** be published as their own pages — they exist purely as backing content, not as citable public URLs.

**Citation mechanism:** since the FluffyJaws API's citation schema is not confirmed to be structured/reliable, the plan is to embed a plain-text line near the top of each transcript document:

```
Source session write-up: https://culture-tecture.adobe.com/en/aicoc/<slug>
```

This gives the model an explicit, visible signal to surface that URL when answering from transcript content, without requiring a guaranteed citation API contract. **This must be validated in the POC** — confirm a transcript-sourced answer actually surfaces the embedded write-up URL.

Transcripts are excluded from the v1 FluffyPack sources; they're added once renamed and annotated with the canonical-URL line.

## 7. Audience and auth — resolved

**Decision (confirmed):** the homepage and hub audience is Adobe-authenticated only, same as the rest of the site today. There is no anonymous/public visitor requirement to design around.

This was the single highest-leverage open question in the whole concept, and resolving it in favor of "authenticated-only" is what keeps this buildable in-house: FluffyJaws's browser/session auth pattern applies directly (see §3), with no need for a backend proxy, an Adobe platform exception, or a separate public-facing search layer. That removes the main reason a developer or another team would have needed to be involved.

## 8. Citations & UX

Two UI modes sharing the same pack(s):

- **Compact (homepage):** one-line question input → short answer preview → "View sources" expansion.
- **Full (AI CoC Hub):** conversation history held client-side, source cards, content-type selector across the three packs.

Must validate whether the API returns citations as structured metadata (title, canonical URL, source type, snippet) or only as text embedded in the answer — do not build production UI that depends on regex-parsing citation text unless the platform team confirms that format is stable.

## 9. Analytics plan

Two layers, since FluffyJaws's own usage view is aggregate-only (no confirmed top-queries, no-result-queries, citation click-through, or export API):

- **FluffyJaws-native:** real-time aggregate usage view for the registered app(s) — total volume, not query-level detail.
- **Self-instrumented (site-side):** query submitted, selected scope, answer returned, no-result state, citation clicked, search-to-source click-through, auth success/failure, latency, rate-limit/error responses.

Natural home for this: extend the existing [admin/claps-analytics.html](../admin/claps-analytics.html) dashboard, which already combines Blog + AI CoC KPIs manually — a third "Knowledge Hub" section/tab fits the existing pattern.

## 10. POC exit criteria

- A FluffyPack can be created and assigned the intended (folder-scoped) content sources.
- Blog-only, AI CoC-only, and combined scopes produce acceptably different results.
- The API can be called from an Adobe-hosted architecture without exposing a secret client-side.
- Authentication works for the intended (Adobe-SSO) audience via browser/session auth (§7).
- Answers expose usable, clickable source URLs — including transcript-sourced answers citing the write-up URL, not the transcript file.
- Citations can be rendered in Inside AEM's brand style.
- The same pack works from both the homepage and hub placements.
- Freshness (time from publish to searchable) is measured and documented.
- Rate-limit and retry behavior is measured.
- Aggregate FluffyJaws usage is visible; site-owned analytics capture no-result and citation-click events.

## 11. Remaining platform-team questions (send to `#fluffyjaws-enablement`)

1. Can a SharePoint source be scoped to `content/en/publish/` and `content/en/aicoc/` specifically, excluding `Transcripts/`, or is registration all-or-nothing at folder/library level?
2. What is the supported refresh/re-index cadence after a source folder changes?
3. Should Blog-only / AI CoC-only / Combined be three separate FluffyPacks, or is there a query-time source filter we're missing?
4. What is the exact request/response schema for invoking a FluffyPack via the stream API — specifically, does it return structured citations (title, URL, type, snippet)?
5. Is browser/session authentication supported from an Edge Delivery Services page, and what CORS/origin config is required?
6. What usage metrics/exports exist beyond aggregate volume (searches, unique users, no-result queries, citation clicks)?
7. What are current rate limits, latency expectations, and any cost/chargeback model?

## 12. Open decisions for discussion

- **Timeline** — confirm which Q4 (year) and any interim checkpoint.
- **Transcripts phase 2 timing** — fold in at v1 launch, or genuinely phase 2 after the core hub ships?
- **Ownership of the FluffyPack(s)** and who's the point of contact for platform-team follow-ups.
