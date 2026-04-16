---
phase: 02-outreach-integrations
plan: 01
subsystem: database
tags: [supabase, migration, sql, rls, outreach]
dependency_graph:
  requires: [20260414_add_agents_tables.sql]
  provides: [outreach_contacts, email_tables, outreach_log]
  affects: [02-07-PLAN.md, 02-08-PLAN.md]
tech_stack:
  added: []
  patterns: [RLS workspace-scoped policies, updated_at trigger reuse, UUID PKs, JSONB config columns]
key_files:
  created:
    - supabase/migrations/20260415_add_outreach_tables.sql
  modified: []
decisions:
  - Reuse update_agent_updated_at() trigger function from Phase 1 migration instead of creating a new function — avoids redundancy and keeps schema consistent
  - outreach_log has no updated_at column (log records are immutable after creation), so no trigger needed
  - RLS SELECT-only policies match agents table pattern; orchestrator uses service_role key to bypass RLS for writes
metrics:
  duration_minutes: 5
  completed_date: "2026-04-16"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 2 Plan 01: Outreach Tables Migration Summary

**One-liner:** Supabase migration adding outreach_contacts, email_templates, outreach_log tables with FK cascade chain, dedup constraints, and workspace-scoped RLS policies.

## What Was Built

Single migration file `supabase/migrations/20260415_add_outreach_tables.sql` containing:

- **outreach_contacts** — Lead storage with Apollo dedup (apollo_id UNIQUE), Hunter confidence score, email_status CHECK constraint, and updated_at trigger
- **email_templates** — Editable email templates with slug-based addressing (UNIQUE workspace_id+slug), JSONB variables array, active flag
- **outreach_log** — Outreach audit log with UNIQUE(contact_id, template_id) preventing duplicate sends, FK chain linking back to Phase 1 agent_executions

## FK Relationships

| FK | Target | On Delete |
|----|--------|-----------|
| outreach_contacts.workspace_id | workspaces(id) | CASCADE |
| email_templates.workspace_id | workspaces(id) | CASCADE |
| outreach_log.workspace_id | workspaces(id) | CASCADE |
| outreach_log.contact_id | outreach_contacts(id) | CASCADE |
| outreach_log.template_id | email_templates(id) | RESTRICT |
| outreach_log.agent_execution_id | agent_executions(id) | SET NULL |

## Indexes Created

| Index | Table | Column(s) |
|-------|-------|-----------|
| idx_outreach_contacts_workspace | outreach_contacts | workspace_id |
| idx_outreach_contacts_email | outreach_contacts | email |
| idx_outreach_contacts_apollo_id | outreach_contacts | apollo_id WHERE NOT NULL |
| idx_outreach_log_workspace | outreach_log | workspace_id |
| idx_outreach_log_contact | outreach_log | contact_id |
| idx_outreach_log_status | outreach_log | status |
| idx_outreach_log_sent_at | outreach_log | sent_at DESC |

## RLS Policies

Three SELECT policies using identical pattern from Phase 1:
```sql
workspace_id IN (SELECT workspace_id FROM users_profile WHERE id = auth.uid())
```

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create outreach migration SQL file | 1fd736c | supabase/migrations/20260415_add_outreach_tables.sql |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None — this plan produces pure DDL. No application code or UI wired.

## Self-Check: PASSED
