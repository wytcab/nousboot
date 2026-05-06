# synthetic-project — agent context

This file is the agent's running context for the synthetic-project repo.

## Architecture

The project uses Express + Postgres. Postgres connection lives in `src/db.ts`.

## Open questions

- Should we move from Express to Fastify? Need to decide before adding the new auth routes.
- TODO: pick a logging library. Currently using `console.log` everywhere.

## Stale assumptions to revisit

- We assumed `pg` v7. STALE_AFTER: 2026-04-01 — check if v8 is out and worth upgrading.

## Known blockers

- BLOCKED: waiting on Vilhelm to confirm whether the new auth flow uses passkeys or magic links.
