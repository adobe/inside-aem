# Discussion prompt: AI-Searchable Knowledge Hub (Goal 4)

Use this to open the conversation — it's the short version of the full spec, framed around the decisions we actually need to make together.

---

**The goal:** make every blog post and AI CoC session write-up searchable in one place, powered by FluffyJaws, surfaced on the re-think/culture-tecture homepage and on the AI CoC Hub. Live by Q4, tracked by monthly searches/users and a drop in time spent hunting for old content.

**Where this stands:** I've already validated the hard part most concepts skip — the actual content plumbing:

- Blog posts and AI CoC session write-ups both live in clean, well-scoped SharePoint folders (`content/en/publish/` and `content/en/aicoc/`) that map 1:1 to what's already published on the site. No custom crawler or mirroring hack needed — SharePoint is a documented FluffyJaws source type.
- I went a step further and cleaned + fully mapped the AI CoC session transcripts folder too (deduped, stripped internal-only meeting notes and a blank template, matched every remaining transcript to its published write-up). That's a phase-2-ready source, not phase 1.
- FluffyJaws has no drop-in website widget — we'd build our own search UI against its production API, using a FluffyPack (or three: all / blog-only / AI CoC-only) as the knowledge source.

**The one real blocker:** FluffyJaws is documented as an internal, Adobe-SSO-gated service with no anonymous/public mode. If the homepage needs to serve visitors without Adobe SSO, FluffyJaws can't be the whole answer as-is — we'd need a platform exception, an approved proxy, or a second public-facing layer alongside an internal FluffyJaws experience.

**Decisions to land in this conversation:**

1. **Audience:** is re-think/culture-tecture homepage audience Adobe-authenticated only, or does it need to work for anonymous/external visitors? This decides the whole architecture.
2. **Scope for v1:** blog + AI CoC write-ups only, with transcripts explicitly deferred to phase 2 — agreed?
3. **Who owns the platform-team ask** (`#fluffyjaws-enablement`) — I have the specific questions ready to send (folder-scoped SharePoint ingestion, citation schema, auth model, rate limits).
4. **Timeline:** confirm which Q4 and whether there's an interim checkpoint before then.
5. **Analytics:** fold usage tracking into the existing Blog & AI CoC dashboard as a third section, or stand up something separate?

Full spec is attached for the details behind each of these.
