# @wytcab/nousboot

[![npm](https://img.shields.io/npm/v/@wytcab/nousboot.svg)](https://www.npmjs.com/package/@wytcab/nousboot)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org)

Pre-flight briefings for agentic coding sessions.

## What it does

Before you start a Claude Code session, a Cursor task, or any agentic outreach run, NousBoot generates a 60-second briefing of your project: what changed since your last session, what assumptions are now stale, what is blocked on you specifically, and what the focus of this session should be.

You don't start cold. You don't start hot-but-confused.

## Status

**Phase 0 stub.** The repo scaffolding and the lens interface contract are in place. Real briefing logic ships in the Phase 1 release.

## Install (coming soon)

```bash
# Will work once @wytcab/nousboot is published to npm:
npm install -g @wytcab/nousboot
# or
npx @wytcab/nousboot ./my-project
```

## Use (coming soon)

```bash
# Basic CLI:
nousboot ./my-project

# Pick a specific model:
nousboot ./my-project --model claude-sonnet-4-6

# As an MCP server (registered in Claude Desktop, Claude Code, etc.):
# (configuration docs land at Phase 1 ship)
```

## Privacy

NousBoot does not phone home. No telemetry. The briefing runs locally; LLM calls go to whichever provider you configure (DeepSeek by default, swappable to Anthropic, OpenAI, or local models).

## Built on

This lens is built on [`@wytcab/projection-core`](https://github.com/wytcab/projection-core), the framework primitive for cognitive-primitive lenses.

## License

MIT. Copyright (c) 2026 Vilhelm Drosjer.
