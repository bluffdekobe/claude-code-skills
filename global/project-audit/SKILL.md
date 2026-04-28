---
name: project-audit
description: |
  Full-stack audit of current project using multi-agent crew. Use when user says "audit my project", "full code review", "find all issues", "review this codebase", or invokes /project-audit. Picks agent framework via /multi-agent-pick, runs end-to-end review (frontend, backend, APIs, workers, security, infra), emits structured issue ledger as audit-report.md + audit-report.json. JSON is consumed by follow-up /project-fix if available. Invoke proactively when user asks for a comprehensive review.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Skill
---

# Project Audit Skill

Goal: orchestrate multi-agent audit of current repo. Produce human-readable report (.md + .pdf) and machine-readable ledger (.json) for downstream fix crew.

---

## Step 1 — Infer scope

Auto-detect everything possible from the codebase. Only ask what cannot be inferred.

**Auto-detect (do not ask):**
- **Repo root**: `pwd` / `git rev-parse --show-toplevel`
- **Stack**: read `package.json`, `pyproject.toml`, `requirements.txt`, `Gemfile`, `go.mod`, `Dockerfile`, `docker-compose.yml`. Identify frameworks (Next.js, FastAPI, etc.) and services.
- **Domain/purpose**: read `README.md`, `CLAUDE.md`, `AGENTS.md` — extract product description from first meaningful paragraph.
- **Branch name**: default `review/multi-agent-audit`. Check if it already exists (`git branch --list`); if so, append `-<timestamp>`.
- **Output dir**: `<repo>/.audits/<UTC-timestamp>/`

**Ask only (one message, skip if args provided):**
1. Load validation needed? (y/n — if y, provide endpoint + scenario)

If invoked as `/project-audit "<description>"`, use that as domain override and ask nothing.

Show inferred values to user before proceeding (one-line summary). Correct silently if user objects.

Persist as `audit-config.json` in output dir for crew reference.

---

## Step 2 — Pick framework

Invoke `/multi-agent-pick` with Tier 2 (coding fleet) preselected. Pass user answers as context.

**Required output from `/multi-agent-pick`:**
- Framework name (e.g. "Agent Orchestrator", "run-agent")
- Run command template
- Whether framework is installed (check before proceeding)

If framework not installed: tell user, provide install command, pause. Do not proceed until confirmed.

If user already has framework chosen, skip and reuse.

---

## Step 3 — Compose audit prompt

Load `templates/audit-prompt.md`. Substitute:

- `{{REPO_ROOT}}`
- `{{STACK}}`
- `{{DOMAIN}}`
- `{{BRANCH}}`
- `{{LOAD_TEST_SPEC}}` (or "N/A")
- `{{OUTPUT_DIR}}`

Write rendered prompt to `<output_dir>/audit-prompt.md`.

---

## Step 4 — Dispatch crew

Show user the exact run command for the chosen framework. Do NOT auto-run — this launches a multi-agent crew that will make commits and may run network calls; user must confirm scope before execution.

Example commands by framework:
- **Agent Orchestrator**: write to `agent-orchestrator.yaml` task field → `ao start`
- **run-agent**: place at `prompts/task.md` → `./run-agent.sh claude <repo> prompts/task.md`

Wait for explicit user confirmation before continuing.

Crew MUST emit:
- `<output_dir>/audit-report.md` — human report
- `<output_dir>/audit-report.json` — structured ledger (see schema below)
- `<output_dir>/screenshots/` — optional

If crew hangs >30 min with no output, ask user to check framework logs. Do not assume success.

---

## Step 5 — Validate output

After crew finishes, verify:
- Both `.md` and `.json` exist
- JSON parses cleanly
- JSON matches schema in `templates/issue-schema.json`
- Each issue has all required fields

If JSON is invalid or missing: ask user whether to re-run crew or manually repair. Do not proceed to PDF step with broken output — the JSON is the machine-readable contract for any follow-up fix crew.

---

## Step 6 — Render PDF

Check `pandoc` exists first:

```bash
which pandoc || echo "PANDOC_MISSING"
```

If present:

```bash
pandoc "<output_dir>/audit-report.md" \
  -o "<output_dir>/audit-report.pdf" \
  --pdf-engine=xelatex \
  -V geometry:margin=1in \
  -V mainfont="Helvetica" \
  --toc
```

Fallback chain: `xelatex` → `wkhtmltopdf` → `weasyprint` → Chrome headless:

```bash
pandoc "<output_dir>/audit-report.md" -o "<output_dir>/audit-report.html" --standalone
google-chrome --headless --disable-gpu --print-to-pdf="<output_dir>/audit-report.pdf" "<output_dir>/audit-report.html"
```

If all PDF engines unavailable: skip PDF, note in final output. The `.md` and `.json` are primary deliverables — PDF is convenience.

---

## Step 7 — Final output

Print:

```
Audit complete.
Output dir: <output_dir>
- audit-report.md
- audit-report.pdf  (or: PDF skipped — pandoc not available)
- audit-report.json  (<N> issues: P0=<x> P1=<y> P2=<z> P3=<w>)

Top issues:
  P0: <list titles if any>
  P1: <list titles if any>

Next: run /project-fix <output_dir>/audit-report.json to dispatch fix crew.
(If /project-fix not available, open audit-report.md and address P0/P1 issues manually.)
```

---

## Issue ledger schema

See `templates/issue-schema.json` for full JSON Schema. Required fields per issue:

| Field | Values |
|---|---|
| `id` | `AUD-0001` format — stable across re-runs so fix crew can resume and skip already-fixed |
| `severity` | P0 (blocker) / P1 (high) / P2 (med) / P3 (low) |
| `area` | frontend / backend / api / worker / security / infra / db / ux |
| `file` | repo-relative path |
| `line` | integer or null |
| `category` | bug / perf / security / a11y / dx / reliability / cost |
| `title` | short label |
| `root_cause` | why the problem exists |
| `proposed_fix` | how to fix it |
| `status` | open / fixed / wontfix |
| `fix_hint_files` | paths likely to edit (array) |
| `tests_to_add` | test files to add (array, optional) |
