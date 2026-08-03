---
status: open
created: 2026-08-02
raised-by: orchestrator (affects P2, P7, and the repo's automation)
task: ../tasks.md#packages
---
# Question: should an automated check fail the build when a copied library file drifts?

**What we need from you.** Decide whether the copy-drift check runs automatically on every
change, or stays a script someone runs by hand.

**Why this came up.** You chose to solve the duplication by keeping one master copy of the
shared settings code in the new `agent-config` plugin, and giving each other plugin a verbatim
copy of it. That choice avoids one plugin depending on another being installed — but copies
drift. The usual fix is a check that compares each copy against the master and complains when
they differ. This project has no automated checks today (no GitHub Actions workflow at all), so
adding one is a new thing for the repo, not a tweak to an existing setup.

**Options.**
- **A)** Ship the checker as a script and document it. Anyone can run it; nothing runs on its
  own. Zero new infrastructure. Drift is caught only when someone remembers to look.
- **B)** Ship the script and wire it into a GitHub Actions workflow that fails a pull request
  when a copy differs from the master. Drift becomes impossible to merge. Cost: the repo gains
  its first CI workflow, and every future contributor inherits it.
- **C)** Skip the checker entirely and rely on the "do not edit — vendored from ..." header at
  the top of each copy. Least work. Relies purely on people reading a comment.

**Our default while waiting.** Option A. We write the checker script and document how to run
it, but add no GitHub Actions workflow. Moving to B later is a small addition — one workflow
file that calls the script that already exists.

**What this blocks.** Nothing. The copies, their headers, and the script all get written either
way; only the automatic enforcement differs.
**What continues anyway.** Every package.

**Your answer.** _(one line is enough)_
