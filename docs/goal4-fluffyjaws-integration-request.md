# Message draft — #fluffyjaws-enablement (or Thomas Cantonnet)

Hey! Following up on our earlier thread — we've resolved the auth architecture (browser-direct via Okta SPA + PKCE, no backend) and registered the Okta app. Ready for the next step: registering it as a FluffyJaws integration so our site's origins can call `/api/v1/*` directly from the browser.

Could you point me to the **"Register an Integration" workspace** (or register it on our behalf if that's not self-service)? Here's what we need registered:

- **Okta Client ID:** `0oa28nqie1kVri8670h8`
- **Okta issuer:** `https://adobe.okta.com`
- **App type:** OIDC Single Page Application, PKCE, no client secret
- **CORS origins to allow:**
  - `https://culture-tecture.adobe.com`
  - `https://re-think.adobe.com`

Once that's set up, we'll be building against `/api/v1/stream` directly from these two origins using per-visitor Okta user tokens (raw-user-token / Authorization Code + PKCE path, per your API guide).

Let us know if you need anything else from us to get this registered.
