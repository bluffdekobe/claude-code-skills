---
name: new-project
description: |
  Bootstrap a new project for Claude Code. Wires up code-review-graph MCP, creates a lean project-level CLAUDE.md with graph tool table, and builds the knowledge graph.
  
  Invoke when: user runs /new-project, says "set up Claude Code for this repo", "initialize this project", "I'm starting on a new codebase", or asks to configure MCP tools for a project. Trigger proactively after git init or when working in a repo with no CLAUDE.md and no .mcp.json.
allowed-tools:
  - Bash(pwd)
  - Bash(ls *)
  - Bash(git *)
  - Bash(find *)
  - Bash(grep *)
  - Bash(code-review-graph *)
  - Bash(/Library/Frameworks/Python.framework/Versions/3.12/bin/code-review-graph *)
  - Write
  - Read
---

# New Project Bootstrap

Run at the start of any new codebase with `/new-project`. Three outcomes:
1. Project-level `CLAUDE.md` created or augmented
2. `code-review-graph` MCP server wired into `.mcp.json`
3. Knowledge graph built — structural context for all future sessions

## Steps

### 1. Detect project root

Run `pwd`. If you're inside a subdirectory (e.g., `src/`, `packages/foo/`), say so and ask the user to confirm the intended root before continuing.

### 2. Check for existing CLAUDE.md

Run `ls CLAUDE.md 2>/dev/null`. If one exists, read it. Only add sections that are missing — never overwrite existing content. If all sections already exist, skip to step 4.

### 3. Write project-level CLAUDE.md

If no CLAUDE.md exists, create one at the project root with this content (replace `<PROJECT_NAME>` with the directory name from `pwd`):

```markdown
# <PROJECT_NAME>

<!-- One-line description of what this project does. Fill this in. -->

## Stack

<!-- List the main technologies: language, framework, database, etc. Fill this in. -->

## Codebase Exploration

Use `code-review-graph` MCP tools BEFORE Grep/Glob/Read.

| Tool | Use when |
|------|----------|
| `semantic_search_nodes` | Find functions/classes by name |
| `detect_changes` | Risk-scored review of recent changes |
| `get_review_context` | Token-efficient source snippets |
| `get_impact_radius` | Blast radius of a change |
| `get_affected_flows` | Impacted execution paths |
| `query_graph` | Callers, callees, imports, tests |
| `get_architecture_overview` | High-level structure |
| `refactor_tool` | Renames, dead code |
```

### 4. Wire up code-review-graph MCP

Check if `.mcp.json` already exists and contains `code-review-graph`:
```bash
grep -q "code-review-graph" .mcp.json 2>/dev/null && echo "exists" || echo "missing"
```

If missing, run (try PATH first, fall back to full Python path):
```bash
code-review-graph install 2>/dev/null || /Library/Frameworks/Python.framework/Versions/3.12/bin/code-review-graph install
```

If both fail, tell the user: "`code-review-graph` not found. Install with: `pip install code-review-graph`" — do not proceed to step 5.

### 5. Build the knowledge graph

Check repo size first to set expectations:
```bash
find . -not -path './.git/*' -type f | wc -l
```

If >10,000 files, warn the user: "Large repo — graph build may take 2–5 minutes." Then run:
```bash
code-review-graph build 2>/dev/null || /Library/Frameworks/Python.framework/Versions/3.12/bin/code-review-graph build
```

Report the final line of output to the user.

If the directory is not a git repo and build fails, suggest `git init` first — the graph works best on git repos.

### 6. Report back

Print a short summary:
- Project root confirmed: `<path>`
- CLAUDE.md: created / already existed (sections added: X)
- code-review-graph MCP: configured / already configured
- Graph: built successfully / already up to date

If `.mcp.json` was created for the first time, add:
> **Restart Claude Code now.** MCP servers load only at startup — until you restart, the graph tools won't be available in this session.

### Error handling

- Never abort silently — always report what succeeded and what needs a manual follow-up.
- If any step fails, complete the remaining steps and list all failures at the end.
