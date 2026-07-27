# Skill Config Standard (SCS v1)

How a skill stores per-user and per-project settings, and how it gets hold of secrets without ever committing one.

Status: **active**. Applies to any skill in this marketplace that needs configuration. Reference implementation: [`plugins/fellow`](../plugins/fellow).

## Why this exists

A skill that talks to an external service needs to know three kinds of things: *where the credential lives*, *which account/project to act on*, and *where output should go*. These have different lifetimes and different audiences. The credential is personal and secret. The project identity is usually shared by everyone working in the repo. Output paths are often a personal preference that shouldn't be forced on teammates.

Cramming all three into one file means either committing secrets or committing nothing. The layering below separates them so the shareable parts can be checked in and the personal parts stay out of git.

## Locations and precedence

Three layers. Later layers override earlier ones.

| Layer | Path | Committed? | Holds |
| --- | --- | --- | --- |
| **global** | `~/.agents/skill-config/<skill>/config.json` | n/a (outside repo) | your defaults across every project |
| **repo** | `<repo>/.agents/skill-config/<skill>/config.json` | **yes** | settings the whole team shares |
| **local** | `<repo>/.agents/skill-config/<skill>/config.local.json` | **no — gitignored** | per-checkout overrides, personal paths |

`<repo>` is the git top level (`git rev-parse --show-toplevel`). Outside a git repo, only the global layer applies — a skill must still work in that case, since plenty of useful work happens in a scratch directory.

`<skill>` is the skill's directory name, so configs from different skills never collide.

### Merge semantics

Deep merge, in order global → repo → local:

- Objects merge key by key.
- Scalars and **arrays replace wholesale**. Arrays are configuration values, not accumulators; a user overriding `["a","b"]` with `["c"]` means `["c"]`, and any other rule makes it impossible to remove an inherited entry.
- An explicit `null` **deletes** an inherited key. This is the only way to unset something a lower layer set.

### Why `.agents/` and not `.claude/`

`.agents/` is tool-neutral. The same config should serve whatever agent runtime the user runs next year without a migration. It also keeps skill config visibly separate from `.claude/`, which holds Claude Code's own machinery — mixing user data into a tool's config directory makes both harder to reason about.

## File format

Plain JSON, UTF-8. No comments — every parser handles plain JSON, and a config a skill can't read is worse than one that's slightly less pleasant to hand-edit.

Two reserved top-level keys; everything else is the skill's own namespace.

```json
{
  "version": 1,
  "credentials": {
    "apiKey": { "source": "1password", "ref": "op://Vault/Item/field" }
  }
}
```

- `version` — integer, currently `1`. Lets a skill detect and migrate an older shape instead of crashing on it.
- `credentials` — map of logical name → credential reference (below).

## Credential references

**A config file never contains a secret.** It contains a *reference* describing where to fetch one. The repo layer is committed, so a skill that inlines tokens will eventually leak one; making references the only supported form removes the foot-gun rather than warning about it.

Every reference is an object with a `source` discriminator.

### `1password`
```json
{ "source": "1password", "ref": "op://Vault/Item/field", "account": "OPTIONAL_ACCOUNT_ID" }
```
Resolves via `op read <ref>`, adding `--account` when present. Requires the `op` CLI, signed in. `account` matters when the user has both a personal and a work account — without it `op` may resolve against the wrong one.

### `env`
```json
{ "source": "env", "var": "MY_API_KEY" }
```
Reads the environment variable. The right choice in CI.

### `dotenv`
```json
{ "source": "dotenv", "path": ".env.local", "var": "MY_API_KEY" }
```
Reads `var` from a `KEY=value` file. Relative paths resolve from the repo root. The file must be gitignored — a skill should check and refuse if it isn't, since the whole point is defeated otherwise.

### `keychain`
```json
{ "source": "keychain", "service": "my-service", "account": "me@example.com" }
```
macOS Keychain via `security find-generic-password -s <service> -a <account> -w`.

### `command`
```json
{ "source": "command", "command": "vault kv get -field=token secret/my-app" }
```
Runs a shell command; stdout minus trailing newline is the secret. The escape hatch for password managers not covered above (Bitwarden, pass, LastPass, Doppler, AWS Secrets Manager). Powerful, so a skill should surface the command to the user during onboarding rather than accepting it silently from a config it just read.

### Resolution rules

- Resolve **lazily** — only when a call actually needs the secret. A skill listing its own config shouldn't shell out to a password manager and trigger a Touch ID prompt.
- **Never print, log, or echo a resolved secret**, and never pass it as a command-line argument (argv is world-readable via `ps`). Pass it through the environment or stdin.
- On failure, report *which* reference failed and how to fix it — `op read op://Vault/Item/field failed: not signed in — run 'op signin'` — never dump the raw error and leave the user guessing.

## The onboarding contract

Config will be missing the first time, and that moment decides whether the skill feels finished or broken. A conforming skill must:

1. **Detect** missing or incomplete config before doing any work, and treat it as an expected state rather than an error.
2. **Ask**, don't assume. Walk the user through the questions that actually matter — where their credential lives, which account/workspace to use, what output to keep and where.
3. **Offer the layer with a reason.** Most users don't know whether a setting belongs in global or repo. Recommend one and say why: identity and credentials usually global, project identity repo, personal paths local.
4. **Write the file** and tell the user the exact path.
5. **Add the local file to `.gitignore`** when writing the local layer — append `.agents/skill-config/*/config.local.json` to the repo's `.gitignore` if it isn't already matched. Doing this at write time is the only reliable moment; asking the user to remember is how secrets get committed.
6. **Verify before declaring success** — resolve the credential and make one real call. "Configured" should mean "working", not "file written".

Onboarding should be re-runnable so users can change their minds without hand-editing JSON.

## Skill-specific keys

Beyond `version` and `credentials`, a skill owns its namespace. Two conventions worth following because they recur:

**Storage paths** — when a skill writes artifacts, let the user say where and whether at all:

```json
"storage": {
  "recaps": { "enabled": true, "path": "docs/meetings" },
  "transcripts": { "enabled": true, "path": ".agents/fellow/transcripts" },
  "media": { "enabled": false, "path": "~/Media/fellow" }
}
```

Relative paths resolve from the repo root; `~` expands to home. Supporting both matters — a repo-relative path means artifacts get committed alongside the work, and an absolute one means they stay off the project entirely. Users want different things for transcripts (bulky, often private) than for recaps (the actual deliverable).

**Defaults** — a `defaults` object for tunables like page size or lookback window, so the user can change behaviour without passing flags every time.

## Documenting it

Ship a `config.example.json` in the skill directory showing every supported key with realistic values. It doubles as documentation and as something the user can copy and edit. Never ship a populated `config.json` — a real config appearing on install is indistinguishable from one the user wrote, and they'll act on settings they never chose.

## Checklist

- [ ] Reads global → repo → local with deep merge, `null` deletes, arrays replace
- [ ] Works with only the global layer (outside a git repo)
- [ ] No secret is ever written to a config file
- [ ] Secrets resolve lazily and never reach argv, logs, or stdout
- [ ] Missing config triggers onboarding, not a stack trace
- [ ] Onboarding gitignores the local layer and verifies with a real call
- [ ] `config.example.json` documents every key
