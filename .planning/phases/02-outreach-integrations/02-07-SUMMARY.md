---
phase: 02-outreach-integrations
plan: "07"
subsystem: outreach-orchestration
tags: [supabase, apollo, hunter, gmail, bottleneck, tdd]
dependency_graph:
  requires: [02-01, 02-04, 02-05, 02-06]
  provides: [ProspectorAgent, db/outreach]
  affects: [sales-orchestrator-api, scheduler]
tech_stack:
  added: [bottleneck]
  patterns: [dependency-injection, tdd-red-green, fluent-supabase-mock]
key_files:
  created:
    - sales-orchestrator/src/db/outreach.ts
    - sales-orchestrator/src/agents/ProspectorAgent.ts
    - sales-orchestrator/tests/db/outreach.test.ts
    - sales-orchestrator/tests/agents/ProspectorAgent.test.ts
  modified: []
decisions:
  - "Apollo 'verified' email_status maps to outreach_contacts 'valid' (enum bridging in resolveEmail)"
  - "ProspectorAgent holds Bottleneck gmailLimiter (minTime:1000, maxConcurrent:1) — not in GmailClient (per 02-06 decision)"
  - "interpolateTemplate uses silent empty-string fallback for missing vars (v1, revisit later)"
  - "outreach_log UNIQUE(contact_id, template_id) enforced in DB; hasBeenContacted provides code-level guard before send"
metrics:
  duration: "~12 minutes"
  completed: "2026-04-15"
  tasks_completed: 2
  files_created: 4
  tests_added: 18
---

# Phase 02 Plan 07: ProspectorAgent + db/outreach Summary

One-liner: Apollo→Hunter→Gmail outreach pipeline with Supabase CRUD, Bottleneck rate limiting, and per-contact deduplication via outreach_log.

## What Was Built

### db/outreach.ts — Supabase CRUD helpers

Five exported functions providing all persistence needed by the pipeline:

| Function | Table | Notes |
|----------|-------|-------|
| `upsertContact(client, input)` | `outreach_contacts` | ON CONFLICT apollo_id DO UPDATE — idempotent across runs |
| `loadTemplate(client, workspaceId, slug)` | `email_templates` | Filters workspace_id + slug + active=true; throws if not found |
| `hasBeenContacted(client, contactId, templateId)` | `outreach_log` | maybeSingle check; code-level guard before send |
| `insertLog(client, input)` | `outreach_log` | Writes sent/failed/pending rows; throws on error |
| `interpolateTemplate(template, vars)` | (pure) | Replaces `{{key}}` placeholders; missing vars → empty string (silent) |

#### UpsertContactInput shape

```typescript
{
  workspaceId: string;
  lead: ApolloLead;
  email: string;
  emailStatus: 'valid' | 'invalid' | 'accept_all' | 'unknown';
  hunterScore?: number | null;
}
```

### ProspectorAgent — Pipeline orchestration class

#### ProspectorAgentDeps

```typescript
{
  apollo: ApolloClient;
  hunter: HunterClient;
  gmail: GmailClient;
  supabase: SupabaseClient;
  logger: Logger;
  senderAddress: string; // "Name <email>"
}
```

#### ProspectorRunRequest / Result

```typescript
// Input
{
  workspaceId: string;
  searchCriteria: ApolloSearchParams;
  templateSlug: string;
  agentExecutionId?: string | null;
}

// Output
{ processed: number; sent: number; failed: number }
```

#### resolveEmail() logic table

| Condition | Action |
|-----------|--------|
| `lead.email_status === 'verified' && lead.email` | Use Apollo email directly → status=`valid`, hunterScore=null |
| Lead has no organization domain | Skip lead (log info) |
| Hunter findEmail returns null | Skip lead |
| Hunter verifyEmail returns `'invalid'` | Skip lead |
| Hunter verifyEmail returns anything else | Use Hunter email, map status to outreach enum |

#### Pipeline flow (per lead)

1. `apollo.searchPeople(searchCriteria)` → leads array
2. `loadTemplate(supabase, workspaceId, templateSlug)` → template (once, outside loop)
3. For each lead:
   - `resolveEmail(lead)` → skip if null
   - `upsertContact(...)` → contactId
   - `hasBeenContacted(contactId, templateId)` → skip if true
   - `interpolateTemplate(template, leadVars)` → {subject, body}
   - `gmailLimiter.schedule(() => gmail.sendEmail(...))` → messageId
   - `insertLog(status='sent', gmailMessageId)` on success
   - `insertLog(status='failed', error)` on catch (no propagation)
4. Return `{ processed, sent, failed }`

#### Gmail rate limiter

```typescript
this.gmailLimiter = new Bottleneck({ minTime: 1000, maxConcurrent: 1 });
```

All `gmail.sendEmail` calls go through `this.gmailLimiter.schedule(...)`.

## Tests

### tests/db/outreach.test.ts (10 tests)

- upsertContact: calls upsert with correct payload + onConflict key; throws on error
- loadTemplate: correct filter chain; throws when not found
- hasBeenContacted: returns true/false based on maybeSingle result
- insertLog: correct insert payload; throws on error
- interpolateTemplate: replaces placeholders correctly; missing vars → empty string

### tests/agents/ProspectorAgent.test.ts (8 tests)

1. apollo.searchPeople called with searchCriteria
2. hunter.findEmail NOT called for verified Apollo leads
3. hunter.findEmail + verifyEmail called for unverified; skips on invalid
4. gmail.sendEmail NOT called when hasBeenContacted=true
5. gmail.sendEmail called with interpolated subject/body + correct from
6. insertLog called with status=sent + gmailMessageId after successful send
7. insertLog called with status=failed + error when sendEmail throws; no propagation
8. Returns correct { processed, sent, failed } counts

## Commits

- `dc40731`: feat(02-07): db/outreach.ts module + 10 passing tests
- `13f4bef`: feat(02-07): ProspectorAgent with Apollo→Hunter→Gmail pipeline + 8 tests

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all functions wire real Supabase tables and real integration clients.

## Self-Check: PASSED

- `/Users/mariatelloesbri/sales-orchestrator/src/db/outreach.ts` — exists, verified
- `/Users/mariatelloesbri/sales-orchestrator/src/agents/ProspectorAgent.ts` — exists, verified
- `/Users/mariatelloesbri/sales-orchestrator/tests/db/outreach.test.ts` — exists, 10 tests
- `/Users/mariatelloesbri/sales-orchestrator/tests/agents/ProspectorAgent.test.ts` — exists, 8 tests
- Commits `dc40731` and `13f4bef` — confirmed in git log
- `npm test` — 56 passed, 0 failed, 1 skipped (pre-existing integration test)
- `npm run typecheck` — clean
- `grep "this.gmailLimiter.schedule"` — matches
- `grep "onConflict: 'apollo_id'"` — matches
- `grep "from('outreach_log')"` — 2 matches (hasBeenContacted + insertLog)
