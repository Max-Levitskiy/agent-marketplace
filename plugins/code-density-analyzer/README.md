# code-density-analyzer

Detect **AI-generation slop in code** — repeated logic, dead code, filler
comments, over-abstraction, and other patterns human reviewers routinely fix —
then measure how dense the code is. The code counterpart of
[`text-density-analyzer`](../text-density-analyzer): parallel analysis methods
feeding a weighted composite score.

## Install

```bash
/plugin marketplace add Max-Levitskiy/skills
/plugin install code-density-analyzer@max-skills
```

## Use

The `analyze-code-density` skill triggers on phrases like *"check code density"*,
*"find AI slop in this code"*, *"is this code bloated?"*, *"review this
AI-generated code"*, or *"code slop check"* — or invoke it directly:

```
/code-density-analyzer:analyze-code-density
```

**Two input modes, auto-detected:**

- **Diff mode** (in a git repo) — analyzes your working diff / branch / PR with
  repo context, the way a reviewer would. Catches repo-aware slop like
  reimplementing an existing utility or ignoring local conventions.
- **Standalone mode** — analyzes the specific files you name. Repo-context-only
  methods report *not applicable* rather than guessing.

Score mode only in v1: it reports findings and a composite score; it never edits
your code.

## The ten methods

Five adapt the prompt patterns of their `text-density-analyzer` counterparts,
five are code-specific:

| Method | Detects |
|---|---|
| `code-duplication` | Clone / near-clone blocks; reimplementations of existing repo utils |
| `verbosity-inflation` | Logic expressed in materially more code than the idiomatic form |
| `dead-code-filler` | Unused vars/helpers, leftover debug prints, TODO stubs |
| `comment-redundancy` | Comments restating the code instead of explaining why |
| `over-abstraction` | Single-use wrappers, speculative generality |
| `error-masking` | Broad/silent catches, redundant defensive checks |
| `convention-adherence` | Ignoring repo idioms or existing utilities *(diff mode only)* |
| `boilerplate-template` | Generic tutorial-style scaffolding |
| `hallucinated-deps` | Imports / APIs that plausibly don't exist |
| `perf-waste` | Obvious inefficiencies (I/O in loops, N+1, quadratic lookups) |

Each method runs as a parallel subagent returning a strict JSON envelope; the
orchestrator aggregates a weighted composite **0–100** density score: **80+**
dense · **60–79** acceptable · **40–59** bloated · **<40** sloppy. Methods that
fail or don't apply drop out and the remaining weights renormalize.

## Status

v1, smoke-validated in both input modes across Python and TypeScript (see
[`workspace/SMOKE.md`](workspace/SMOKE.md)). The composite **weights, the
per-method scoring function, and the label bands are provisional** — absolute
scores are pre-calibration; only relative separation (sloppy vs clean) is
validated so far. The bundled `workspace/` holds the smoke fixtures and the
first calibration finding; a full evaluation harness against real
AI-authored-then-human-fixed code is planned.

## License & attribution

MIT — authored by [Max Levitskiy](https://github.com/Max-Levitskiy), adapting the
methodology of `text-density-analyzer` (originally by
[Web-Tree](https://github.com/Web-tree)). See [`LICENSE`](LICENSE) and
[`NOTICE`](NOTICE).
