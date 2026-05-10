# NousBoot

> Stop opening cold sessions with your agents. NousBoot reads your project's CLAUDE.md, README, and recent git log, then produces a 60-second briefing of what changed, what's stale, and what's blocked on you. Costs about $0.0004 per run.

[![npm](https://img.shields.io/npm/v/@wytcab/nousboot.svg)](https://www.npmjs.com/package/@wytcab/nousboot)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)
[![CI](https://github.com/wytcab/nousboot/actions/workflows/ci.yml/badge.svg)](https://github.com/wytcab/nousboot/actions/workflows/ci.yml)

## The problem

You sit down to work on a project. Maybe it's been three days. Maybe three weeks. You open Claude Code, Cursor, or any other agent. Your first 5-10 minutes are spent re-establishing context: what was I doing, what's the state of the database migration, did that PR ever get reviewed, what was I supposed to decide about the auth flow.

The agent doesn't know any of this either. So either you start "cold" and the first three messages are remedial, or you start "hot but wrong" and the agent confidently does the wrong thing because it's pattern-matching to something it read in a stale CLAUDE.md from two weeks ago.

NousBoot fixes the cold start. It reads your project's actual current state from disk and surfaces it in 60 seconds, before you write a single line of code.

## What it does

NousBoot reads your project root and produces a four-section briefing:

```
## Since last session
- 1d820aa Batch enrichment complete: 177,599 tenders 100% AI-enriched
- 73b2cf Pipeline green; Stripe live mode identified as the last launch blocker
- 4da6c7 close_stale.py crash fixed: 500-row batches, try/except, continue-on-error

## Likely stale
- CLAUDE.md says "Phase 5.5: 4/9 features built" but recent commits show Phase 5.5 is complete
- "Pre-launch checklist" lists item 3D as pending; no commit addresses it

## Blocked on you
- Stripe live mode switch — explicit blocker, no commit shows it done
- Item 3D decision: build now or defer post-launch

## Suggested session goal
Switch Stripe from test to live mode, then update CLAUDE.md with current Phase 5.5 status.
```

That output is a real briefing produced against a real project. The commit SHAs, file names, and contradictions in CLAUDE.md are all extracted from the actual repository, not invented.

## How it compares to the alternatives

| | Reading CLAUDE.md yourself | `git log` then re-reading CLAUDE.md | NousBoot |
|---|---|---|---|
| Catches context drift between CLAUDE.md and recent commits | No | Sometimes, if you're paying attention | Yes — it's the whole point |
| Surfaces blocked-on-you items | No | No | Yes |
| Suggests a session goal | No | No | Yes |
| Time to read | 5-10 min | 5-10 min | 60 seconds |
| Cost per run | Free, but expensive in attention | Free | ~$0.0004 |

## Install

```bash
npm install -g @wytcab/nousboot
```

You'll need an API key for the LLM provider you want to use:

- **DeepSeek** (default, cheapest at ~$0.0004/briefing): get a key at [platform.deepseek.com](https://platform.deepseek.com), set `DEEPSEEK_API_KEY` in your environment
- **Anthropic** (better quality on hard cases at ~$0.005/briefing): get a key at [console.anthropic.com](https://console.anthropic.com), set `ANTHROPIC_API_KEY`

## Use as a CLI

```bash
# Brief the project at the given path:
nousboot ~/work/my-project

# Use a specific model:
nousboot ~/work/my-project --model claude-sonnet-4-6

# Save the briefing to <project>/.nousboot/briefings/YYYY-MM-DD.md:
nousboot ~/work/my-project --save

# Save to a custom path:
nousboot ~/work/my-project --output ./briefing.md

# Suppress non-output text (useful for piping):
nousboot ~/work/my-project --quiet
```

Run `nousboot --help` for the full option list.

## Use as an MCP server (recommended)

NousBoot ships with an MCP server (`nousboot-mcp`) that exposes the briefing as a tool to any MCP-compatible client. With this set up once, your agent calls NousBoot itself when you start a session — you don't have to remember.

### Claude Code

Edit your `~/.claude.json` and add the `nousboot` MCP server. The cleanest way is via `jq`:

```bash
jq --arg key "$DEEPSEEK_API_KEY" '
  .mcpServers.nousboot = {
    "type": "stdio",
    "command": "nousboot-mcp",
    "env": { "DEEPSEEK_API_KEY": $key }
  }
' ~/.claude.json > ~/.claude.json.new && mv ~/.claude.json.new ~/.claude.json
```

Or edit by hand:

```json
{
  "mcpServers": {
    "nousboot": {
      "type": "stdio",
      "command": "nousboot-mcp",
      "env": { "DEEPSEEK_API_KEY": "sk-..." }
    }
  }
}
```

Restart Claude Code. In a new session inside any project, ask "give me a nousboot briefing on this project" and Claude will call the tool.

### Claude Code Skill (auto-invocation)

For Claude Code to call NousBoot automatically at the start of each session — without you asking — install the skill:

```bash
mkdir -p ~/.claude/skills/nousboot-briefing
curl -L https://raw.githubusercontent.com/wytcab/nousboot/main/extensions/claude-code/SKILL.md \
  > ~/.claude/skills/nousboot-briefing/SKILL.md
```

Now Claude Code will proactively call `nousboot_briefing` when you open a session in a project, with no manual invocation needed.

### Claude Desktop

```json
{
  "mcpServers": {
    "nousboot": {
      "command": "nousboot-mcp",
      "env": { "DEEPSEEK_API_KEY": "sk-..." }
    }
  }
}
```

Config file location varies by OS — see [Anthropic's MCP docs](https://docs.claude.com/en/docs/agents-and-tools/mcp).

### Cursor

Settings → Features → MCP → Add new MCP server. Use the same config shape.

### Without a global install

If you don't want to install `@wytcab/nousboot` globally, use `npx`:

```json
{
  "mcpServers": {
    "nousboot": {
      "command": "npx",
      "args": ["-y", "@wytcab/nousboot", "nousboot-mcp"],
      "env": { "DEEPSEEK_API_KEY": "sk-..." }
    }
  }
}
```

## Use as a Paperclip extension

NousBoot ships with a Paperclip extension manifest that registers it as a pre-task hook for autonomous agents. See [`extensions/paperclip/`](./extensions/paperclip/) for setup.

## Use programmatically

NousBoot is also importable as a library. The lens has the standard `@wytcab/projection-core` `Lens<TConfig, TOutput>` shape.

```typescript
import { nousboot } from "@wytcab/nousboot";
import {
  makeProviderFromEnv,
  readCorpus,
} from "@wytcab/projection-core";

const provider = makeProviderFromEnv("deepseek-v4-flash");
const corpus = await readCorpus({ rootPath: "/path/to/project" });
const result = await nousboot.run(corpus, {
  provider,
  model: "deepseek-v4-flash",
});
console.log(result.markdown);
console.log(`Cost: $${result.meta.costUsd.toFixed(4)}`);
```

## Privacy

NousBoot does not phone home. There is no telemetry. The briefing runs locally; LLM calls go to whichever provider you configure. Your corpus content is sent only to that provider, exactly once per briefing, with no retention by NousBoot itself.

This is a hard rule. Pull requests adding telemetry of any form will be closed without review.

## Built on

NousBoot is built on [`@wytcab/projection-core`](https://github.com/wytcab/projection-core), the framework primitive for cognitive-primitive lenses. Other lenses share the same framework instead of reinventing the plumbing.

## Sister lenses

[`@wytcab/deballast`](https://github.com/wytcab/deballast) is a spec-compression lens. It reads a spec, compresses it to its load-bearing propositions, reconstructs the spec from those propositions only, and diffs the reconstruction against the original to classify every claim as load-bearing, decorative, or accidentally lost. Use it on PRDs, design docs, READMEs, or marketing pages before you publish or commit to building against them.

```sh
npm install -g @wytcab/deballast
deballast spec.md
```

If you want to build your own lens — a different transformation over a corpus you already have — start with projection-core.

## Status

Pre-1.0. The interface is stable enough to build against; expect minor breaking changes before 1.0.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Hard rules:

- No telemetry. Ever.
- MIT licensed contributions only.
- No `eval` or arbitrary remote code execution from corpus content.

## License

MIT. Copyright (c) 2026 Vilhelm Drosjer.
