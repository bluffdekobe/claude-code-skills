---
name: multi-agent-pick
description: |
  Pick best multi-agent framework for current project, scaffold minimal runnable starter.
  Covers two tiers: Orchestration (CrewAI / AutoGen / LangGraph) for building agent logic
  into apps, and Coding-agent fleets (Agent Orchestrator / run-agent) for automating work
  ON a codebase (bug fixes, PRs, CI loops). Invoke proactively when user asks: which agent
  framework to use, how to parallelize agents, how to build a multi-agent pipeline, whether
  to use CrewAI vs LangGraph vs AutoGen, how to run parallel coding agents across issues.
  Reads local cheatsheet at ~/Desktop/_Projects/_agent-frameworks-ref/.
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---

# Multi-Agent Framework Picker + Scaffolder

Goal: pick the right framework, explain why, scaffold runnable starter. Minimize back-and-forth.

---

## Step 1 — Load reference

```bash
cat ~/Desktop/_Projects/_agent-frameworks-ref/CHEATSHEET.md
```

If missing: tell user the skill depends on it; suggest `git clone` or re-fetch. Continue with built-in matrix below.

---

## Step 2 — Determine tier from context

Infer tier from what the user said. Ask only if genuinely ambiguous.

- **Tier 2 (Coding fleet)**: user mentions fixing bugs, opening PRs, running tasks across issues, automating repo work, parallel coding agents
- **Tier 1 (Orchestration)**: user mentions building a pipeline, shipping agent features in an app, orchestrating LLM calls

If ambiguous, ask one question:
> **Automating work ON a codebase** (bug fixes, PRs, CI loop) — or **building agent logic** into an app?

---

## Step 3 — Gather context

### Tier 1 — Orchestration

Detect in parallel:
- Check `package.json`, `pyproject.toml`, `requirements.txt`, `*.csproj` for stack
- Grep for existing agent deps: `langchain`, `crewai`, `autogen`, `openai`, `anthropic`

If an agent framework already appears in deps, default to scaffolding for it (skip pick, note it).

Ask user (one message, only missing signals):
1. Task agents should perform? (1 sentence)
2. Durable state / human-in-loop / long-running needed? (y/n)
3. "Team of specialists" pattern (distinct roles, handoffs)? (y/n)
4. Cross-language or distributed? (y/n)

### Tier 2 — Coding fleet

Ask user (one message):
1. How many parallel tasks/issues to run? (rough number)
2. Need web dashboard to supervise? (y/n)
3. Need to mix models (Claude + Codex + Gemini)? (y/n)
4. Node.js 20+ and tmux available? (y/n)

---

## Step 4 — Pick

### Tier 1 decision matrix

Apply top matching rule:

| Signal | Pick | Why |
|--------|------|-----|
| TS/JS stack | **LangGraph JS** | Native TS types, only mature graph framework in JS ecosystem |
| .NET stack | **AutoGen** | Only framework with first-class .NET support |
| Stateful + HITL + long-running | **LangGraph** | Built-in checkpointing, interrupt/resume, persistent state graph |
| Custom topology / distributed / mixed models | **AutoGen** | Actor model + distributed runtime handle arbitrary topologies |
| "Team of specialists" Python (distinct roles, sequential handoffs) | **CrewAI** | Role-based DSL maps directly to specialist patterns; minimal boilerplate |
| Default Python (none of above) | **CrewAI** | Lowest setup cost, good docs, fast iteration |

Tie-break: stateful beats specialist (LangGraph > CrewAI when both apply).

### Tier 2 decision matrix

| Signal | Pick | Why |
|--------|------|-----|
| Multiple issues → PRs, CI-fix loop, dashboard wanted, Node available | **Agent Orchestrator** (`@aoagents/ao`) | Turnkey: one agent per issue, auto CI-fix, auto PR, localhost dashboard |
| Complex tasks, mixed models, max observability, no Node/tmux | **run-agent** | Shell-first, model-agnostic, MESSAGE-BUS.md coordination pattern |

State pick + 1-line reason. Offer to swap if user wants a different tradeoff.

---

## Step 5 — Scaffold

### CrewAI (Python)
- Add `crewai>=0.80` to deps
- Create `agents/crew.py` — 2 agents + 1 task using user's task description
- Create `agents/run.py` entrypoint
- README snippet: `python agents/run.py`
- Env: `ANTHROPIC_API_KEY`

### AutoGen (Python)
- Add `autogen-agentchat`, `autogen-ext[openai]` to deps
- Create `agents/team.py` — `RoundRobinGroupChat` of 2 agents
- Async entrypoint with `asyncio.run`
- Env: `ANTHROPIC_API_KEY`

### LangGraph (Python or TS)
- Python: `langgraph`, `langchain-anthropic`
- TS: `@langchain/langgraph`, `@langchain/anthropic`
- Create `agents/graph.{py,ts}` — `StateGraph`, 2 nodes, conditional edge
- Entrypoint: `.compile().invoke({...})`
- Env: `ANTHROPIC_API_KEY`

### Agent Orchestrator (Coding fleet)
- Prerequisites: Node.js 20+, tmux, gh CLI — check and warn if missing
- Install: `npm install -g @aoagents/ao`
- Start: `ao start` (from project root)
- Dashboard: localhost:3000, one agent per issue, auto CI-fix, auto PR
- Create `agent-orchestrator.yaml` stub if not present

### run-agent (Coding fleet)
- Clone: `git clone https://github.com/jonnyzzz/run-agent.git`
- Usage: `./run-agent.sh claude /path/to/repo your-prompt.md`
- Create `prompts/task.md` stub with user's task description
- Explain MESSAGE-BUS.md coordination pattern

---

## Step 6 — Verify (do NOT install or run without confirmation)

Show install command. Show run command. Wait for user to confirm before executing.

---

## Output format

```
Tier: <Orchestration | Coding fleet>
Pick: <framework>
Reason: <1 line — the specific signal that decided it>
Files created:
  - <relative/path/to/file>
  - ...
Install: <cmd>
Run: <cmd>
Env vars needed: <list>
```

Example:
```
Tier: Orchestration
Pick: LangGraph
Reason: Python project needs human-in-loop with durable state between runs
Files created:
  - agents/graph.py
  - agents/run.py
Install: pip install langgraph langchain-anthropic
Run: python agents/run.py
Env vars needed: ANTHROPIC_API_KEY
```
