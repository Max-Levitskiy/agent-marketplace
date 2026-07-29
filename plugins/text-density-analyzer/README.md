# text-density-analyzer

Detect **repeated meaning — not just repeated words** — in any text, then either
report it or fix it. AI-generated prose often restates the same idea in different
phrasing; this plugin finds those patterns and measures information density.

## Install

```bash
/plugin marketplace add Max-Levitskiy/skills
/plugin install text-density-analyzer@max-skills
```

## Use

The `analyze-density` skill triggers on phrases like *"check density"*, *"remove AI
slop"*, *"deduplicate this text"*, *"tighten this doc"*, or *"is this repetitive?"* —
or invoke it directly:

```
/text-density-analyzer:analyze-density
```

**Two modes:**

- **Score** (default) — read-only audit. Dispatches 7 core analysis methods (plus
  genre-targeted ones) as parallel subagents, then aggregates a composite density
  score (0–100) with a per-method breakdown and a repeated-claim report.
- **Fix** — rewrites in two ordered passes (remove, then tighten) to strip
  redundancy while preserving every unique fact, number, and example.

Say *"check density of X"* for score mode, or *"tighten X"* / *"remove repetition
in X"* for fix mode.

## How it scores

```
density_score =
    0.35 × unique_claim_ratio
  + 0.25 × compression_ratio
  + 0.20 × average_specificity
  + 0.10 × (1 - redundancy)      # max(semantic, thematic)
  + 0.10 × (1 - filler_ratio)
```

Scaled to 0–100: **80+** dense · **60–79** acceptable · **40–59** bloated ·
**<40** very redundant.

## License & attribution

MIT — originally authored by [Web-Tree](https://github.com/Web-tree). See
[`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).
