---
name: fellow
description: Retrieve and work with Fellow (fellow.app) meeting notes, transcripts, AI summaries, and action items via its REST API — answer questions about past meetings, write meeting recaps into a repo or vault, and bulk-export notes and transcripts to markdown. Use this whenever the user asks about their meetings, calls, standups, 1-on-1s, or client sessions — "what did we decide about X", "what were my action items this week", "pull the transcript from Friday's call", "summarize yesterday's client meeting", "who said we should move the deadline", "write up a recap of the kickoff", "export last month's meeting notes". Trigger even when Fellow is never named: any request to recall, search, summarize, or file what happened in a past meeting belongs here. Also trigger for setting up or fixing Fellow API access and credentials.
---

# Fellow API

Read-only access to Fellow meeting data through a bundled `bun` CLI. No MCP server, no npm install — the script has zero dependencies and uses `fetch` directly.

Throughout this document, `$F` means the bundled CLI:

```bash
F="<this-skill-dir>/scripts/fellow.ts"     # installed as a plugin:
                                           # $CLAUDE_PLUGIN_ROOT/skills/fellow/scripts/fellow.ts
bun "$F" help
```

## Start here every time

Run this before anything else. It tells you in one call whether you can proceed or need to onboard:

```bash
bun "$F" config check
```

- **Succeeds** → you're authenticated; go to [Workflows](#workflows).
- **Reports missing config** → **read `references/onboarding.md`** and follow it. Missing config is the expected first-run state, not a failure — don't report it to the user as an error.
- **Credential fails to resolve** → the config is fine but the secret isn't reachable (`op` not signed in, env var unset). Tell the user exactly which reference failed and what to run; don't rewrite their config.

## Project scoping

Most workspaces mix several unrelated streams — a client engagement, an internal product, a daily standup for something else entirely. When the user asks about "the project", returning all of it is noise.

If `projects` is configured, **filtering is already applied** to `notes list`, `recordings list`, `search`, and `export`. Every command prints what it held back:

```
9 note(s).
[project "acme": 12 out of scope]
```

`--project <name>` picks a different scope; `--all-meetings` disables filtering when the user genuinely wants everything ("search all my meetings, not just this project").

### If no projects are configured

Don't invent rules from nothing, and don't silently return everything when the user clearly meant one project. Look at the actual data first, then propose:

```bash
bun "$F" notes list --since 60 --all --all-meetings
```

Recurring titles cluster a workspace fast — the handful of titles that repeat weekly usually *are* the projects. Suggest a starting config from what's actually there: a couple of literal title keywords per stream, plus an attendee domain when an external organisation is involved. Concrete beats clever; a plain client or product name matches more reliably than a carefully engineered regex, and the user can see at a glance whether it's right.

Write it into the config's `projects` block (see `config.example.json`) and set `defaultProject`.

### Classifying what the rules can't decide

The matcher runs cheapest-first: a remembered verdict for the calendar series (free), then title rules (free), then attendee rules (free). Anything left over is *undecided* — and that's where you come in:

```bash
bun "$F" project undecided --since 30
```

This lists **series, not occurrences** — a daily standup appears once, not thirty times.

For each one, work in three steps. The third is not optional:

**1. Read it.** Fetch the summary of one occurrence — `recap <id>` is usually plenty. Judge from what was actually discussed, not the title: if the title were decisive, a Tier-1 rule would have caught it already.

**2. Check whether it's a stream or a one-off.** How many occurrences the series has, and whether sibling meetings look related, changes the right answer. A recurring series that keeps landing in the queue wants a *title rule* so it self-sorts; a genuine one-off just wants a verdict.

**3. Ask the user, with a recommendation.** Present what you found and what you'd do, then let them decide. Give them the shape:

> *&lt;title&gt;* (&lt;date&gt;, &lt;N&gt; occurrences in the window) — &lt;one line on what was actually discussed&gt;. &lt;How it relates, or fails to relate, to the configured projects&gt;.
> Recommend: **&lt;verdict&gt;**. Alternatives: &lt;the other reasonable options&gt;.

Offer the full range, not a yes/no. A meeting fitting no configured project may deserve **its own new project** rather than `none` — often the right answer when the user recognises a stream of work you simply haven't been told about. Batch the questions when several series are pending.

Only once they answer, record it — from the repo the user is working in, since the verdict lands in *that* repo's config:

```bash
bun "$F" project classify <series-key> <project|none> --why "<the reasoning, in a sentence>"
```

**Never record a verdict the user hasn't agreed to.** It writes to the committed repo config: durable, shared with teammates, and shaping every future query. A wrong one is invisible precisely because it stops appearing in the undecided queue — so leaving something undecided is strictly safer than guessing. Ask even when the answer looks obvious; the user knows things about their own projects that no meeting summary contains.

## Workflows

### Answering a question about a meeting

The API has **no full-text search** — its only server-side filters are date ranges, exact title, channel, and event GUID. `search` therefore pulls a window of content and matches locally, which is why it takes several seconds rather than milliseconds.

```bash
bun "$F" search "pricing model" --since 30                # note bodies only — fast
bun "$F" search "launch date" --since 14 --transcripts    # also spoken content — slower, far higher recall
```

Reach for `--transcripts` whenever the question is about something *said* ("who suggested…", "did anyone mention…"). Most Fellow notes are an empty agenda template, so a notes-only search misses nearly everything that was actually discussed. If a notes-only search returns nothing, retry with `--transcripts` before telling the user there's no match.

Narrow the window when you can — `--since 7` over a busy workspace is many times cheaper than `--since 365`, and most questions are about something recent.

### Treat AI notes as a summary, not as the record

`ai_notes` — the summary, decisions, and topics — is machine-generated from the transcript. It's the fastest way to answer most questions, and it's usually right. But it commits to *one* reading of an ambiguous conversation, and it states that reading with more confidence than the conversation supports.

Consider a discussion where participants weigh two options and refer to them by shorthand labels, swapping which label means which partway through. The summariser has to pick one assignment, and it states it flatly. Answering from the summary alone reproduces that choice as fact, when reading the transcript would show the labels were never stable and the options are better described by their content.

So when the answer depends on precise wording, who said what, or a distinction the participants themselves were fuzzy about, check the transcript before reporting:

```bash
bun "$F" recap <id> --transcript
bun "$F" search "<the phrase in question>" --since 14 --transcripts
```

Quote the speaker rather than the summary when attribution matters. If the transcript and the AI note disagree, the transcript wins and it's worth telling the user they diverge — that disagreement is often the interesting part. Fellow's transcription is also imperfect with names and jargon (people's names get mangled, domain acronyms get mis-expanded), so read around an odd-looking term rather than repeating it.

To find a meeting by name rather than content, list and filter:

```bash
bun "$F" notes list --since 30
bun "$F" recordings list --since 30 --title "Weekly Sync"   # --title is exact-match, server-side
```

Then read the one you want:

```bash
bun "$F" recap <note-id-or-recording-id>              # summary, decisions, action items
bun "$F" recap <id> --transcript                      # everything, including the full transcript
bun "$F" recordings get <id> --transcript-only        # just the words
```

### Writing a meeting recap into a repo or vault

`recap` produces finished markdown — title, date, attendees, AI summary, decisions, action items — so you rarely need to assemble one by hand from raw JSON.

Important: a Fellow *note* is usually just the blank agenda template. The substance lives on the linked *recording* as `ai_notes`. `recap` joins them for you; a note fetched on its own will look empty and misleading.

When filing the recap into a project, follow that project's conventions rather than dumping the raw output — check for a `CLAUDE.md`/`AGENTS.md` describing filenames, front-matter, index files, or cross-linking, and match it. Use `--json` if you need the structured fields to build a custom layout:

```bash
bun "$F" recap <id> --json    # { note, recording, markdown }
```

If the config defines `storage.recaps.path`, that's where the user expects recaps to land. `bun "$F" config show` lists each storage target with its resolved path, or `(not configured)` — check there before inventing a destination.

### Bulk export

```bash
bun "$F" export --since 30                        # recaps → storage.recaps.path (or .agents/fellow/export)
bun "$F" export --since 30 --transcripts          # transcripts → storage.transcripts.path
bun "$F" export --since 7 --out ./meetings        # explicit destination wins
```

Export writes one markdown file per meeting, named `YYYY-MM-DD_slug.md`. It fetches AI notes for the whole window in a single paginated pass rather than one request per meeting, so a month-wide export is a handful of calls.

Warn the user before exporting a wide window into a git repo — transcripts are verbatim records of everything said, and committing them is a decision they should make deliberately rather than discover later.

### Action items

```bash
bun "$F" action-items --open --all                # every outstanding item — note the --all
bun "$F" action-items --open --all --scope all    # the whole workspace, not just this user
```

**Use `--all` here.** Pages cap at 50, and a workspace easily has more open items than that. Without it you get the first 50 and no error — an answer that looks complete and isn't. The CLI now says so when a result fills a page, but it's easier to just always pass `--all` for a question like "what's outstanding", where a partial answer is worthless.

`--scope` defaults to `assigned_to_me`, which is what people mean by "my action items". `assigned_to_others` and `all` widen it. A non-privileged API key only ever sees the authenticated user's own data, so `--scope all` returning just their items may be the key's permissions rather than the filter — mention that possibility rather than reporting it as the team having no work.

Project scoping does **not** apply to action items: the API scopes them by assignee, and an item's link back to a meeting is optional. Each row prints its source note id so you can look up the meeting when it matters.

## Output modes

Every command takes `--json` for structured output. Default output is formatted for reading.

Prefer the human-readable form when you're going to summarize for the user — it's already condensed, and pulling full JSON transcripts into context wastes a great deal of it for no benefit. Use `--json` when you need specific fields to build something.

## Pagination

**Every list command returns at most 50 rows unless you pass `--all`.** This is the single easiest way to give a confidently wrong answer with this skill — a truncated list looks exactly like a complete one. The CLI flags it when a result fills a page, but for any question phrased as *all*, *every*, *how many*, or *outstanding*, pass `--all` up front.

`--all` costs one extra request per additional page, which is cheap next to being wrong.

## Gotchas the script already handles

You don't need these to use the CLI — they matter only when debugging odd behaviour or calling the API directly:

- **List endpoints are POST, not GET.** A GET returns `405 Method not allowed`.
- **`page_size` must be nested under `pagination`.** At the top level the API returns `200 OK` with an *empty list* instead of an error — indistinguishable from an empty workspace.
- **Fetch-by-id paths are singular**: `/note/{id}`, `/recording/{id}`, `/action_item/{id}` (underscore), while list paths are plural.
- **Fetch-by-id returns the expensive fields by default** (transcript, AI notes); *list* endpoints return them as `null` unless you pass `include`.
- **Docs live on `fellow.ai`, the API on `fellow.app`.** `api.fellow.ai` doesn't resolve.
- **Status values are `Done | Archived | Incomplete`** — compare exactly; `"Incomplete".includes("complete")` is true and silently inverts the check.
- **`event_guid` is per-occurrence, not per-series** — see `references/api.md` before caching anything on it.

Deeper detail, including the full endpoint list and filter fields, is in `references/api.md`.

## Scope

This skill is **read-only** by design. It never deletes, modifies, or uploads anything, so it can't damage the workspace. Fellow's API does support writes (completing action items, webhooks, uploading recordings, and super-admin deletes) — if the user wants those, say plainly that this skill doesn't cover them rather than reaching for `curl` to work around it.
