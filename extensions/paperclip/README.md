# Paperclip extension

This directory contains the Paperclip extension manifest for NousBoot.

## What it does

Registers NousBoot as a pre-task hook that runs before any agent ticket execution. The agent receives a four-section briefing of the project context (recent commits, stale assumptions, items blocked on the user, suggested session goal) before it begins the ticket. This dramatically reduces the "cold session" failure mode where an autonomous agent starts a ticket with no awareness of recent project state.

## Install

If you have Paperclip running and want to add NousBoot to your agents' pre-task pipeline:

```bash
# Option 1: install via Paperclip CLI (when published to the Paperclip directory)
paperclip extension add nousboot

# Option 2: install from a local manifest path
paperclip extension add ./extensions/paperclip/manifest.toml
```

After installation, ensure each brand's `.env` (or your shared secrets) contains `DEEPSEEK_API_KEY`. The extension will use this key to call the DeepSeek API for briefings.

## Validation status

The manifest in this directory was written against the spec in the original Coxswain handoff doc. If your Paperclip version uses a different schema, the fields may need adjusting; the underlying behavior (pre-task MCP tool invocation with `nousboot_briefing`) is what matters and should be portable across schema versions.

## Cost

Briefings cost approximately $0.0004 each on DeepSeek V4 Flash. With the default 6-hour cache, an agent working continuously on one project will trigger at most 4 briefings per day, capping cost at roughly $0.002/day per agent per project.
