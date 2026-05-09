# NousBoot

Pre-flight briefings for agentic coding sessions.

[![npm](https://img.shields.io/npm/v/@wytcab/nousboot.svg)](https://www.npmjs.com/package/@wytcab/nousboot)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)

Before you start a Claude Code session, a Cursor task, or any agentic coding run, NousBoot generates a 60-second briefing of your project: what changed since your last session, what assumptions are now stale, what is blocked on you specifically, and a single suggested focus for this session.

You don't start cold. You don't start hot-but-confused.

## What it does

NousBoot reads `CLAUDE.md`, `README.md`, and the most recent 20 git commits from your project, then produces a four-section briefing:

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

Cost is typically around $0.0004 per briefing on the default model (DeepSeek V4 Flash).

## Install

```bash
npm install -g @wytcab/nousboot
```

You'll need an API key for the LLM provider you want to use:

- DeepSeek (default, cheapest): get a key at [platform.deepseek.com](https://platform.deepseek.com), set `DEEPSEEK_API_KEY`
- Anthropic: get a key at [console.anthropic.com](https://console.anthropic.com), set `ANTHROPIC_API_KEY`

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

## Use as an MCP server

NousBoot ships with an MCP server (`nousboot-mcp`) that exposes the briefing as a tool to any MCP-compatible client: Claude Desktop, Claude Code, Cursor, and others.

### Claude Desktop

Edit your Claude Desktop config (location varies by OS — see [Anthropic's docs](https://docs.claude.com/en/docs/agents-and-tools/mcp)):

```json
{
  "mcpServers": {
    "nousboot": {
      "command": "nousboot-mcp",
      "env": {
        "DEEPSEEK_API_KEY": "sk-..."
      }
    }
  }
}
```

Restart Claude Desktop. You can now ask Claude to "give me a NousBoot briefing on `/Users/me/work/my-project`" and it will call the tool directly.

### Claude Code

Add to your `~/.claude.json` or per-project `.claude.json`:

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

## Use programmatically

NousBoot is also importable as a library, in case you want to wire it into your own tooling. The lens has the standard `@wytcab/projection-core` `Lens<TConfig, TOutput>` shape.

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

NousBoot does not phone home. There is no telemetry. The briefing runs locally; LLM calls go to whichever provider you configure (DeepSeek by default, swappable to Anthropic, OpenAI-compatible providers, or local models).

Your corpus content is sent only to the LLM provider you choose, exactly once per briefing, with no retention by NousBoot itself.

## Built on

NousBoot is built on [`@wytcab/projection-core`](https://github.com/wytcab/projection-core), the framework primitive for cognitive-primitive lenses.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Hard rule: no telemetry. Ever.

## License

MIT. Copyright (c) 2026 Vilhelm Drosjer.
