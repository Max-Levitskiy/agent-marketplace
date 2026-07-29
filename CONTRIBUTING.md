# Contributing a plugin

Adding a plugin to this marketplace takes three steps.

## 1. Add your plugin files

Create a directory under `plugins/` and give it a `.claude-plugin/plugin.json`:

```
plugins/
└── my-plugin/
    ├── .claude-plugin/
    │   └── plugin.json          # only this file lives inside .claude-plugin/
    ├── commands/                # optional — slash commands (.md files)
    ├── skills/                  # optional — skills (each in its own dir with SKILL.md)
    ├── agents/                  # optional — subagents (.md files)
    ├── hooks/
    │   └── hooks.json           # optional — lifecycle hooks
    └── .mcp.json                # optional — MCP servers
```

Minimal `plugins/my-plugin/.claude-plugin/plugin.json` — only `name` is required:

```json
{
  "name": "my-plugin",
  "description": "One line on what it does.",
  "version": "0.1.0",
  "author": { "name": "Your Name" }
}
```

Claude Code auto-discovers `commands/`, `skills/`, `agents/`, `hooks/hooks.json`, and `.mcp.json` — you only add explicit paths in `plugin.json` when overriding the defaults.

## 2. Register it in the marketplace

Add an entry to the `plugins` array in [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json):

```json
{
  "name": "max-skills",
  "owner": { "name": "Max Levitskiy", "email": "max.dstu@gmail.com" },
  "plugins": [
    {
      "name": "my-plugin",
      "source": "./plugins/my-plugin",
      "description": "One line on what it does."
    }
  ]
}
```

The `source` is a path relative to the repo root (not to `.claude-plugin/`). You can also point at an external repo instead of vendoring the code:

```json
{ "name": "my-plugin", "source": { "source": "github", "repo": "owner/repo" } }
```

## 3. Test and open a PR

Test locally before pushing:

```bash
/plugin marketplace add /path/to/this/repo      # local path works for dev
/plugin install my-plugin@max-skills
```

Then open a pull request. Also add a row to the **Plugins** table in the [README](README.md).

## References

- [Create plugins](https://code.claude.com/docs/en/plugins)
- [Plugin reference](https://code.claude.com/docs/en/plugins-reference)
- [Create a marketplace](https://code.claude.com/docs/en/plugin-marketplaces)
