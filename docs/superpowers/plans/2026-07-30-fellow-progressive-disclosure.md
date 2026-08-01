# Fellow Skill Progressive Disclosure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `plugins/fellow/skills/fellow/SKILL.md` from 220 always-loaded lines into a smaller always-loaded core plus five task-scoped reference files, so only the instructions a given task needs enter context. Drafted against a ~95-line target; the measured result is 110 (see Task 7 Step 2).

**Architecture:** Content that is always true stays in `SKILL.md`. Content needed for exactly one task moves to `references/<task>.md`, reached by a bold imperative pointer at the point of need — the convention already used in `plugins/orchestrate/skills/orchestrate/SKILL.md:146,173`. Each pointer carries its section's safety rule inline, so a skipped read degrades to *less detail* rather than *wrong action*.

**Tech Stack:** Markdown only. No code changes. Verification via a bash link/command checker run from the scratchpad.

## Global Constraints

- **Nothing is lost except one named passage.** Every line of the original 220 must end up moved verbatim, retained, or covered by the single deliberate compression in Task 6. Reconcile against `git show 5e1bc13:plugins/fellow/skills/fellow/SKILL.md`.
- **Guardrails never leave `SKILL.md`.** The three rules named in Tasks 3 and 4 stay in the core even though their surrounding prose moves.
- **Pointer style is a bold imperative**, e.g. ``**read `references/onboarding.md`**`` — not a routing table, not a bare link.
- **Depth changes by one level inside `references/`.** The Skill Config Standard is `../../../../standards/skill-config.md` from `SKILL.md` but `../../../../../standards/skill-config.md` from `references/`. `config.example.json` becomes `../config.example.json`.
- **Do not modify** `scripts/`, `config.example.json`, or add eval cases. Out of scope per the spec.
- **`--transcript-only` is real** (`scripts/fellow.ts:207,209`) despite being absent from `bun fellow.ts help`. Do not "fix" it.

---

## File Structure

| Path | Action | Responsibility |
| --- | --- | --- |
| `plugins/fellow/skills/fellow/SKILL.md` | Modify | Always-true material + pointers. Drafted at ~95 lines; measured 110. |
| `.../references/onboarding.md` | Create | First-run setup only. |
| `.../references/project-scoping.md` | Create | Bootstrapping projects + judging undecided series. |
| `.../references/writing-recaps.md` | Create | Filing a recap into a repo or vault. |
| `.../references/export.md` | Create | Bulk export. |
| `.../references/action-items.md` | Create | Action-item queries. |
| `.../references/api.md` | Modify | Absorbs the "Gotchas" list; TOC updated. |

All line numbers below refer to the **original** `SKILL.md` at commit `5e1bc13`, retrievable with:

```bash
git show 5e1bc13:plugins/fellow/skills/fellow/SKILL.md
```

---

### Task 1: Set up the verification harness

No repository changes. This builds the gate every later task runs.

**Files:**
- Create: `<scratchpad>/check-skill-refs.sh` (not committed — verification tooling is out of scope per the spec)

**Interfaces:**
- Produces: `bash check-skill-refs.sh <skill-dir>` → prints `BROKEN LINK` / `BROKEN ANCHOR` / `UNKNOWN COMMAND` lines and a line-count table; exits 1 if any problem, 0 otherwise.

- [ ] **Step 1: Write the checker**

```bash
#!/usr/bin/env bash
# Verify the fellow skill's markdown: relative links resolve, anchors exist,
# and every `bun "$F" <cmd>` names a real CLI command.
#
# Usage: bash check-skill-refs.sh <skill-dir>
set -uo pipefail

SKILL_DIR="${1:?usage: check-skill-refs.sh <skill-dir>}"
cd "$SKILL_DIR" || exit 2

md_files=$(find . -name '*.md' | sort)

# Problems are reported from inside pipelines (subshells), so they are collected
# in a file rather than a variable — a shell variable set in a subshell is lost.
problems=$(mktemp)
trap 'rm -f "$problems"' EXIT
report() { echo "$*" | tee -a "$problems"; }

# --- 1. relative links resolve (and anchors exist in the target) -------------
for f in $md_files; do
  grep -oE '\]\([^)]+\)' "$f" 2>/dev/null | sed -E 's/^\]\(|\)$//g' | while read -r link; do
    case "$link" in http*) continue ;; esac
    path="${link%%#*}"
    anchor=""
    case "$link" in *#*) anchor="${link#*#}" ;; esac
    dir=$(dirname "$f")

    if [ -n "$path" ]; then
      target="$dir/$path"
      if [ ! -e "$target" ]; then
        report "BROKEN LINK  $f -> $link (no such file)"
        continue
      fi
    else
      target="$f"
    fi

    if [ -n "$anchor" ]; then
      # derive GitHub-style slugs from headings in the target
      if ! grep -E '^#{1,6} ' "$target" \
           | sed -E 's/^#+ //; s/`//g' \
           | tr '[:upper:]' '[:lower:]' \
           | sed -E 's/[^a-z0-9 -]//g; s/ /-/g' \
           | grep -qx "$anchor"; then
        report "BROKEN ANCHOR  $f -> $link"
      fi
    fi
  done
done

# --- 2. every `bun "$F" <cmd>` names a real command --------------------------
# Commands the CLI actually implements (verified against scripts/fellow.ts).
known="whoami notes recordings action-items recap search export config project help"

grep -ohE 'bun "\$F" [a-z-]+' $md_files 2>/dev/null \
  | awk '{print $3}' | sort -u | while read -r cmd; do
    case " $known " in
      *" $cmd "*) ;;
      *) report "UNKNOWN COMMAND  bun \$F $cmd" ;;
    esac
  done

# --- 3. report sizes ---------------------------------------------------------
echo
echo "--- line counts ---"
wc -l $md_files | sort -k1 -n

if [ -s "$problems" ]; then
  echo
  echo "FAILED: $(wc -l < "$problems" | tr -d ' ') problem(s)"
  exit 1
fi
echo
echo "OK: links and commands check out"
exit 0
```

- [ ] **Step 2: Prove the checker fails on breakage**

A checker that never fails proves nothing. Build a sandbox containing one instance of each failure class:

```bash
SB=<scratchpad>
rm -rf "$SB/negtest" && mkdir -p "$SB/negtest/references"
cat > "$SB/negtest/SKILL.md" <<'EOF'
# Title

## Real Heading

Good file link: [api](references/api.md)
Bad file link: [nope](references/missing.md)
Good anchor: [h](#real-heading)
Bad anchor: [h](#no-such-heading)
Good cross-anchor: [b](references/api.md#basics)
Bad cross-anchor: [b](references/api.md#nonexistent)

    bun "$F" recap 123
    bun "$F" bogus-cmd
EOF
printf '# Ref\n\n## Basics\n' > "$SB/negtest/references/api.md"
bash "$SB/check-skill-refs.sh" "$SB/negtest"; echo "exit=$?"
```

Expected: four problems reported (`BROKEN LINK`, two `BROKEN ANCHOR`, `UNKNOWN COMMAND`) and `exit=1`.

- [ ] **Step 3: Prove the checker passes on the current skill**

```bash
bash "$SB/check-skill-refs.sh" plugins/fellow/skills/fellow; echo "exit=$?"
```

Expected: `OK: links and commands check out`, `exit=0`, and a line-count table showing `220 ./SKILL.md` and `168 ./references/api.md`. Record those two numbers — Task 7 reconciles against them.

No commit — this task touches no repository files.

---

### Task 2: Extract onboarding

**Files:**
- Create: `plugins/fellow/skills/fellow/references/onboarding.md`
- Modify: `plugins/fellow/skills/fellow/SKILL.md` (removes original lines 30–50; edits the bullet at 27)

**Interfaces:**
- Produces: `references/onboarding.md`, pointed to from the `config check` failure branch.

- [ ] **Step 1: Create the reference file**

Move original lines **30–50 verbatim** into the new file, prefixed with a one-line orientation. The only edits to the moved text are the two relative paths.

````markdown
# Onboarding

Read this when `bun "$F" config check` reports missing configuration. The goal is a
working setup, so finish by verifying — not by writing a file and hoping.

<original lines 34–48, verbatim>

The full layering and credential-reference rules are in
[the Skill Config Standard](../../../../../standards/skill-config.md); read it if the
user asks something the four questions above don't cover.
````

Two path edits inside the moved text:
- `config.example.json` → `../config.example.json` (original line 46)
- `../../../../standards/skill-config.md` → `../../../../../standards/skill-config.md` (original line 50)

- [ ] **Step 2: Replace the section in the core with a pointer**

Delete original lines 30–50 (the whole `## Onboarding` section). Rewrite the middle bullet of the `## Start here every time` list (original line 27) to read:

```markdown
- **Reports missing config** → **read `references/onboarding.md`** and follow it. Missing config is the expected first-run state, not a failure — don't report it to the user as an error.
```

- [ ] **Step 3: Fix the now-dangling anchor**

Original line 27 linked `[Onboarding](#onboarding)`; that heading no longer exists in `SKILL.md`. The rewrite above removes the link. Confirm no other `#onboarding` reference survives:

```bash
grep -n '#onboarding' plugins/fellow/skills/fellow/SKILL.md
```

Expected: no output.

- [ ] **Step 4: Verify**

```bash
bash "$SB/check-skill-refs.sh" plugins/fellow/skills/fellow; echo "exit=$?"
```

Expected: `exit=0`. `SKILL.md` should now be ~199 lines.

- [ ] **Step 5: Confirm nothing was dropped**

Every non-blank line of original 34–48 must appear in the new file:

```bash
git show 5e1bc13:plugins/fellow/skills/fellow/SKILL.md | sed -n '34,48p' | grep -v '^$' \
  | while IFS= read -r l; do
      grep -qF -- "$l" plugins/fellow/skills/fellow/references/onboarding.md \
        || echo "MISSING: $l"
    done
```

Expected: no output except for the two lines containing the rewritten paths.

- [ ] **Step 6: Commit**

```bash
git add plugins/fellow/skills/fellow/SKILL.md plugins/fellow/skills/fellow/references/onboarding.md
git commit -m "♻️ refactor(fellow): move onboarding out of SKILL.md

Onboarding runs once, on first use, but loaded on every trigger. Moves it
behind a pointer on the config-check failure branch."
```

---

### Task 3: Extract project scoping

**Files:**
- Create: `plugins/fellow/skills/fellow/references/project-scoping.md`
- Modify: `plugins/fellow/skills/fellow/SKILL.md` (removes original lines 65–106)

**Interfaces:**
- Consumes: nothing from Task 2.
- Produces: `references/project-scoping.md`, pointed to from the `## Project scoping` section that remains in the core.

**Guardrail that must stay in the core:** verdicts land in the *committed* repo config. The full "Never record a verdict the user hasn't agreed to" paragraph (original line 106) moves with the protocol, but a one-line form stays behind.

- [ ] **Step 1: Create the reference file**

Move original lines **65–106 verbatim** — both `### If no projects are configured` and `### Classifying what the rules can't decide` — under a new title:

````markdown
# Project scoping: bootstrapping and classification

Read this when no projects are configured yet, or when `bun "$F" project undecided`
returns series that need judging.

<original lines 65–106, verbatim, with `##` heading levels instead of `###`>
````

Promote the two `###` headings to `##` since they are now top-level in their own file. One path edit: `config.example.json` → `../config.example.json` (original line 75).

- [ ] **Step 2: Replace with a pointer carrying the guardrail**

Delete original lines 65–106. Keep original lines 52–63 (the `## Project scoping` heading and the `--project` / `--all-meetings` basics) unchanged, and append:

```markdown
If no projects are configured, or `project undecided` has series waiting to be judged, **read `references/project-scoping.md`** before acting. Verdicts land in the *committed* repo config — shared with teammates, shaping every future query, and invisible once recorded because the series stops appearing in the queue. Never record one the user hasn't agreed to; leaving something undecided is strictly safer than guessing.
```

- [ ] **Step 3: Verify**

```bash
bash "$SB/check-skill-refs.sh" plugins/fellow/skills/fellow; echo "exit=$?"
```

Expected: `exit=0`. `SKILL.md` should now be ~158 lines.

- [ ] **Step 4: Confirm the guardrail survived in the core**

```bash
grep -c "Never record" plugins/fellow/skills/fellow/SKILL.md
grep -c "Never record" plugins/fellow/skills/fellow/references/project-scoping.md
```

Expected: `1` from each — the rule exists in both places by design.

- [ ] **Step 5: Commit**

```bash
git add plugins/fellow/skills/fellow/SKILL.md plugins/fellow/skills/fellow/references/project-scoping.md
git commit -m "♻️ refactor(fellow): move project bootstrapping and classification out of SKILL.md

The 42-line classification protocol only matters when judging undecided
series. Keeps the never-record-without-agreement rule in the core."
```

---

### Task 4: Extract the three task workflows

Three files, one core edit. They are split from each other only by file, not by review gate — the "Other tasks" block that replaces all three is a single edit, so splitting further would divide one change across tasks.

**Files:**
- Create: `plugins/fellow/skills/fellow/references/writing-recaps.md` (original 153–165)
- Create: `plugins/fellow/skills/fellow/references/export.md` (original 167–177)
- Create: `plugins/fellow/skills/fellow/references/action-items.md` (original 179–190)
- Modify: `plugins/fellow/skills/fellow/SKILL.md`

**Guardrails that must stay in the core:** the export-into-git warning (original 177) and the `--all` rule for action items (original 186).

- [ ] **Step 1: Create `writing-recaps.md`**

````markdown
# Writing a meeting recap into a repo or vault

<original lines 155–165, verbatim>
````

Heading replaces original line 153. No path edits — this section links nothing.

- [ ] **Step 2: Create `export.md`**

````markdown
# Bulk export

<original lines 169–177, verbatim>
````

- [ ] **Step 3: Create `action-items.md`**

````markdown
# Action items

<original lines 181–190, verbatim>
````

- [ ] **Step 4: Replace all three with the "Other tasks" block**

Delete original lines 153–190. In their place, under `## Workflows`, add:

```markdown
### Other tasks

- **Filing a recap into a repo or vault** → **read `references/writing-recaps.md`**.
- **Bulk export** (`export`) → **read `references/export.md`**. Transcripts are verbatim records of everything said — warn the user before a wide window lands in a git repo.
- **Action items** → **read `references/action-items.md`**. Always pass `--all`: pages cap at 50, and a truncated list looks exactly like a complete one.
```

- [ ] **Step 5: Verify**

```bash
bash "$SB/check-skill-refs.sh" plugins/fellow/skills/fellow; echo "exit=$?"
```

Expected: `exit=0`. `SKILL.md` should now be ~124 lines.

- [ ] **Step 6: Confirm both guardrails survived in the core**

```bash
grep -c "git repo" plugins/fellow/skills/fellow/SKILL.md      # export warning
grep -c '`--all`' plugins/fellow/skills/fellow/SKILL.md       # pagination rule
```

Expected: at least `1` each. (The `--all` rule also appears in the `## Pagination` section, which stays — a count of 2+ is correct.)

- [ ] **Step 7: Commit**

```bash
git add plugins/fellow/skills/fellow/SKILL.md plugins/fellow/skills/fellow/references/
git commit -m "♻️ refactor(fellow): move recap-filing, export, and action-items out of SKILL.md

Three task-specific workflows, only one ever in play at a time. Keeps the
export-into-git warning and the --all rule in the core."
```

---

### Task 5: Fold the gotchas into the API reference

**Files:**
- Modify: `plugins/fellow/skills/fellow/references/api.md` (append section, update TOC at lines 5–13)
- Modify: `plugins/fellow/skills/fellow/SKILL.md` (removes original lines 204–214)

The original file says of this section: *"You don't need these to use the CLI — they matter only when debugging odd behaviour or calling the API directly."* That is the definition of a reference, and `api.md` is already where the reader is sent for exactly that.

- [ ] **Step 1: Append to `api.md`**

Add as a new final section:

````markdown
## Gotchas the script already handles

You don't need these to use the CLI — they matter only when debugging odd behaviour or
calling the API directly.

<original lines 208–214, verbatim — the seven bullets>
````

Original line 214 ends with "see `references/api.md` before caching anything on it" — inside `api.md` that self-reference is wrong. Change it to:

```markdown
- **`event_guid` is per-occurrence, not per-series** — see [Calendar ids and recurring meetings](#calendar-ids-and-recurring-meetings) before caching anything on it.
```

That heading is at `references/api.md:145`, so it precedes the appended section — do not write "below". Confirm the casing before relying on the slug, since the checker validates anchors:

```bash
grep -n "^## Calendar ids and recurring meetings" plugins/fellow/skills/fellow/references/api.md
```

Expected: `145:## Calendar ids and recurring meetings`.

- [ ] **Step 2: Add it to the `api.md` table of contents**

Append to the Contents list (original `api.md` lines 7–13):

```markdown
- [Gotchas the script already handles](#gotchas-the-script-already-handles)
```

- [ ] **Step 3: Update the core's tail pointer**

Delete original `SKILL.md` lines 204–214. Keep line 216, rewritten to cover both purposes:

```markdown
The full endpoint list, filter fields, response shapes, and the API quirks the CLI already works around are in `references/api.md`.
```

- [ ] **Step 4: Verify**

```bash
bash "$SB/check-skill-refs.sh" plugins/fellow/skills/fellow; echo "exit=$?"
```

Expected: `exit=0`, and the anchor added in Step 2 resolves. `SKILL.md` ~113 lines; `api.md` ~180.

- [ ] **Step 5: Commit**

```bash
git add plugins/fellow/skills/fellow/SKILL.md plugins/fellow/skills/fellow/references/api.md
git commit -m "♻️ refactor(fellow): fold API gotchas into references/api.md

The section itself said it is only needed when debugging or calling the API
directly — which is what api.md is for."
```

---

### Task 6: Compress the AI-notes caution and trim the description

The one place content is deliberately lost rather than moved. The caution is hot-path — it applies whenever a recap is read — so extracting it would mean it rarely loads when it matters.

**Files:**
- Modify: `plugins/fellow/skills/fellow/SKILL.md` (original lines 1–4 and 123–136)

- [ ] **Step 1: Compress the AI-notes caution**

Replace original lines 123–136 with:

````markdown
### Treat AI notes as a summary, not as the record

`ai_notes` is machine-generated from the transcript. It's the fastest way to answer most questions and usually right — but it commits to *one* reading of an ambiguous conversation, and states that reading with more confidence than the conversation supports.

So when the answer depends on precise wording, who said what, or a distinction the participants themselves were fuzzy about, check the transcript before reporting:

```bash
bun "$F" recap <id> --transcript
bun "$F" search "<the phrase in question>" --since 14 --transcripts
```

Quote the speaker rather than the summary when attribution matters. If the transcript and the AI note disagree, the transcript wins — and tell the user they diverge, since that disagreement is often the interesting part. Fellow's transcription mangles names and jargon, so read around an odd-looking term rather than repeating it.
````

Dropped: original lines 127–128, the worked example about participants swapping which shorthand label meant which option. The rule it illustrates survives in the first and second paragraphs.

- [ ] **Step 2: Trim the frontmatter description**

Replace the `description:` value in lines 1–4 with:

```yaml
description: Retrieve and work with Fellow (fellow.app) meeting notes, transcripts, AI summaries, and action items — answer questions about past meetings, write recaps into a repo, bulk-export to markdown. Trigger even when Fellow is never named — any request to recall, search, summarize, or file what happened in a meeting, like "what did we decide about X", "my action items this week", "pull Friday's transcript". Also for setting up Fellow API access.
```

The value is a plain YAML scalar containing double quotes, which parses only because it contains no `: ` sequence and does not begin with a quote. Keep both properties. Verify it still parses:

```bash
head -4 plugins/fellow/skills/fellow/SKILL.md | python3 -c "import sys,yaml; d=yaml.safe_load(sys.stdin.read().strip('-\n')); print(len(d['description'].split()), 'words')"
```

Expected: parses without error, ~68 words.

- [ ] **Step 3: Verify**

```bash
bash "$SB/check-skill-refs.sh" plugins/fellow/skills/fellow; echo "exit=$?"
```

Expected: `exit=0`, `SKILL.md` ~99 lines.

- [ ] **Step 4: Commit**

```bash
git add plugins/fellow/skills/fellow/SKILL.md
git commit -m "✂️ refactor(fellow): compress the AI-notes caution and trim the description

The caution is hot-path, so it is compressed in place rather than extracted.
The description loads every session regardless of topic; trimmed ~130 words
to ~68, keeping the trigger-when-unnamed instruction."
```

---

### Task 7: Reconcile and finish

**Files:**
- Modify: `plugins/fellow/README.md` (only if Step 3 finds a stale claim)

- [ ] **Step 1: Account for every original line**

Extract every non-blank line of the original and confirm it exists somewhere in the new file set, or is one of the deliberate drops:

```bash
cd plugins/fellow/skills/fellow
git show 5e1bc13:plugins/fellow/skills/fellow/SKILL.md > /tmp/orig-skill.md
missing=0
while IFS= read -r l; do
  [ -z "$l" ] && continue
  grep -qFr -- "$l" SKILL.md references/ || { echo "UNACCOUNTED: $l"; missing=$((missing+1)); }
done < /tmp/orig-skill.md
echo "unaccounted: $missing"
```

Expected unaccounted lines, and nothing else:
- the old `description:` line (Task 6 rewrote it)
- original 127–128 (the dropped worked example)
- original 27, 46, 50, 75, 106, 153, 167, 179, 204, 216 (lines whose text was rewritten into pointers or had paths changed)

Any *other* unaccounted line is a bug — restore it before continuing.

- [ ] **Step 2: Confirm the size target**

```bash
bash "$SB/check-skill-refs.sh" plugins/fellow/skills/fellow; echo "exit=$?"
```

Expected: `exit=0` and `SKILL.md` at **110 lines**.

This supersedes the 90–105 gate written when the plan was drafted. That range came from per-task estimates that each drifted by a line or two; the measured reductions were 220 → 198 → 157 → 124 → 112 → 110. Every step was verified against the original at `5e1bc13` and reviewed clean, so 110 is the correct result, not a sign of an incomplete extraction. A count materially below 110 means content was dropped; materially above means an extraction did not land.

- [ ] **Step 3: Check the README for claims the refactor invalidated**

```bash
grep -n "SKILL.md\|references/" plugins/fellow/README.md
```

The README currently links `skills/fellow/references/api.md` at lines 46 and 87 — both still valid. If it describes `SKILL.md` as self-contained or enumerates the reference files, update it to list the five new ones. If it makes no such claim, change nothing.

- [ ] **Step 4: Read the result end to end**

Open `SKILL.md` and read it as a first-time reader with no memory of the original. Confirm:
- the `config check` gate still routes correctly to onboarding
- the search → `recap` hot path reads as continuous prose, not as pointer stubs
- all five pointers use the bold-imperative form
- no section promises detail that is no longer present without saying where it went

Fix anything that reads as a stub rather than a document.

- [ ] **Step 5: Commit any remaining changes**

```bash
git add -A plugins/fellow
git commit -m "📝 docs(fellow): reconcile README with the split skill" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage** — every section of `docs/superpowers/specs/2026-07-30-fellow-progressive-disclosure-design.md` maps to a task:

| Spec section | Task |
| --- | --- |
| Core keeps what is always true | 2–6 (by subtraction), verified in 7 Step 2 |
| `references/onboarding.md` | 2 |
| `references/project-scoping.md` | 3 |
| `references/writing-recaps.md` / `export.md` / `action-items.md` | 4 |
| `references/api.md` absorbs gotchas | 5 |
| Guardrails do not leave the core | 3 Step 4, 4 Step 6 |
| Compression, not only relocation | 6 Step 1 |
| Description trim | 6 Step 2 |
| Relative paths | 2 Step 1, 3 Step 1; enforced by the checker every task |
| Verification 1 (commands resolve) | checker section 2 |
| Verification 2 (links resolve) | checker section 1 |
| Verification 3 (line accounting) | 7 Step 1 |
| Verification 4 (core line count) | 7 Step 2 |

**Placeholder scan:** the `<original lines N–M, verbatim>` markers in Tasks 2–5 are not placeholders — the source is committed at `HEAD` and each is given an exact line range plus the exact edits to apply. Every line of *new* prose is written out in full.

**Consistency:** pointer paths are written `references/<file>.md` in every task and match the created filenames. The `$SB` scratchpad variable is defined in Task 1 Step 2 and reused throughout. Running line-count expectations (199 → 158 → 124 → 113 → 99) decrease monotonically and land inside the 90–105 gate in Task 7.
