# Security Review - AI Agency OS

**Date:** 2026-03-27
**Reviewer:** Automated security audit

---

## Issues Found & Fixed

### HIGH Severity

#### 1. n8n endpoints bypass authentication when N8N_API_KEY is not configured
- **Files:** `src/app/api/leads/follow-up/route.ts`, `src/app/api/prospecting/auto-run/route.ts`, `src/app/api/webhooks/n8n/route.ts`
- **Issue:** All three n8n endpoints had a `verifyN8nAuth()` function that returned `true` when `N8N_API_KEY` was not set in environment variables. This meant any unauthenticated request could trigger follow-ups, auto-prospecting, or webhook actions if the env var was missing.
- **Fix:** Changed `verifyN8nAuth()` to return `false` when `N8N_API_KEY` is not configured, effectively denying all requests until the key is properly set.
- **Status:** FIXED

#### 2. Stripe webhook skips signature verification when STRIPE_WEBHOOK_SECRET is not set
- **File:** `src/app/api/webhooks/stripe/route.ts`
- **Issue:** The webhook endpoint had a fallback that parsed the raw body as JSON without signature verification when `STRIPE_WEBHOOK_SECRET` was not configured. An attacker could craft fake Stripe events to upgrade workspaces or manipulate subscription state.
- **Fix:** The endpoint now returns 503 if `STRIPE_WEBHOOK_SECRET` is not configured and 400 if the `stripe-signature` header is missing. Signature verification is always enforced.
- **Status:** FIXED

#### 3. No URL validation in /api/ai/analyze allows SSRF-like abuse
- **File:** `src/app/api/ai/analyze/route.ts`
- **Issue:** The `url` parameter from user input was passed directly to `fetch()` without protocol validation. An attacker could supply `javascript:`, `file:///etc/passwd`, `data:`, or internal network URLs to potentially exfiltrate data or probe internal services.
- **Fix:** Added URL parsing and protocol allowlist (`http:` and `https:` only) before passing to the scraping function.
- **Status:** FIXED

### MEDIUM Severity

#### 4. No input length limit on agent chat messages
- **File:** `src/app/api/agents/chat/route.ts`
- **Issue:** The `message` field from user input had no maximum length validation. An attacker could send extremely large messages to consume API credits, cause excessive Claude API usage, or create denial-of-service conditions.
- **Fix:** Added validation that `message` must be a string with a maximum of 10,000 characters.
- **Status:** FIXED

### LOW Severity

#### 5. Access-Control-Allow-Origin: * on agent chat endpoint
- **File:** `src/app/api/agents/chat/route.ts` (line 136)
- **Issue:** The CORS header allows any origin to call the agent chat endpoint. While this is intentional for the embeddable chat widget use case, it means any website can interact with deployed agents.
- **Recommendation:** Consider restricting to known domains via a configurable allowlist per agent, or validate the `Origin` header against the agent's configured domain.
- **Status:** NOT FIXED (by design for widget embedding)

#### 6. Agent chat endpoint has no authentication
- **File:** `src/app/api/agents/chat/route.ts`
- **Issue:** The endpoint is intentionally public (for website visitors to chat), but has no rate limiting. This could be abused to generate excessive Claude API costs.
- **Recommendation:** Add rate limiting per IP or per conversation ID (e.g., max 30 messages per conversation per hour). Consider adding a CAPTCHA or token-based mechanism for new conversations.
- **Status:** NOT FIXED (recommendation for future)

#### 7. Error messages may leak internal details
- **Files:** Multiple API routes
- **Issue:** Several catch blocks return `error.message` directly to the client. While not currently dangerous, internal error messages could reveal database schema names, library versions, or other implementation details.
- **Recommendation:** Return generic error messages in production and log detailed errors server-side only.
- **Status:** NOT FIXED (recommendation for future)

---

## Verified Security Controls (No Issues Found)

1. **Authenticated API routes:** All user-facing AI routes (`/api/ai/analyze`, `/api/ai/generate-proposal`, `/api/ai/generate-scripts`, `/api/ai/prospect`) properly check the Bearer token via `getTokenFromRequest()` and return 401 if missing.

2. **Stripe checkout:** `/api/stripe/checkout/route.ts` validates the `Authorization` header, allowlists plan values (`starter`, `pro`, `agency`), and validates required fields.

3. **No NEXT_PUBLIC_ secret leaks:** Only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_APP_URL` are exposed to the client. All are safe for public exposure. Server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `N8N_API_KEY`, `APIFY_API_TOKEN`) are kept server-side only.

4. **SQL injection:** Not applicable. All database operations use the Supabase client with parameterized queries. No raw SQL is constructed from user input.

5. **XSS:** No usage of `dangerouslySetInnerHTML` found anywhere in the codebase. React's default escaping handles all rendered content safely.

6. **Env files:** `.env.local` and `.env` are properly listed in `.gitignore`.

---

## Recommendations for Future Development

1. **Rate limiting:** Add rate limiting to all API routes, especially the public agent chat endpoint and AI generation endpoints. Consider using Vercel Edge Middleware or an external service.

2. **SSRF hardening:** Beyond protocol validation, consider blocking private/internal IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x, 127.x.x.x) in the URL scraping function to prevent SSRF against internal services.

3. **Webhook replay protection:** The Stripe webhook should verify the `timestamp` in the signature to reject replayed events (Stripe SDK does this by default with a 5-minute tolerance).

4. **Audit logging:** Consider logging all authentication failures with IP addresses for security monitoring.

5. **Content Security Policy:** Add CSP headers to prevent potential future XSS if `dangerouslySetInnerHTML` is ever introduced.
