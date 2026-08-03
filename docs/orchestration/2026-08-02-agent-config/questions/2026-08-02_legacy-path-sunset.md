---
status: open
created: 2026-08-02
raised-by: orchestrator (gates P1 the standard, P2 the loader)
task: ../tasks.md#packages
---
# Question: when does the old `.agents/skill-config/` folder stop being read?

**What we need from you.** Decide whether the old settings folder is read forever, or only
until a date we announce now.

**Why this came up.** Settings for these tools live in a folder on your machine. We are
renaming that folder from `.agents/skill-config/` to `.agents/config/`. Nothing breaks today,
because the tools will read both. But "read both" is code we carry forever unless we pick an
end date. You already have three real settings folders under the old name — `fellow`,
`webtree-alert-triage`, and `webtree-finish-task` — and two of those belong to tools that live
outside this project, so they will not be updated by this work.

**Options.**
- **A)** Read the old folder forever, and print a one-line notice when it is used. Nothing you
  own ever breaks, including the two outside tools. Cost: a permanently slightly larger loader,
  and two folder names in circulation indefinitely.
- **B)** Read the old folder until a stated date (say, six months out), print a notice that
  names the date, then drop the fallback. Cleaner end state. Cost: on that date, any tool not
  migrated stops finding its settings — and the two outside tools are exactly the ones nobody
  is tracking.
- **C)** Add a `migrate` command that copies old folders to the new location on first run, then
  drop the fallback quickly. Most convenient, most code to write and test.

**Our default while waiting.** Option A. The loader reads the old path at lower precedence and
prints one notice naming both paths. Switching to B later is a small edit: add a date constant
and a line to the notice. Switching to C is a genuinely new package, not an edit.

**What this blocks.** Nothing. The loader works under all three options; only the notice text
and a possible future removal differ.
**What continues anyway.** Every package — the standard, the shared library, both migrations.

**Your answer.** _(one line is enough)_
