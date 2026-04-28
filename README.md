# Claude Code Skills

Custom skills for [Claude Code](https://claude.ai/code). Each skill is a slash command (e.g. `/project-audit`) that gives Claude a structured, multi-step workflow to follow.

## Installation

**Global skills** (available in all projects):
```bash
mkdir -p ~/.claude/skills
cp -r global/<skill-name> ~/.claude/skills/
```

**Project-level skills** (available in one repo):
```bash
mkdir -p .claude/skills
cp project-level/<skill-name>.md .claude/skills/
```

Restart Claude Code after installing.

---

## Global Skills

### `/multi-agent-pick`
**Pick the right multi-agent framework and scaffold a starter.**

Two tiers:
- **Orchestration** (CrewAI / AutoGen / LangGraph) — build agent logic into an app
- **Coding fleet** (Agent Orchestrator / run-agent) — automate work ON a codebase (bug fixes, PRs, CI loops)

The skill asks a few targeted questions, applies a decision matrix, picks a framework with a 1-line reason, then scaffolds runnable starter files.

Trigger: "which agent framework should I use", "how do I parallelize agents", "CrewAI vs LangGraph", "run parallel coding agents across issues".

→ [`global/multi-agent-pick/SKILL.md`](global/multi-agent-pick/SKILL.md)

---

### `/new-project`
**Bootstrap Claude Code for a new repo.**

Three outcomes every time:
1. Project-level `CLAUDE.md` created (or augmented if one exists)
2. `code-review-graph` MCP server wired into `.mcp.json`
3. Knowledge graph built — structural context for all future sessions

Trigger: `/new-project`, "set up Claude Code for this repo", "initialize this project", working in a repo with no `CLAUDE.md`.

→ [`global/new-project/SKILL.md`](global/new-project/SKILL.md)

---

### `/project-audit`
**Full-stack multi-agent audit of the current repo.**

Orchestrates a crew of specialized agents (Architect, Backend, Frontend, Worker, Security, Load) to review the entire codebase end-to-end. Emits:
- `audit-report.md` — human-readable report with architecture map
- `audit-report.json` — structured issue ledger (P0–P3, file:line, root cause, proposed fix)
- `audit-report.pdf` — rendered via pandoc

The JSON ledger is the machine-readable contract — designed to feed a downstream `/project-fix` crew.

Depends on `/multi-agent-pick` to choose the right framework for the audit crew.

→ [`global/project-audit/SKILL.md`](global/project-audit/SKILL.md)  
→ [`global/project-audit/templates/audit-prompt.md`](global/project-audit/templates/audit-prompt.md) — crew prompt template  
→ [`global/project-audit/templates/issue-schema.json`](global/project-audit/templates/issue-schema.json) — JSON schema for issue ledger

---

## Project-Level Skills

These use the `code-review-graph` MCP (structural knowledge graph). Install `code-review-graph` first:
```bash
pip install code-review-graph
code-review-graph install   # wires up MCP in .mcp.json
code-review-graph build     # builds the graph for current repo
```

All four skills follow a token-efficiency rule: start with `get_minimal_context`, use `detail_level="minimal"`, target ≤5 tool calls and ≤800 output tokens per task.

---

### `/debug-issue`
**Systematically trace and debug issues using the knowledge graph.**

Steps: semantic search → trace call chains (callers/callees) → full execution flow → recent change detection → blast radius check.

→ [`project-level/debug-issue.md`](project-level/debug-issue.md)

---

### `/explore-codebase`
**Navigate and understand codebase structure.**

Steps: stats → architecture overview → community modules → specific function/class search → relationship tracing → execution flow.

→ [`project-level/explore-codebase.md`](project-level/explore-codebase.md)

---

### `/refactor-safely`
**Plan and execute refactoring with dependency analysis.**

Steps: community-driven suggestions → dead code detection → rename preview → apply rename → verify impact. Always preview before applying.

→ [`project-level/refactor-safely.md`](project-level/refactor-safely.md)

---

### `/review-changes`
**Risk-aware code review using change detection.**

Steps: risk-scored change analysis → impacted execution paths → test coverage check per high-risk function → blast radius → untested change flagging.

Output grouped by risk level (high/medium/low) with merge recommendation.

→ [`project-level/review-changes.md`](project-level/review-changes.md)

---

## Skill Dependencies

```
/project-audit
  └─ /multi-agent-pick  (picks the crew framework)

/debug-issue, /explore-codebase, /refactor-safely, /review-changes
  └─ code-review-graph MCP  (pip install code-review-graph)
```

## Structure

```
global/
  multi-agent-pick/SKILL.md
  new-project/SKILL.md
  project-audit/
    SKILL.md
    templates/
      audit-prompt.md     ← crew prompt, used by /project-audit
      issue-schema.json   ← JSON schema for audit-report.json
project-level/
  debug-issue.md
  explore-codebase.md
  refactor-safely.md
  review-changes.md
```
