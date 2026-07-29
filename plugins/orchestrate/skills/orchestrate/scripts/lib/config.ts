// Skill Config Standard (SCS v1) loader — see standards/skill-config.md
// Layers: ~/.agents (global) -> <repo>/.agents (repo) -> config.local.json (local)

import { homedir } from "os";
import { join, isAbsolute, resolve, dirname } from "path";
import { spawnSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from "fs";

export const SKILL_NAME = "orchestrate";
export const LOCAL_GITIGNORE_PATTERN = ".agents/skill-config/*/config.local.json";

export type Layer = "global" | "repo" | "local";

export interface CredentialRef {
  source: "1password" | "env" | "dotenv" | "keychain" | "command";
  ref?: string;
  account?: string;
  var?: string;
  path?: string;
  service?: string;
  command?: string;
}

/** Trackers the orchestrator can drive. Only the remote ones need a credential. */
export type TrackerKind = "file" | "tasknotes" | "github" | "jira" | "linear";

export interface TrackerConfig {
  kind?: TrackerKind;
  /** file / tasknotes: repo-relative path to the tracker file or task folder. */
  path?: string;
  /** github: "owner/repo". */
  repo?: string;
  /** jira: site host, e.g. "acme.atlassian.net", plus the project key and account email. */
  site?: string;
  project?: string;
  email?: string;
  /** linear: team key, e.g. "ENG". */
  team?: string;
  /** Labels applied to every package entry the orchestrator creates. */
  labels?: string[];
}

export interface OrchestrateConfig {
  version?: number;
  credentials?: {
    githubToken?: CredentialRef;
    jiraToken?: CredentialRef;
    linearToken?: CredentialRef;
  };
  tracker?: TrackerConfig;
  questions?: { path?: string; human?: string };
  models?: { judgment?: string; mechanical?: string };
  defaults?: { maxParallelAgents?: number; maxPackages?: number; verifyOnDisk?: boolean };
}

/** Which credential each tracker kind needs. `null` = no credential required. */
export const CREDENTIAL_FOR: Record<TrackerKind, keyof NonNullable<OrchestrateConfig["credentials"]> | null> = {
  file: null,
  tasknotes: null,
  github: "githubToken",
  jira: "jiraToken",
  linear: "linearToken",
};

export function repoRoot(): string | null {
  const r = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });
  if (r.status !== 0) return null;
  return r.stdout.trim() || null;
}

export function layerPath(layer: Layer, root = repoRoot()): string | null {
  const dir = `.agents/skill-config/${SKILL_NAME}`;
  if (layer === "global") return join(homedir(), dir, "config.json");
  if (!root) return null; // repo/local layers need a git repo
  return join(root, dir, layer === "repo" ? "config.json" : "config.local.json");
}

/** Deep merge per SCS: objects merge, arrays/scalars replace, explicit null deletes. */
function merge(base: any, over: any): any {
  if (over === null) return undefined;
  if (Array.isArray(over) || typeof over !== "object" || over === undefined) return over;
  if (typeof base !== "object" || base === null || Array.isArray(base)) base = {};
  const out: any = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const merged = merge(base[k], v);
    if (merged === undefined) delete out[k];
    else out[k] = merged;
  }
  return out;
}

export interface LoadedConfig {
  config: OrchestrateConfig;
  /** Which layers were actually found on disk, in precedence order. */
  found: { layer: Layer; path: string }[];
  missing: { layer: Layer; path: string }[];
}

export function loadConfig(): LoadedConfig {
  const root = repoRoot();
  const found: { layer: Layer; path: string }[] = [];
  const missing: { layer: Layer; path: string }[] = [];
  let config: OrchestrateConfig = {};

  for (const layer of ["global", "repo", "local"] as Layer[]) {
    const p = layerPath(layer, root);
    if (!p) continue;
    let raw: string;
    try {
      raw = readFileSync(p, "utf8");
    } catch {
      missing.push({ layer, path: p });
      continue;
    }
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (e: any) {
      throw new Error(`Config at ${p} is not valid JSON: ${e.message}`);
    }
    config = merge(config, parsed);
    found.push({ layer, path: p });
  }
  return { config, found, missing };
}

/** Resolve a configured path: `~` expands to home, relative resolves from repo root (or cwd). */
export function expandPath(p: string): string {
  if (p.startsWith("~/")) return join(homedir(), p.slice(2));
  if (isAbsolute(p)) return p;
  return resolve(repoRoot() ?? process.cwd(), p);
}

const SECRET_LOOKING_KEYS = ["value", "token", "secret", "password", "apikey", "api_key", "key"];

/**
 * Refuse to persist anything that looks like an inlined secret. The repo layer is
 * committed, so this is the one place a leak can still be stopped cheaply.
 */
export function assertNoInlineSecrets(obj: any, trail: string[] = []): void {
  if (!obj || typeof obj !== "object") return;
  const inCredentials = trail[0] === "credentials";
  for (const [k, v] of Object.entries(obj)) {
    const here = [...trail, k];
    if (inCredentials && typeof v === "string" && SECRET_LOOKING_KEYS.includes(k.toLowerCase())) {
      throw new Error(
        `Refusing to write ${here.join(".")}: config files hold credential *references*, never secrets. ` +
          `Use {"source":"env","var":"..."} or another source from standards/skill-config.md.`,
      );
    }
    assertNoInlineSecrets(v, here);
  }
}

/** Write one layer wholesale. Callers merge first — this does not deep-merge on write. */
export function writeLayer(
  layer: Layer,
  config: OrchestrateConfig,
): { path: string; gitignore?: ReturnType<typeof ensureGitignored> } {
  assertNoInlineSecrets(config);
  const p = layerPath(layer);
  if (!p) throw new Error(`The ${layer} layer needs a git repository; run this inside one, or use the global layer.`);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(config, null, 2) + "\n");
  // Gitignoring the local layer happens here, at write time — the only moment it is reliable.
  return { path: p, gitignore: layer === "local" ? ensureGitignored() : undefined };
}

/**
 * Append the local-layer pattern to the repo .gitignore if nothing already matches it.
 * Done at write time — asking the user to remember is how secrets get committed.
 */
export function ensureGitignored(): { path: string; action: "added" | "already-ignored" | "no-repo" } {
  const root = repoRoot();
  if (!root) return { path: "", action: "no-repo" };
  const probe = layerPath("local", root)!;
  const check = spawnSync("git", ["check-ignore", "-q", probe], { cwd: root });
  const gitignore = join(root, ".gitignore");
  if (check.status === 0) return { path: gitignore, action: "already-ignored" };
  let existing = "";
  try {
    existing = readFileSync(gitignore, "utf8");
  } catch {
    /* no .gitignore yet */
  }
  const prefix = existing && !existing.endsWith("\n") ? "\n" : "";
  appendFileSync(
    gitignore,
    `${prefix}\n# Local skill config (may reference secrets) — see standards/skill-config.md\n${LOCAL_GITIGNORE_PATTERN}\n`,
  );
  return { path: gitignore, action: "added" };
}

const CREDENTIAL_REQUIRED_FIELDS: Record<string, string[]> = {
  "1password": ["ref"],
  env: ["var"],
  dotenv: ["path", "var"],
  keychain: ["service", "account"],
  command: ["command"],
};

export function validateCredentialRef(name: string, cred: CredentialRef | undefined): string[] {
  if (!cred) return [`credentials.${name} is not set`];
  const required = CREDENTIAL_REQUIRED_FIELDS[cred.source];
  if (!required) return [`credentials.${name}.source "${cred.source}" is not a known source`];
  return required
    .filter((f) => !(cred as any)[f])
    .map((f) => `credentials.${name}.${f} is required for source "${cred.source}"`);
}

/**
 * What's missing before the skill can drive the configured tracker.
 * Empty array = ready. A `file` tracker needs no credential, so zero-secret setups pass.
 */
export function validate(c: OrchestrateConfig): string[] {
  const problems: string[] = [];
  const kind = c.tracker?.kind;
  if (!kind) return ["tracker.kind is not set"];
  if (!(kind in CREDENTIAL_FOR)) return [`tracker.kind "${kind}" is not one of: ${Object.keys(CREDENTIAL_FOR).join(", ")}`];

  if (kind === "file" || kind === "tasknotes") {
    if (!c.tracker?.path) problems.push(`tracker.path is required for the "${kind}" tracker`);
  }
  if (kind === "github" && !c.tracker?.repo) problems.push('tracker.repo ("owner/repo") is required for the github tracker');
  if (kind === "jira") {
    if (!c.tracker?.site) problems.push("tracker.site is required for the jira tracker");
    if (!c.tracker?.project) problems.push("tracker.project (project key) is required for the jira tracker");
    if (!c.tracker?.email) problems.push("tracker.email (Atlassian account email) is required for the jira tracker");
  }
  if (kind === "linear" && !c.tracker?.team) problems.push("tracker.team is required for the linear tracker");

  const credName = CREDENTIAL_FOR[kind];
  if (credName) {
    const cred = c.credentials?.[credName];
    // GitHub can authenticate through the `gh` CLI, so its token is optional.
    if (!cred && kind === "github") {
      const gh = spawnSync("gh", ["auth", "status"], { encoding: "utf8" });
      if (gh.status !== 0) {
        problems.push("credentials.githubToken is not set and the gh CLI is not authenticated (run 'gh auth login')");
      }
    } else {
      problems.push(...validateCredentialRef(credName, cred));
    }
  }
  return problems;
}
