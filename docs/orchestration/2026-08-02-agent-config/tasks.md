# Agent Config Standard (ACS v1) — work packages

Parent task: extend `standards/skill-config.md` to cover agents as well as skills, rename it,
and extract the duplicated config/credential code into a reusable `agent-config` skill that
other skills consume instead of copying.

Decisions locked by the human on 2026-08-02 (do not relitigate):

- **Name**: `standards/agent-config.md` — "Agent Config Standard (ACS v1)".
- **Paths**: move to `.agents/config/<name>/config.json`; the old `.agents/skill-config/<name>/`
  is still read as a lower-precedence fallback so live configs keep working.
- **`<name>`** is a skill *or* agent *or* plugin name — one namespace, deliberately shared so a
  plugin's skill and its subagent read the same config.
- **Sharing**: new `plugins/agent-config` holds the canonical skill + library. `fellow` and
  `orchestrate` vendor the library verbatim under `scripts/lib/vendor/agent-config/`, with a
  provenance header. No cross-plugin runtime dependency.

Questions raised during the work collect in [`questions/`](questions/README.md).

## Packages

| # | Package | Output file (the only file the worker touches) | Status | Wave |
|---|---|---|---|---|
| P1 | The extended, renamed standard | `standards/agent-config.md` | **done** | 1 |
| P2 | Canonical config loader | `plugins/agent-config/skills/agent-config/lib/config.ts` | **done** | 1 |
| P3 | Canonical credential resolver | `plugins/agent-config/skills/agent-config/lib/credentials.ts` | **done** | 1 |
| P4 | The reusable skill | `plugins/agent-config/skills/agent-config/SKILL.md` | **done** | 3 |
| P5 | Migrate fellow onto the vendored lib | `plugins/fellow/skills/fellow/scripts/lib/config.ts` | **done** | 2 |
| P6 | Migrate orchestrate onto the vendored lib | `plugins/orchestrate/skills/orchestrate/scripts/lib/config.ts` | **done** | 2 |
| P7 | Plugin README | `plugins/agent-config/README.md` | **done** | 3 |
| P8 | Fellow onboarding defers to the shared skill | `plugins/fellow/skills/fellow/references/onboarding.md` | **done** | 3 |
| P9 | Orchestrate config section defers to the shared skill | `plugins/orchestrate/skills/orchestrate/SKILL.md` | **done** | 3 |

**All nine packages closed 2026-08-02.** Final verification sweep, all green: vendored copies match
canonical; canonical library suite 35/35; fellow CLI completes a live API call; orchestrate CLI runs;
every JSON manifest and example config parses; every relative markdown link outside the archived
`docs/superpowers/` plans resolves on disk.

### Completion log

- **2026-08-02, P3 — done.** `lib/credentials.ts` (98 lines). Exports `resolveCredential(ref, name?)`
  and `describeCredential(ref)`; all five sources intact. First pass left the `run()` helper (behind
  `1password` and `keychain`) throwing without naming the failing credential — the agent spotted it
  and flagged rather than silently widening scope. Follow-up applied: `run()` now takes `name` and
  both of its throws name the reference. Note the first idle signal arrived *before* the fix was on
  disk — verified by re-reading, not by the signal.
- **2026-08-02, P2 — done.** `lib/config.ts` (205 lines). Verified by execution, not inspection: a
  throwaway git repo with `HOME` redirected, exercising layer precedence, legacy-path precedence,
  merge semantics, the secret guard, `writeLayer`, and `ensureGitignored`. **35 assertions, 0
  failures.** Harness lives in the session scratchpad (`verify-lib.ts`); it is not committed.
  Design notes: `loadConfig` returns a `legacy: {layer,path}[]` array so a caller can print a
  migration notice, and the library itself prints nothing (stdout belongs to the CLI). `ensureGitignored`
  adds the legacy ignore pattern too when that directory exists, so renaming a directory cannot turn
  an existing local file into a committable one.
- **2026-08-02, vendoring (orchestrator).** `scripts/vendor.sh {sync|check}` written. Vendored copies
  are a fixed header, a sentinel line, then canonical bytes verbatim; `check` diffs everything below
  the sentinel. Sync ran clean for all four copies, and a deliberately drifted copy was confirmed to
  make `check` print the diff and exit 1. This is the deliverable that question 2's default promised.
- **2026-08-02, shims (orchestrator).** Both plugins' `lib/credentials.ts` reduced to a one-line
  re-export of the vendored resolver, so callers never import the vendor path directly.
- **2026-08-02, P1 — done.** `standards/agent-config.md` (194 lines, from 142). Scope widened to
  skills, subagents, commands, and hooks; the substantive addition is "What is different for a
  subagent" — never onboard interactively, and treat credential failure as returned data rather
  than blocking on a Touch ID or `op signin` prompt that nobody will answer. Two follow-ups applied:
  the usage sketch had invented a `loadFellowConfig()` that contradicts what the reference
  implementations export, and the vendoring paragraph claimed the header records a commit hash
  (it does not, deliberately — a hash churns the copy on every sync and misses the case that
  actually happens, someone editing the copy).
- **2026-08-02, P6 — done.** orchestrate `lib/config.ts` 246 → 110 lines. CLI verified by running
  `help`, `check`, `path global`, `show`. **Verification caught a regression:** the vendored loader
  returns legacy-path entries in `found`, and `cmdCheck` printed "found" beside the *current* path —
  so a legacy-only setup would be told its config sat at a path that does not exist. Fixed in
  `orchestrate-config.ts` (unowned → orchestrator) to print the path actually read, plus the
  migration notice the standard requires. Proven with a real legacy config under a sandboxed `HOME`.
- **2026-08-02, P5 — done.** fellow `lib/config.ts` 166 → 87 lines. Verified end-to-end against the
  live Fellow API: `config check` resolved the 1Password credential and completed a real `/me` call,
  reading config from the legacy path — so backward compatibility is demonstrated, not assumed. The
  credential was never printed. `recordSeriesVerdict` now writes through `writeLayer`, so the
  inline-secret guard runs on every write.
- **2026-08-02, fellow.ts (orchestrator).** Added the legacy-path label and migration notice to
  `config show`. fellow.ts already printed the true path, so it was never misleading the way
  orchestrate's was — only silent.
- **2026-08-02, P4/P7/P8 — done.** The shared `SKILL.md` (85 lines), the plugin README (60), and
  fellow's `onboarding.md` (21 → 20, and far denser). Every relative link and every command each
  document claims to exist was checked on disk.
- **2026-08-02, a third copy of the gitignore logic (orchestrator).** Verifying P4's claim that
  `fellow.ts config gitignore` exists revealed that fellow.ts *hand-rolled* the append instead of
  calling the shared `ensureGitignored()` — the exact duplication this whole change targets, missed
  because P5 owned only `lib/config.ts` and was told not to touch `fellow.ts`. The hand-rolled copy
  was also weaker: it line-matched the pattern instead of using `git check-ignore`, so a pattern
  already covered by a broader rule would be appended again, and it ignored the legacy pattern.
  Replaced with `ensureGitignored()`; export added to fellow's `lib/config.ts`; three now-dead `fs`
  imports removed. Verified idempotent, both patterns ignored, and `whoami` still returns live data.
  **Note:** finding it cost an unintended write — `config gitignore` is not read-only, and running it
  to verify modified the repo's `.gitignore`. Reverted, then regenerated through the shared code
  path so the committed result is the one the library actually produces.
- **2026-08-02, P9 — done.** orchestrate `SKILL.md` 243 → 234 lines, all changes confined to the
  Configuration section (verified via hunk headers — invariants, phases, and anti-patterns are
  byte-for-byte unchanged). The generic layer/credential walkthrough now defers to the `agent-config`
  skill; what stays is orchestrate's own: tracker kinds, which need a credential, the `gh auth status`
  fallback, its four onboarding questions, and the CLI. All seven documented subcommands confirmed to
  exist in the code.
- **2026-08-02, old standard deleted.** `standards/skill-config.md` removed. Remaining mentions are
  only this tracker, the migration section of the new standard naming its predecessor, and the
  archived `docs/superpowers/` plans left intact on purpose.

## Resume trail

Nothing is in flight. Both open questions are answered by their defaults and can be left indefinitely;
answering either is a small, targeted edit, not a rework:

- **Legacy path sunset** — currently read forever with a notice. To adopt a date instead, add a
  constant and a line to the notice in the canonical `loadConfig`, then re-run `vendor.sh sync`.
- **Vendor drift enforcement** — `vendor.sh check` exists and works; nothing runs it automatically.
  To enforce, add one GitHub Actions workflow calling it. The repo has no CI today, so that is the
  whole cost.

The canonical library is `plugins/agent-config/skills/agent-config/lib/`. **Edit it there and run
`vendor.sh sync`** — edits made in a vendored copy are silently overwritten. The verification harness
used throughout lives in the session scratchpad and was deliberately not committed; it hardcodes a
sandbox layout and redirects `HOME`, so it would need generalizing before it belonged in the repo.

## Known gaps found during verification

- ~~**The `dotenv` gitignore check is specified but not implemented.**~~ **CLOSED 2026-08-02.**
  Implemented in the canonical `credentials.ts` and re-vendored. `resolveCredential` now refuses a
  `dotenv` reference whose file is not gitignored, naming the file, the credential, and two ways out.
  The check runs *before* the file is read, so a refused secret is never loaded into memory. Outside
  a git repo it is skipped — nothing to leak into, and that path must not break working setups.
  Verified against the real function in three cases: gitignored → resolves; committed/tracked →
  throws; no repo at all → resolves. After re-vendoring, the canonical suite still passes 35/35 and
  both plugin CLIs still work, fellow's including a live API call.
  Original finding, kept for the record: both the old standard and
  the new one say of a `dotenv` credential file: "the loader should check and refuse if it isn't
  [gitignored], since the whole point is defeated otherwise." Neither the old duplicated copies
  nor the new canonical `resolveCredential` actually checks. A user pointing `dotenv` at a
  committed `.env` gets their secret into git, having been told the loader would stop that.
  Pre-existing, not introduced here — but this change ships the *canonical* implementation of
  that standard, so the gap is now a self-inconsistency in one deliverable rather than a
  scattered omission. Fix is small (`git check-ignore` on the resolved path, throw naming the
  file and the fix) and orchestrator-owned. Scheduled AFTER P5/P6 land, because changing the
  canonical library mid-migration would strand the vendored copies they are building against.
  Adds no new exports, so it cannot break either migration.

## Orchestrator-owned (shared state — no worker touches these)

- `plugins/agent-config/.claude-plugin/plugin.json`, `plugins/agent-config/LICENSE`
- `.claude-plugin/marketplace.json` — register the new plugin
- `README.md` — plugin table row + standards row
- `plugins/fellow/skills/fellow/config.example.json`, `plugins/orchestrate/skills/orchestrate/config.example.json`
- `plugins/fellow/README.md`, `plugins/orchestrate/README.md` — standard links
- Vendored copies: `plugins/{fellow,orchestrate}/skills/*/scripts/lib/vendor/agent-config/*.ts`
- Re-export shims: `plugins/{fellow,orchestrate}/skills/*/scripts/lib/credentials.ts`
- Deletion of `standards/skill-config.md`
- `plugins/orchestrate/skills/orchestrate/scripts/orchestrate-config.ts` — carries "SCS v1" in its
  header comment and in a user-visible output string (line 175). **Gap in the original decomposition:**
  P6 was told not to touch this file, and no package owned it. Orchestrator picks it up after P6 lands.
- `plugins/fellow/README.md` and `plugins/orchestrate/README.md` — standard links and the
  "SCS v1 config CLI" label in orchestrate's file tree
- Final `bun` typecheck of both CLIs

Deliberately **not** updated: `docs/superpowers/plans/` and `docs/superpowers/specs/`. Those are dated
records of earlier work and will hold dead links to `standards/skill-config.md` after deletion. Rewriting
them to cite a standard that did not exist when they were written would falsify the record; a dead link
in an archived plan is the smaller cost.

## The library contract (frozen — every package builds against this)

```ts
// lib/config.ts — canonical, name-parameterized
export const CONFIG_DIR = ".agents/config";
export const LEGACY_CONFIG_DIR = ".agents/skill-config";
export const LOCAL_GITIGNORE_PATTERN = ".agents/config/*/config.local.json";

export type Layer = "global" | "repo" | "local";
export interface CredentialRef { source: "1password"|"env"|"dotenv"|"keychain"|"command";
  ref?: string; account?: string; var?: string; path?: string; service?: string; command?: string }
export interface BaseConfig { version?: number; credentials?: Record<string, CredentialRef> }

export function repoRoot(): string | null;
export function layerPath(name: string, layer: Layer, root?: string | null): string | null;
export function legacyLayerPath(name: string, layer: Layer, root?: string | null): string | null;
export function expandPath(p: string): string;
export function loadConfig<T extends BaseConfig = BaseConfig>(name: string): LoadedConfig<T>;
export function assertNoInlineSecrets(obj: unknown, trail?: string[]): void;
export function writeLayer<T>(name: string, layer: Layer, config: T): { path: string; gitignore?: GitignoreResult };
export function ensureGitignored(): GitignoreResult;
export function validateCredentialRef(name: string, cred: CredentialRef | undefined): string[];

// lib/credentials.ts
export function resolveCredential(ref: CredentialRef, name?: string): string;
export function describeCredential(ref: CredentialRef): string;
```

Layer precedence: `global → repo → local`; **within** each layer the legacy path is read first
so the current path wins. Deep merge: objects merge, arrays and scalars replace, explicit
`null` deletes.
