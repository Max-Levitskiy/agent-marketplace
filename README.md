# Claude Code Marketplace — Plugins, Skills, Subagents, Hooks & MCP Servers

> A **Claude Code plugin marketplace**: install curated plugins — slash commands, skills, subagents, hooks, and MCP servers — into [Claude Code](https://code.claude.com) with a single command.

Add this marketplace to Claude Code:

```bash
/plugin marketplace add Max-Levitskiy/claude-code-marketplace
```

Then browse and install plugins:

```bash
/plugin                                          # open the interactive plugin browser
/plugin install <plugin-name>@claude-code-marketplace
```

---

## What is this?

This repo is a [Claude Code](https://code.claude.com) **plugin marketplace** — a Git repository that packages and distributes Claude Code plugins so anyone can install them in seconds. A plugin can bundle any combination of:

- **Slash commands** — custom `/commands` for repeatable workflows
- **Skills** — model-invoked capabilities that trigger automatically when relevant
- **Subagents** — specialized agents for focused tasks
- **Hooks** — automation that runs on Claude Code lifecycle events
- **MCP servers** — connections to external tools and data via the Model Context Protocol

## Install

**1. Add the marketplace** (one time):

```bash
/plugin marketplace add Max-Levitskiy/claude-code-marketplace
```

**2. Install a plugin:**

```bash
/plugin install <plugin-name>@claude-code-marketplace
```

**3. Keep it current:**

```bash
/plugin marketplace update claude-code-marketplace
```

Prefer a UI? Run `/plugin` to open the interactive browser, pick a plugin, and install it there.

## Plugins

| Plugin | Description | Install |
| ------ | ----------- | ------- |
| [`text-density-analyzer`](plugins/text-density-analyzer) | Detect repeated information and measure information density in text. Score or fix AI-generated bloat, semantic repetition, and filler content. | `/plugin install text-density-analyzer@claude-code-marketplace` |
| [`fellow`](plugins/fellow) | Query Fellow meeting notes, transcripts, AI summaries, and action items via the Fellow REST API. Search past meetings, write recaps into a repo, bulk-export to markdown. | `/plugin install fellow@claude-code-marketplace` |

## Standards

Conventions shared by plugins in this marketplace.

| Standard | What it covers |
| -------- | -------------- |
| [Skill Config Standard](standards/skill-config.md) | How a skill stores settings across global / repo / local layers, and references secrets without ever committing one. Reference implementation: [`fellow`](plugins/fellow). |

## Add your own plugin

Contributions welcome. In short:

1. Drop your plugin under `plugins/<your-plugin>/` with a `.claude-plugin/plugin.json`.
2. Register it in `.claude-plugin/marketplace.json` with a `./plugins/<your-plugin>` source.
3. Open a pull request.

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for the full, copy-pasteable steps.

## The Claude Code plugin ecosystem

Other places to discover Claude Code plugins, skills, and marketplaces:

| Source | What it is |
| ------ | ---------- |
| [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official) | Anthropic's official, curated directory of high-quality plugins |
| [Claude Code plugin docs](https://code.claude.com/docs/en/plugins) | Official documentation for creating and using plugins |
| [Plugin marketplace docs](https://code.claude.com/docs/en/plugin-marketplaces) | How to build and distribute a marketplace |
| [claudemarketplaces.com](https://claudemarketplaces.com/) | Community directory of Claude Code skills, plugins & MCP servers |

## Related

Keywords: Claude Code, Claude Code plugins, Claude Code marketplace, Claude plugins, Claude skills, subagents, hooks, MCP servers, Anthropic, AI agents, developer tools.

## License

[MIT](LICENSE) © Max Levitskiy
