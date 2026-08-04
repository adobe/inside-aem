# Goal 4 — AI-Searchable Knowledge Hub: Concept Spec

**Status:** Concept / pre-POC — no implementation started.
**Owner:** Dominik Steinacher
**Last updated:** 2026-08-04

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
- API auth patterns available: user-token, service-token, browser/session, OBO (on-behalf-of). Service tokens must never be exposed in client-side JS.
- **No official anonymous/public mode is documented.** FluffyJaws is described as an internal, Adobe-SSO-gated service. See open question in §7.

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

Query-time dynamic filtering of a single configured pack is **not confirmed** to exist. Recommendation: three separate FluffyPacks with deterministic boundaries.

| Pack | Sources | Used by |
|---|---|---|
| `inside-aem-all` | Blog + AI CoC | Homepage default (nothing selected) |
| `inside-aem-blog` | Blog only | Homepage "Blog" scope |
| `inside-aem-aicoc` | AI CoC only | Homepage "AI CoC" scope, AI CoC Hub field |

Avoid relying on prompt-level instructions ("only answer from AI CoC sessions") as the sole enforcement mechanism for production — treat that as an experiment, not a guarantee.

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

## 7. Open blocker: authenticated vs. anonymous audience

FluffyJaws today is documented as an internal, SSO-gated service with no anonymous/public mode. This is a direct tension with "visible directly on the main page" if that page's audience includes visitors without Adobe SSO.

**Decision needed:** is re-think.adobe.com / culture-tecture.adobe.com's homepage audience exclusively Adobe-authenticated employees, or does it need to serve anonymous/external visitors?

- If **authenticated-only**: proceed as designed — FluffyJaws powers both placements directly.
- If **anonymous access is required**: FluffyJaws (as currently documented) cannot be the public-facing engine without an explicit platform exception, an Adobe-approved proxy/serverless relay that protects the service token, or a separate public search layer running alongside an internal FluffyJaws-powered experience.

This is the single highest-leverage question to resolve before committing to a final architecture.

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
- Authentication works for the intended audience (pending §7).
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
6. Is anonymous public access supported in any form? If not, is there an Adobe-approved proxy/serverless relay pattern to protect a service token from an EDS page?
7. What usage metrics/exports exist beyond aggregate volume (searches, unique users, no-result queries, citation clicks)?
8. What are current rate limits, latency expectations, and any cost/chargeback model?

## 12. Open decisions for discussion

- **Audience/auth (§7)** — the one blocking architectural decision.
- **Timeline** — confirm which Q4 (year) and any interim checkpoint.
- **Transcripts phase 2 timing** — fold in at v1 launch, or genuinely phase 2 after the core hub ships?
- **Ownership of the FluffyPack(s)** and who's the point of contact for platform-team follow-ups.
