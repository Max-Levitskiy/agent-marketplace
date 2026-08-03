# Questions for Max — index

> Questions that came up during autonomous work on the Agent Config Standard
> ([tasks.md](../tasks.md)). One file per question. Answer by writing one line in a file's
> "Your answer" section, or just say it in chat.

## How this works

- Anyone (agent or person) who hits a decision only Max can make creates one file here,
  named `YYYY-MM-DD_<short-slug>.md`, using the template below.
- **Work never stops for an answer.** Each file states a default assumption and work
  continues with it. The answer later confirms or reverses it.
- Writing rules: short sentences, plain words, every abbreviation or project term explained
  on first use. A reader with no project context should understand it.
- Agents do not edit this index file. The orchestrator updates the tables below.

## Template

```markdown
---
status: open          # open | answered | overtaken-by-events
created: YYYY-MM-DD
raised-by: <package name, e.g. P2 canonical config loader>
task: ../tasks.md#packages
---
# Question: <one line>

**What we need from you.** <one sentence — the decision or the missing fact>

**Why this came up.** <2–4 short sentences of context, plain language>

**Options.**
- **A)** <option> — <what happens if chosen>
- **B)** <option> — <what happens if chosen>

**Our default while waiting.** <what we assume and keep doing>

**What this blocks.** <the specific item on hold, if any — often "nothing">
**What continues anyway.** <everything else>

**Your answer.** _(one line is enough)_
```

## Open questions

| File | Question in one line | Default we proceed with | Status |
|---|---|---|---|
| [2026-08-02_legacy-path-sunset.md](2026-08-02_legacy-path-sunset.md) | When does the old `.agents/skill-config/` path stop being read? | Read it indefinitely, warn on use, no removal date | open |
| [2026-08-02_vendor-sync-enforcement.md](2026-08-02_vendor-sync-enforcement.md) | Should a CI check fail the build when a vendored copy drifts from canonical? | Ship the checker script, document it, do not wire CI | open |

## Answered / closed

| File | Answer | Date |
|---|---|---|
