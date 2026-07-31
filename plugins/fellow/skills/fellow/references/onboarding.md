# Onboarding

Read this when `bun "$F" config check` reports missing configuration. The goal is a working setup, so finish by verifying — not by writing a file and hoping.

Ask the user these four things. Use `AskUserQuestion` so they can pick rather than type:

1. **Where is the Fellow API key?** They generate one in Fellow under User Settings → Developer API (paid workspaces only; an admin must have enabled the API in Workspace Security Settings). Offer the storage options the config standard supports: 1Password (`op`), an environment variable, a `.env` file, macOS Keychain, or an arbitrary shell command for other password managers. Never accept the key itself as text and never write it into a config file — store a *reference* to it.

2. **Which workspace?** The API is workspace-scoped: the base URL is `https://{subdomain}.fellow.app/api/v1`. The subdomain is visible in the URL when they use Fellow in a browser. If they aren't sure, ask them to check that URL.

3. **Which config layer?** Global (`~/.agents/skill-config/fellow/config.json`) is right for the credential and workspace, since those follow the person rather than the project. Use the repo layer for settings a whole team shares, and the local layer for personal paths that shouldn't be committed. Recommend global unless they say otherwise.

4. **What should be stored, and where?** Ask whether they want meeting recaps, transcripts, and media saved into the project, and at what paths — and make clear that anything not configured just isn't written. Transcripts are bulky and often sensitive, so it's reasonable to keep them out of a repo entirely by pointing at an absolute path outside it.

Then:

- Write the config with the `Write` tool. `bun "$F" config path --layer global` prints the exact destination. Copy the shape from `../config.example.json` next to this file.
- If you wrote the **local** layer, run `bun "$F" config gitignore` so `config.local.json` can't be committed.
- Verify with `bun "$F" config check` and show the user the authenticated identity it returns.

The full layering and credential-reference rules are in [the Skill Config Standard](../../../../../standards/skill-config.md); read it if the user asks something the four questions above don't cover.
