# Support ticket draft — IAM Portal / Adobe Directory Services

**Subject:** Need the correct group to reference for "all active Adobe employees" access control

**Category suggestion:** Identity and Access Management (IAM) → Groups

---

## Description

I'm setting up access control for a new internal application and need to identify the correct group to use so that **any active Adobe employee** can be granted access — no narrower scoping intended.

**Context:** I registered a new OIDC Single Page Application in the Corporate Authentication Self Service tool (`oss.corp.adobe.com/okta`) — app name `inside-aem-knowledge-hub`, Client ID `0oa28nqie1kVri8670h8`. Because I left the "Application Access (controlled by AD group)" field blank at registration, the tool auto-created a dedicated security group for me in the IAM Portal: `GRP-INSIDE-AEM-KNOWLEDGE-HUB-USERS`. That group currently has only one member (me).

**What I need:** this application's intended audience is "all Adobe employees, same access level as our existing internal blog," with no team/org restriction. I'd like to add the correct broader group as a **nested member** of `GRP-INSIDE-AEM-KNOWLEDGE-HUB-USERS`, rather than manually enumerating individual employees (the IAM Portal's bulk-load tool caps at 1,000 user IDs, which isn't workable at Adobe's employee scale, and isn't the right approach even if it weren't capped).

**What I've tried:** searching the "Add a new member" field on the group's edit page for terms like `adobe`, `adobe employee`, `all employees`, and `everyone`. This surfaced several candidate groups (e.g. `adobeaccess` / "Access at Adobe Employee Network", `adobeempint` / "Adobe Employee Integration"), but none of their names or descriptions unambiguously confirmed "all current Adobe employees" — some looked plausibly related to network/VPN access or system integrations rather than employment status, and I didn't want to guess and either under- or over-scope access.

**Ask:** Could you tell me the canonical group name (and, if relevant, whether it's safe/supported to nest inside a custom security group like ours) that represents all current active Adobe employees, for use in access control on an internal SSO-gated application?

---

## Reference info

- Okta app: `inside-aem-knowledge-hub` (Client ID `0oa28nqie1kVri8670h8`, Production environment, Confidential data classification)
- IAM group needing the nested member: `GRP-INSIDE-AEM-KNOWLEDGE-HUB-USERS`
- Group owners: Dominik Steinacher (dsteinacher), Stefan Spycher (sspycher)
- Application purpose: an internal, Adobe-SSO-gated AI search feature over our team's blog and AI Community of Practice session content (no external/anonymous audience)
