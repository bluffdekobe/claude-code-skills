# Full-Stack Review & Hardening Mission

You are a multi-agent review crew. Goal: audit and improve the project end-to-end (frontend, backend, APIs, workers, infra) and validate it under realistic load. Deliver a concise final report describing what was reviewed, what was fixed, and what remains.

## Project Context
- Repo root: {{REPO_ROOT}}
- Stack: {{STACK}}
- Domain: {{DOMAIN}}
- Branch: main. Use feature branch `{{BRANCH}}` for all fixes.
- Output dir (all artifacts go here): {{OUTPUT_DIR}}

## Agent Roster (suggested)
1. **Architect** — maps repo, produces dependency + data-flow diagram (mermaid), owns final synthesis.
2. **Backend Auditor** — API routes, DB schema, RLS / authz, auth flows, rate limits, error handling, webhooks, idempotency.
3. **Worker / Pipeline Auditor** — background jobs, scrapers, queues, cron, retry/backoff, dedupe, deliverability.
4. **Frontend / UX Auditor** — pages and components: states (loading/empty/error), accessibility (WCAG AA), responsive, dark mode, perceived perf, console errors, layout shift, keyboard nav.
5. **Load & QA Runner** — drives live test (see below).
6. **Security Reviewer** — secrets, SSRF, prompt injection, IDOR, CSRF, OAuth redirect safety, dependency CVEs.
7. **Reporter** — compiles final markdown + JSON ledger.

## Required Deliverables
1. **Architecture map** (text + mermaid) → embed in report.
2. **Issue ledger**: every finding with severity (P0/P1/P2/P3), file:line, root cause, proposed fix, status (open | fixed | wontfix). Emit BOTH:
   - `{{OUTPUT_DIR}}/audit-report.md` (human report)
   - `{{OUTPUT_DIR}}/audit-report.json` (structured, schema below — REQUIRED for downstream fix crew)
3. **Code changes**: committed to `{{BRANCH}}` with atomic commits. No unrelated refactors. No new features beyond fixes + clear UX upgrades.
4. **Frontend pass** (if applicable): polished logged-in experience. No console errors. Before/after screenshots in `{{OUTPUT_DIR}}/screenshots/` (desktop + mobile).
5. **Live load validation** if specified: {{LOAD_TEST_SPEC}}
6. **Final report** (≤ 2 pages markdown). Sections: Executive Summary, What Was Reviewed, What Was Fixed, Live Test Results, Remaining Risks, Recommended Next Steps. Include one-glance status table (Area | Findings | Fixed | Open | Severity).

## Review Scope Checklist

Backend / APIs:
- All HTTP routes, auth helpers, session handling.
- DB schema, RLS / row-level authz, migrations.
- Rate limits, idempotency, structured logging, error surfaces.
- Webhook signature verification, replay protection.

Workers / Pipelines:
- Daemon loops, scheduling, failure recovery.
- Retries, backoff, dedupe, queue semantics.
- LLM prompt safety, model choice, cost.
- Email deliverability (SPF/DKIM) if relevant.

Frontend:
- Pages + components, focus on logged-in shell.
- Visual polish, micro-interactions, skeleton loaders, optimistic updates, toast feedback.
- Lighthouse mobile + desktop ≥ 90 across the board after fixes.
- Session expiry handling, sign-out, account menu.

Security:
- Secrets in repo / env handling.
- SSRF in any URL-fetching code.
- Prompt injection in LLM-facing inputs.
- IDOR on resource-id routes.
- CSRF + OAuth redirect safety.
- Dependency CVE scan.

## Issue Ledger JSON Schema (REQUIRED)

`{{OUTPUT_DIR}}/audit-report.json` — schema: `templates/issue-schema.json`. Every issue MUST include all required fields. Stable `id`s (AUD-0001, AUD-0002, ...) so a follow-up fix crew can resume + skip already-fixed.

## Constraints
- No backwards-incompatible DB migrations without written rollback plan.
- Do not commit secrets.
- Respect existing CLAUDE.md / AGENTS.md project rules.
- Use code-review-graph MCP tools before Grep/Glob if available.
- Don't add features beyond rubric. Quality > scope.
- Atomic commits, clear messages.

## Live Load Validation

{{LOAD_TEST_SPEC}}

Capture per request: latency, success/failure, payload size, downstream cost. Aggregate p50/p95/p99 latency, error rate, total cost. Include table in final report.

## Final Output Format

- `{{OUTPUT_DIR}}/audit-report.md` — markdown, < 5 min read
- `{{OUTPUT_DIR}}/audit-report.json` — strict schema above
- `{{OUTPUT_DIR}}/screenshots/` — before/after if frontend touched
- PR description summarizing the report on branch `{{BRANCH}}`

Begin.
