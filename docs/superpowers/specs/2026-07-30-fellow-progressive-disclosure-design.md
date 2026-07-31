# Fellow skill: progressive disclosure

**Date:** 2026-07-30
**Status:** Approved, not yet implemented
**Scope:** `plugins/fellow/skills/fellow/`

## Problem

`SKILL.md` is 220 lines (~16 KB, ~4k tokens) and loads in full the moment the skill
triggers. Roughly 100 of those lines are task-specific — onboarding, project
classification, recap-filing, export, action items — and only one of those tasks is
ever in play at a time. The file also carries 13 lines it explicitly describes as
unnecessary ("You don't need these to use the CLI").

The frontmatter `description` is a separate cost: ~130 words load in *every* session,
whether or not meetings come up.

## Design

### Core keeps what is always true

`SKILL.md` retains, at roughly 95 lines:

- the `$F` invocation preamble
- the `config check` gate ("Start here every time")
- project-scoping basics — that filtering is already applied, `--project`,
  `--all-meetings`
- the search → `recap` hot path, uncompressed
- the AI-notes caution, compressed (see below)
- output modes, pagination, read-only scope

### Five task files, reached by inline pointers

| File | Absorbs (original line numbers) | Read when |
| --- | --- | --- |
| `references/onboarding.md` | 30–50 | `config check` reports missing config |
| `references/project-scoping.md` | 65–106 | no projects configured, or judging `project undecided` |
| `references/writing-recaps.md` | 153–165 | filing a recap into a repo or vault |
| `references/export.md` | 167–177 | bulk export |
| `references/action-items.md` | 179–190 | action-item questions |
| `references/api.md` (existing) | 204–216 | debugging or calling the API directly |

Pointers follow the convention already used in `plugins/orchestrate/skills/orchestrate/SKILL.md`:
a bold imperative at the point of need — **read `references/x.md`** — not a routing
table. Each pointer sits in the core section whose flow leads to it, so onboarding
hangs off the `config check` failure branch and the three task files hang off a short
"Other tasks" block after the hot path.

### Guardrails do not leave the core

Extracting a section extracts its safety rule with it, and a reference file that is not
read is a rule that does not exist. Each pointer line therefore carries its guardrail
inline:

- **`project classify`** writes to the *committed* repo config, shared with teammates
  and shaping every future query. "Never record a verdict the user hasn't agreed to"
  stays in the core.
- **`export`** can commit verbatim transcripts of everything said. "Warn before a wide
  window lands in a git repo" stays in the core.
- **`action-items`** truncates at 50 rows with no error. "Always `--all`" stays in the
  core.

Cost: three lines. Benefit: a skipped read degrades to *less detail* rather than *wrong
action*.

### Compression, not only relocation

The AI-notes caution (123–136) is hot-path — it applies whenever a recap is read — so
extracting it would mean it rarely loads when it matters. It is compressed in place
instead: the rule and both commands stay; the extended illustration about participants
swapping which shorthand label means which option is dropped.

This is the only place where content is lost rather than moved. Everything else in the
original 220 lines survives verbatim in its new home.

### Description

Trimmed from ~130 words to ~60, saving ~100 tokens per session. Retained: the capability
sentence, the "trigger even when Fellow is never named" instruction, and three
representative example phrasings. Dropped: the remaining examples, which cost coverage
around standups, 1-on-1s, and client calls.

Accepted risk: trigger coverage is reduced and nothing measures the regression. Adding
eval cases was considered and declined as scope.

### Relative paths

Content moving into `references/` changes its depth by one level. Two links must be
rewritten:

- `config.example.json` → `../config.example.json`
- the Skill Config Standard → `../../../../../standards/skill-config.md` (five levels,
  not the four correct from `SKILL.md`)

## Out of scope

- No eval harness.
- No CLI changes; guardrails stay in prose rather than being enforced in `fellow.ts`.
- No changes to the `orchestrate` skill, which has the same problem at 243 lines.
- No rewrite of `references/api.md` beyond appending the absorbed gotchas.

## Verification

1. Every `bun "$F" …` invocation in relocated text still resolves against
   `bun fellow.ts help`.
2. Every relative link in every new file resolves to an existing path.
3. Diffing the original 220 lines against the union of the new files accounts for every
   line as either moved, retained, or deliberately compressed per the section above.
4. `SKILL.md` lands at roughly 95 lines.
