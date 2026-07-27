// Skill Config Standard (SCS v1) loader — see standards/skill-config.md
// Layers: ~/.agents (global) -> <repo>/.agents (repo) -> config.local.json (local)

import { homedir } from "os";
import { join, isAbsolute, resolve } from "path";
import { spawnSync } from "child_process";

export const SKILL_NAME = "fellow";
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

export interface StorageTarget {
  enabled: boolean;
  path: string;
}

export interface FellowConfig {
  version?: number;
  credentials?: { apiKey?: CredentialRef };
  workspace?: { subdomain?: string };
  storage?: {
    recaps?: StorageTarget;
    transcripts?: StorageTarget;
    media?: StorageTarget;
  };
  defaults?: { pageSize?: number; lookbackDays?: number };
  /** Named project scopes — see lib/relevance.ts for the matching rules. */
  projects?: Record<string, import("./relevance").ProjectRules>;
  defaultProject?: string;
  /** Machine-maintained: calendar series key -> which project it belongs to. */
  series?: Record<string, import("./relevance").SeriesVerdict>;
}

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
  config: FellowConfig;
  /** Which layers were actually found on disk, in precedence order. */
  found: { layer: Layer; path: string }[];
  missing: { layer: Layer; path: string }[];
}

export function loadConfig(): LoadedConfig {
  const root = repoRoot();
  const found: { layer: Layer; path: string }[] = [];
  const missing: { layer: Layer; path: string }[] = [];
  let config: FellowConfig = {};

  for (const layer of ["global", "repo", "local"] as Layer[]) {
    const p = layerPath(layer, root);
    if (!p) continue;
    let raw: string;
    try {
      raw = require("fs").readFileSync(p, "utf8");
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

/**
 * Persist a Tier-0 series verdict. Writes to the repo layer so teammates inherit
 * classifications already paid for; falls back to global outside a git repo.
 * Only the `series` key is touched — hand-written rules are left alone.
 */
export function recordSeriesVerdict(
  key: string,
  project: string | null,
  why: string,
  today: string,
): { path: string; layer: Layer } {
  const root = repoRoot();
  const layer: Layer = root ? "repo" : "global";
  const path = layerPath(layer, root)!;
  const fs = require("fs");

  let existing: any = {};
  try {
    existing = JSON.parse(fs.readFileSync(path, "utf8"));
  } catch {
    existing = { version: 1 };
  }
  existing.series ??= {};
  existing.series[key] = { project, why, at: today };

  fs.mkdirSync(require("path").dirname(path), { recursive: true });
  fs.writeFileSync(path, JSON.stringify(existing, null, 2) + "\n");
  return { path, layer };
}

/** What's missing before the skill can actually make a call. Empty array = ready. */
export function validate(c: FellowConfig): string[] {
  const problems: string[] = [];
  if (!c.workspace?.subdomain) problems.push("workspace.subdomain is not set");
  const cred = c.credentials?.apiKey;
  if (!cred) {
    problems.push("credentials.apiKey is not set");
  } else {
    const need: Record<string, string[]> = {
      "1password": ["ref"],
      env: ["var"],
      dotenv: ["path", "var"],
      keychain: ["service", "account"],
      command: ["command"],
    };
    const required = need[cred.source];
    if (!required) problems.push(`credentials.apiKey.source "${cred.source}" is not a known source`);
    else for (const f of required) {
      if (!(cred as any)[f]) problems.push(`credentials.apiKey.${f} is required for source "${cred.source}"`);
    }
  }
  return problems;
}
