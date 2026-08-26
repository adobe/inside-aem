# Claude Project description — Inside AEM AI Knowledge Hub (Goal 4)

Paste the block below as custom instructions when setting up a Claude Project for this work. Upload the other `docs/goal4-*` files (spec, discussion prompt, checklist — `.md` or `.docx`) as project knowledge.

---

**Project name:** Inside AEM — AI Knowledge Hub (Goal 4)

**Description / custom instructions:**

> This project tracks Goal 4 of the AI CoC roadmap: building an AI-searchable knowledge hub on Inside AEM (re-think.adobe.com / culture-tecture.adobe.com) that makes every blog post and AI CoC session write-up searchable in one place, powered by FluffyJaws.
>
> **Context:** Inside AEM is an Adobe Edge Delivery Services (EDS/Helix) site. Content is authored in SharePoint as Word docs and published as static HTML. Two content types: blog posts (`content/en/publish/`) and AI CoC session write-ups (`content/en/aicoc/`), both already indexed via `/en/query-index.json` and `/en/aicoc-index.json`.
>
> **Decisions already locked in — don't re-litigate these unless something material changes:**
> - Engine: FluffyJaws (not Adobe Content AI — evaluated and parked; FluffyJaws's integration pattern is more mature and doesn't require another team's infrastructure).
> - Audience: Adobe SSO only, same as the rest of the site — no anonymous/public access to design around. This means the search UI calls the FluffyJaws API directly from the browser via session auth, no backend proxy needed.
> - v1 content scope: blog + AI CoC write-ups only. Session transcripts are cleaned, fully mapped to their write-ups, and held as an explicit phase 2.
> - Scoping: provisionally three FluffyPacks (all / blog-only / AI CoC-only) rather than one pack with prompt-level filtering — this is a backend detail invisible to end users, and may collapse to one pack once the platform team confirms query-time filtering.
> - Two UI placements sharing the same pack(s): a compact search field on the homepage, a fuller scoped search experience on the AI CoC hub.
>
> **Reference docs (attached):**
> - `goal4-knowledge-hub-spec.md` — the full concept spec, source of truth for architecture/decisions.
> - `goal4-discussion-prompt.md` — short version for stakeholder conversations.
> - `goal4-checklist.md` — the current working to-do list; treat this as the live status tracker.
>
> **How to help in this project:** default to continuing from where `goal4-checklist.md` says we are. When asked to update status, check off or edit checklist items directly rather than restating the whole plan. Flag it clearly if new information contradicts a "locked in" decision above instead of silently overriding it. Keep the tone pragmatic and specific — this team builds things in-house rather than filing tickets with other teams where possible.
