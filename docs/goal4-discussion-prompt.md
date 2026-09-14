# Discussion prompt: AI-Searchable Knowledge Hub (Goal 4)

Use this to open the conversation — it's the short version of the full spec, framed around the decisions still left to make.

---

**The goal:** make every blog post and AI CoC session write-up searchable in one place, powered by FluffyJaws, surfaced on the re-think/culture-tecture homepage and on the AI CoC Hub. Live by Q4, tracked by monthly searches/users and a drop in time spent hunting for old content.

**Where this stands:** the hard groundwork is done —

- Blog posts and AI CoC write-ups both live in clean, well-scoped SharePoint folders (`content/en/publish/` and `content/en/aicoc/`) that map 1:1 to what's already published. No custom crawler or mirroring hack needed.
- The AI CoC session transcripts folder is cleaned and fully mapped to its corresponding write-ups — ready as a phase-2 source once we decide to bring it in.
- **Audience is confirmed:** Adobe SSO only, same as the blog today. That means FluffyJaws can be called directly from the browser using the visitor's existing session — no backend proxy, no other team's infrastructure needed. This is what makes the build fully self-contained.
- FluffyJaws has no drop-in website widget, so we build our own search UI against its production API — same pattern as the other custom blocks already in this codebase.

**What's left:**

1. **Send the platform-team questions** to `#fluffyjaws-enablement` — SharePoint folder-scoping, refresh cadence, whether a single knowledge base can be filtered by content type at query time (or if we need three separate FluffyPacks), citation schema, and rate limits.
2. **Build two small UI pieces:** a compact search field on the homepage (searches everything by default) and a fuller search experience on the AI CoC hub (scoped to sessions). Both are in-house work, no developer from outside the team needed.
3. **Validate before calling it live:** citations link to the right page, transcript-sourced answers cite the write-up (not the raw transcript), scoped search actually returns different results per scope, and freshness/rate-limits are measured.
4. **Wire up usage tracking** — FluffyJaws only gives aggregate numbers, so query-level analytics (searches, no-result rate, citation clicks) get added to the existing Blog & AI CoC dashboard.
5. **Confirm timing:** which Q4, any interim checkpoint, and whether transcripts ship at launch or genuinely as a phase 2.

Full spec is attached for the details behind each of these.
