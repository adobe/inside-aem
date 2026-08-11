# Goal 4 — AI-Searchable Knowledge Hub: Working Checklist

A living to-do list derived from [goal4-knowledge-hub-spec.md](goal4-knowledge-hub-spec.md). Check items off as they're done, edit freely as things change.

## Phase 0 — Decisions

- [x] Audience confirmed: Adobe SSO only, same as the blog (no anonymous/public support needed)
- [x] v1 scope confirmed: blog + AI CoC write-ups only; transcripts deferred to phase 2
- [ ] Confirm target Q4 (which year) and any interim checkpoint
- [ ] Decide who owns the FluffyPack(s) day-to-day and who's the point of contact for platform follow-ups

## Phase 1 — Platform-team engagement

- [ ] Send the 7 questions to `#fluffyjaws-enablement` (see spec §11)
- [ ] Answer received: can a SharePoint source be scoped to `content/en/publish/` + `content/en/aicoc/`, excluding `Transcripts/`?
- [ ] Answer received: refresh/re-index cadence after a source folder changes
- [ ] Answer received: is there a query-time source filter, or do we need three separate FluffyPacks?
- [ ] Answer received: request/response schema for the stream API — structured citations or not?
- [ ] Answer received: browser/session auth + CORS/origin requirements from an EDS page
- [ ] Answer received: usage metrics/exports available beyond aggregate volume
- [ ] Answer received: rate limits, latency, cost/chargeback model

## Phase 2 — Content sources & FluffyPack setup

- [ ] Register `content/en/publish/` as a FluffyJaws source
- [ ] Register `content/en/aicoc/` as a FluffyJaws source (excluding `Transcripts/`)
- [ ] Create FluffyPack(s) — either three (`inside-aem-all`, `inside-aem-blog`, `inside-aem-aicoc`) or one, depending on Phase 1 answer
- [ ] Confirm blog-only / AI CoC-only / combined queries actually return appropriately different results

## Phase 3 — Build the search UI

- [ ] Build compact search block for the homepage (question in → short answer → "view sources")
- [ ] Build fuller search block for the AI CoC hub (source cards, scope selector)
- [ ] Wire both to call the FluffyJaws API directly via browser/session auth (no backend proxy)
- [ ] Render citations/source links back to the original blog post or session page
- [ ] Style to match Inside AEM's brand (Adobe red/black/white)

## Phase 4 — Validate before launch (POC exit criteria)

- [ ] Citations are clickable and land on the correct page
- [ ] Scoped search (Blog / AI CoC / Both) returns distinctly different results
- [ ] Same FluffyPack(s) work from both the homepage and hub placements
- [ ] Freshness measured: time from publishing a new post to it being searchable
- [ ] Rate-limit and retry behavior measured under a burst of searches
- [ ] Aggregate FluffyJaws usage view confirmed visible for the registered app

## Phase 5 — Analytics

- [ ] Add a "Knowledge Hub" section/tab to the existing Blog & AI CoC dashboard
- [ ] Instrument: query submitted, scope selected, no-result state, citation clicked, search-to-source click-through
- [ ] Instrument: auth success/failure, latency, rate-limit/error responses
- [ ] Confirm monthly searches/users can actually be reported from this data

## Phase 6 — Transcripts (phase 2, after v1 ships)

- [ ] Apply the confirmed filename mapping (transcript → `<write-up-slug>-transcript.<ext>`)
- [ ] Add a `Source session write-up: <url>` line near the top of each transcript doc
- [ ] Add `Transcripts/` as a source to the AI CoC pack
- [ ] Validate: a transcript-sourced answer actually cites the write-up URL, not the raw transcript file

## Phase 7 — Launch

- [ ] Final review with Stefan (and anyone else who needs to sign off)
- [ ] Go live on the homepage and AI CoC hub
- [ ] Start tracking monthly searches/users against the Q4 success measure
