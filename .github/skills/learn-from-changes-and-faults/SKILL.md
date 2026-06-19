---
name: learn-from-changes-and-faults
description: 'Propagate learnings back into the project''s skills, instructions, plan docs, and memory whenever reality diverges from what they say — the auto-learning / self-correction loop. USE WHEN: the user corrects or overrides an approach a skill/plan/instruction told you to take; you change or update a plan .md while implementing a task; a documented skill step fails and you find the right one; you hit a fault, gotcha, or footgun a skill/plan did not warn about; the user mandates a new or updated convention that supersedes existing guidance. THEN: capture the delta, find EVERY cross-referenced location (skills, .github/instructions, plan spec + phase guides, AGENTS.md, /memories/), update them in sync, grep the old value to confirm no stale references remain, and validate. DO NOT USE FOR: routine implementation with no correction/fault; one-off task specifics; persisting secrets. Keywords: auto learning, self-improvement, update skill, update plan, keep docs in sync, fix outdated skill, record gotcha, plan changed, user correction, fault, lesson learned, reconcile drift, memory, continuous learning.'
---

# Learn From Changes and Faults

The project's **skills**, **instructions**, **plan docs**, and **memory** are living sources of truth.
When you discover they are wrong, outdated, or the user changes the approach, you MUST feed that
learning back so the next run benefits and the same fault is never repeated. This is the auto-learning
loop: *implement → notice a delta → propagate it everywhere → verify → remember*.

## When to use (triggers)

Run this loop the moment ANY of these happen:

- **User correction**: the user overrides or corrects an approach a skill / plan / instruction told
  you to take (e.g. "use X not Y", "rename A to B", "actually we changed the port to 5001").
- **Plan change**: you edit, extend, or reorder a plan `.md` while implementing a task — or the user
  edits one.
- **Skill fault**: a documented skill/instruction step fails, is ambiguous, or is missing, and you
  find the correct step or a workaround.
- **Discovered footgun**: you hit a gotcha, constraint, or bug a skill/plan/AGENTS rule did not warn
  about and had to work around it (e.g. a tool that cannot resolve a path, a Node version that breaks
  a native build, a loader limitation).
- **New convention**: the user mandates a new/updated convention that supersedes existing guidance.

## When NOT to use

- Routine implementation where nothing diverged from the docs.
- One-off, task-specific details that will not recur.
- Anything secret (keys, tokens, passwords) — those NEVER go into skills, plans, or memory.

## Core principle

**The FILES are the source of truth, not just memory.** A learning is only "saved" when the durable
documents are updated. Always update the relevant skill / instruction / plan FILE *and* (optionally)
memory — never memory alone. Keep one canonical place per fact and cross-reference it; do not
duplicate the same rule in five files.

## Procedure

1. **Capture the delta** in one line: *"<source> said A; reality is B because C."* This is the
   learning. Be precise about the fault and the fix.
2. **Locate every source of truth** that asserted the now-outdated guidance. Search broadly — the
   same claim is usually cross-referenced in several places:
   - Skills: `.github/skills/<name>/SKILL.md` (and any `references/`).
   - Instructions: `.github/instructions/*.instructions.md` (esp.
     [plan-consistency](../../instructions/plan-consistency.instructions.md) — its mapping table is
     the canonical index of WHERE each plan concept lives).
   - Plan: the spec (`plan/feature-*.md` — REQ/SEC/CON/GUD/PAT/DEP/FILE/TASK rows) and the phase
     guides (`plan/**/phase-*.md` code sketches + steps).
   - Always-on rules: `AGENTS.md` / `copilot-instructions.md`.
   - Memory: `/memories/repo/` (repo facts), `/memories/` (cross-workspace patterns).
   - Use `grep_search` for the stale term/symbol/value (set `includeIgnoredFiles: true` for `plan/`
     and `.github/` if they are git-ignored) so you find ALL occurrences, not just the obvious one.
3. **Update them in sync.** Fix the wrong step AND add a short WHY/gotcha note so the fault cannot
   recur. Follow the `plan-consistency` mapping for plan edits (update the spec rows *and* the phase
   guides *and* the skill together). Keep edits **surgical** — change only what genuinely diverged;
   preserve each doc's voice and structure.
4. **Grep for the OLD value again** to confirm zero stale references remain across plan, skills,
   instructions, AGENTS, and code comments (the plan-consistency "grep before finishing" rule).
5. **Record the durable learning in memory** (concise — a single line/bullet). Repo-scoped facts →
   `/memories/repo/`; general preferences/patterns → `/memories/`. Update or remove any memory that
   the change made wrong.
6. **Validate.** If code changed, run the gate (`pnpm lint && pnpm typecheck && pnpm test`, or the
   package-scoped subset). Do not consider the learning landed until it is green and consistent.

## Where each kind of learning goes

| Learning | Update |
|---|---|
| A skill's step was wrong / outdated / missing | that `.github/skills/<name>/SKILL.md` step + a gotcha/WHY note |
| Plan content changed (provider, routing strategy, Drizzle entity, dialect, endpoint, env var, base columns) | plan spec rows + phase guides per the `plan-consistency` mapping table |
| An always-on engineering rule changed | `AGENTS.md` (the matching section) + surface it to the user first |
| Codebase fact: build/test command, env constraint, verified practice, structure | `/memories/repo/` (and AGENTS.md if it is always-on) |
| Cross-workspace preference or pattern | `/memories/` (user memory) |
| A customization file's structure/frontmatter is broken | use the `agent-customization` skill |

## Guardrails

- **Only propagate CONFIRMED learnings** — a real user correction, a reproduced fault, or an actual
  change you made. Do not invent rules or over-generalize from a single case.
- **Surface, do not silently override.** If a learning conflicts with an always-on rule (`AGENTS.md`)
  or a deliberate decision in the plan, tell the user and get agreement before changing it.
- **No secrets** in skills, plans, or memory — ever.
- **Surgical + reversible.** Docs are git-tracked, so edits are safe, but never delete in-progress or
  unfamiliar content, and never rewrite unrelated guidance.
- **Mark the plan task done** (✅ + date) and update any "current status / resume" pointer when a
  tracked task's behavior changes, so the plan stays an accurate ledger.

## Worked example (this repo)

While building the pluggable database-provider layer, a **fault** surfaced: drizzle-kit's config loader cannot
resolve NodeNext `.js` import specifiers through the provider modules. The loop ran:
1. Delta: *"`drizzle.config.ts` was meant to read `getActiveProvider()`; reality — drizzle-kit's
   loader cannot import the provider modules, so the config must be self-contained."*
2. Located sources: the spec (`GUD-011`, `PAT-009`, `FILE-002`), the phase-0.5 guide, the
   `database-changes` and `add-database-dialect` skills, and the memory breadcrumb.
3. Updated all of them in sync — carved drizzle.config out as the one documented inline-branch
   exception, removed the dead `kit` machinery, and noted the WHY everywhere.
4. Grepped for the removed `kit`/`DrizzleKitFragment` to confirm no stale references.
5. Recorded the constraint in `/memories/repo/`.
6. Re-ran the gate (green) before marking the tasks ✅.

## Done checklist

- [ ] Delta captured (fault + fix, one line).
- [ ] Every cross-referenced location found via search and updated in sync.
- [ ] WHY/gotcha note added so the fault cannot recur.
- [ ] Grepped the OLD value — zero stale references remain.
- [ ] Durable learning recorded in the right memory scope (no secrets).
- [ ] Gate green if code changed; plan task marked ✅ + resume pointer current.
