// Credential resolution per SCS v1. Secrets are fetched lazily and never logged,
// never written to disk, and never passed as command-line arguments.

import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import type { CredentialRef } from "./config";
import { expandPath } from "./config";

function run(cmd: string, args: string[], hint: string): string {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.error && (r.error as any).code === "ENOENT") {
    throw new Error(`${cmd} is not installed or not on PATH. ${hint}`);
  }
  if (r.status !== 0) {
    throw new Error(`${cmd} failed: ${(r.stderr || "").trim() || `exit ${r.status}`}. ${hint}`);
  }
  return r.stdout.replace(/\n+$/, "");
}

export function resolveCredential(ref: CredentialRef, name = "credential"): string {
  let value: string;

  switch (ref.source) {
    case "1password": {
      const args = ["read", ref.ref!];
      if (ref.account) args.push("--account", ref.account);
      value = run("op", args, "Install the 1Password CLI and run 'op signin'.");
      break;
    }
    case "env": {
      const v = process.env[ref.var!];
      if (!v) throw new Error(`Environment variable ${ref.var} is not set (referenced by credentials.${name}).`);
      value = v;
      break;
    }
    case "dotenv": {
      const p = expandPath(ref.path!);
      let text: string;
      try {
        text = readFileSync(p, "utf8");
      } catch {
        throw new Error(`Cannot read ${p} (referenced by credentials.${name}.path).`);
      }
      const line = text.split("\n").find((l) => l.trim().startsWith(`${ref.var}=`));
      if (!line) throw new Error(`${ref.var} not found in ${p}.`);
      value = line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
      break;
    }
    case "keychain": {
      value = run(
        "security",
        ["find-generic-password", "-s", ref.service!, "-a", ref.account!, "-w"],
        "Check the service and account names match a Keychain entry.",
      );
      break;
    }
    case "command": {
      const r = spawnSync("sh", ["-c", ref.command!], { encoding: "utf8" });
      if (r.status !== 0) {
        throw new Error(`Credential command failed: ${(r.stderr || "").trim() || `exit ${r.status}`}`);
      }
      value = r.stdout.replace(/\n+$/, "");
      break;
    }
    default:
      throw new Error(`Unknown credential source "${(ref as any).source}".`);
  }

  if (!value) throw new Error(`credentials.${name} resolved to an empty value.`);
  return value;
}

/** Describe a reference for display without revealing anything secret. */
export function describeCredential(ref: CredentialRef): string {
  const f = (v: string | undefined, field: string) => v ?? `(${field} unset)`;
  switch (ref.source) {
    case "1password":
      return `1Password: ${f(ref.ref, "ref")}${ref.account ? ` (account ${ref.account})` : ""}`;
    case "env":
      return `environment variable ${f(ref.var, "var")}`;
    case "dotenv":
      return `${f(ref.path, "path")} → ${f(ref.var, "var")}`;
    case "keychain":
      return `macOS Keychain: ${f(ref.service, "service")} / ${f(ref.account, "account")}`;
    case "command":
      return `command: ${f(ref.command, "command")}`;
    default:
      return `unknown source "${(ref as any).source}"`;
  }
}
