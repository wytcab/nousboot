---
name: nousboot-briefing
description: Pre-flight briefing for agentic coding sessions. Use this skill at the start of any new coding session in a real project, especially when the user asks to "get oriented", "see what changed", "catch up on this project", "what should I work on", "where did I leave off", or any similar session-orientation request. Also use this proactively when a session begins inside a git repository that contains CLAUDE.md or README.md and the user has not yet stated a specific narrow task — calling this skill once at the start of the session gives Claude a four-section briefing of recent commits, stale assumptions, and what is blocked on the user, which dramatically improves session quality. Cost is around $0.001 per briefing. Do not call multiple times per session; once at the start is sufficient.
---

# NousBoot Pre-Flight Briefing

## Purpose

Generate a four-section briefing of the current project at the start of a coding session: what changed since last session, what assumptions are now stale, what is blocked on the user, and a single suggested session goal.

This skill prevents the "cold session" failure mode where the agent and the user spend the first 5-10 minutes re-establishing context the agent could have read from disk in 60 seconds.

## When to use

- Start of a fresh Claude Code session in a real project (highest value)
- User asks "what changed", "where did we leave off", "catch me up", "what should I work on", "get me oriented"
- User has been away from the project for more than a few days
- Before a long agentic run where context drift would be expensive

## When NOT to use

- The user has already stated a specific narrow task (e.g., "fix this typo", "rename this variable") — go do that task instead
- The session is in a non-git directory or a directory without CLAUDE.md / README.md
- You have already called this skill once in the current session
- The user explicitly says "skip the briefing" or similar

## How to use

The `nousboot_briefing` MCP tool is the only invocation path. It takes one required argument:

- `projectPath` (string, required): the absolute path to the project root. This must be a directory containing `.git/` and at least one of `CLAUDE.md` or `README.md`.

Optional argument:

- `model` (string, optional): the LLM model to use. Default: `deepseek-v4-flash`. Other supported values: `claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5`. The default is fine for almost all cases.

Determine `projectPath` by:

1. If the user mentions a path explicitly, use it as-is
2. Otherwise, use the current working directory of the session (which Claude Code provides as the project root)

Call the tool, then read the returned briefing carefully. The four sections are:

- **Since last session** — recent commits and what they changed
- **Likely stale** — assumptions in CLAUDE.md or README.md that recent commits may have invalidated
- **Blocked on you** — decisions or actions only the user can take
- **Suggested session goal** — a single concrete sentence for what to focus on this session

## What to do with the output

After receiving the briefing, do NOT just dump it back to the user verbatim. Instead:

1. Read the briefing yourself to update your own understanding of the project
2. Acknowledge to the user in one or two sentences what the most important takeaway is — usually the "Suggested session goal" or the top item in "Blocked on you"
3. Ask the user to confirm or redirect: "The briefing suggests focusing on X today. Does that match what you wanted to work on, or did you have something else in mind?"

This pattern uses the briefing as ambient session prep rather than a wall of text the user has to re-read.

## Failure modes

If the tool returns an error:

- "Corpus is missing both README.md and CLAUDE.md" — the project doesn't have either file. Tell the user; offer to help them create a CLAUDE.md
- "Corpus has no git log" — the project isn't a git repo or has no commits. Skip the briefing
- "DEEPSEEK_API_KEY is not set" — the user's MCP config is missing the API key. Tell them to add it to their `~/.claude.json` `mcpServers.nousboot.env.DEEPSEEK_API_KEY`
- Any other error — tell the user the briefing failed and proceed without one. Do not retry more than once.

## Examples

User starts a Claude Code session in their project root and says "Hi":
→ Call `nousboot_briefing` with the cwd as `projectPath`. Read the result. Reply: "Looks like you wrapped up Phase 5.5 and the launch blocker is switching Stripe to live mode. Want to start there, or did you have something else?"

User says "I'm back, what should I work on?":
→ Call `nousboot_briefing`. Read it. Surface the suggested session goal, ask for confirmation.

User says "fix the typo in line 42 of cli.ts":
→ Skip the briefing. Go fix the typo.

User says "give me a nousboot briefing":
→ Call `nousboot_briefing`. Show the user the briefing verbatim (this case is explicit).
