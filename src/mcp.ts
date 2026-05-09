#!/usr/bin/env node
/**
 * @wytcab/nousboot MCP server
 *
 * Exposes the NousBoot lens as an MCP tool named `nousboot_briefing`.
 * Compatible with Claude Desktop, Claude Code, Cursor, and any other
 * MCP client that supports stdio transport.
 *
 * Configuration (Claude Desktop / Claude Code):
 *
 *   {
 *     "mcpServers": {
 *       "nousboot": {
 *         "command": "npx",
 *         "args": ["-y", "@wytcab/nousboot", "nousboot-mcp"],
 *         "env": {
 *           "DEEPSEEK_API_KEY": "sk-..."
 *         }
 *       }
 *     }
 *   }
 *
 * Or, if installed globally:
 *
 *   {
 *     "mcpServers": {
 *       "nousboot": {
 *         "command": "nousboot-mcp",
 *         "env": { "DEEPSEEK_API_KEY": "sk-..." }
 *       }
 *     }
 *   }
 *
 * Copyright (c) 2026 Vilhelm Drosjer
 * MIT License.
 */

import fs from "node:fs";
import { pathToFileURL } from "node:url";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  DEFAULT_MODEL,
  LensValidationError,
  makeProviderFromEnv,
  readCorpus,
} from "@wytcab/projection-core";

import { VERSION, nousboot } from "./lens.js";

/**
 * Build the MCP server with the nousboot_briefing tool registered.
 * Exported for testability; main() handles transport connection.
 */
export function buildServer(): McpServer {
  const server = new McpServer(
    {
      name: "nousboot",
      version: VERSION,
    },
    {
      instructions:
        "Use nousboot_briefing at the start of a coding session to get a four-section briefing of the project: what changed since last session, what assumptions are now stale, what is blocked on the user, and a single suggested session goal. Pass the absolute path of the project directory.",
    },
  );

  server.registerTool(
    "nousboot_briefing",
    {
      title: "NousBoot pre-flight briefing",
      description:
        "Generate a four-section pre-flight briefing for an agentic coding session. Reads CLAUDE.md, README.md, and the most recent 20 git commits from the project, then produces: 'Since last session', 'Likely stale', 'Blocked on you', 'Suggested session goal'. Cost is typically under $0.001 per briefing on the default model.",
      inputSchema: {
        projectPath: z
          .string()
          .describe(
            "Absolute path to the project root directory. Must be a git repository with at least one commit and contain CLAUDE.md or README.md.",
          ),
        model: z
          .string()
          .optional()
          .describe(
            `Model identifier. Default: ${DEFAULT_MODEL}. Must start with 'deepseek-' or 'claude-'. Requires the corresponding API key in the environment (DEEPSEEK_API_KEY or ANTHROPIC_API_KEY).`,
          ),
      },
    },
    async ({ projectPath, model }) => {
      const resolvedModel = model ?? DEFAULT_MODEL;

      try {
        const provider = makeProviderFromEnv(resolvedModel);
        const corpus = await readCorpus({ rootPath: projectPath });

        if (nousboot.validate) {
          await nousboot.validate(corpus, { provider, model: resolvedModel });
        }

        const result = await nousboot.run(corpus, {
          provider,
          model: resolvedModel,
        });

        const meta = result.meta;
        const footer = [
          "",
          "---",
          `_Briefing by NousBoot ${VERSION} on \`${meta.model}\`. ` +
            `${meta.inputTokens} in / ${meta.outputTokens} out tokens, ` +
            `$${meta.costUsd.toFixed(4)}, ${meta.durationMs}ms._`,
        ].join("\n");

        return {
          content: [
            {
              type: "text" as const,
              text: result.markdown + footer,
            },
          ],
        };
      } catch (err) {
        if (err instanceof LensValidationError) {
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text:
                  `nousboot_briefing failed: ${err.message}` +
                  (err.hint ? `\n\nHint: ${err.hint}` : ""),
              },
            ],
          };
        }
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `nousboot_briefing failed: ${message}`,
            },
          ],
        };
      }
    },
  );

  return server;
}

async function main(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => {
      server.close().finally(() => process.exit(0));
    });
  }
}

/**
 * Determine whether this module is the entry point of the Node process.
 *
 * The naive check `import.meta.url === pathToFileURL(process.argv[1]).href`
 * fails when the binary is invoked via an npm-created symlink in
 * `node_modules/.bin/`: process.argv[1] is the symlink path, while
 * import.meta.url has been resolved through the symlink to the real file.
 * The two URLs differ, main() never runs, and the server silently no-ops.
 *
 * Resolve the argv path with fs.realpathSync before comparing so symlink
 * and direct invocations both work.
 */
function isEntryPoint(): boolean {
  const argv1 = process.argv[1];
  if (argv1 === undefined) return false;
  let realArgv1: string;
  try {
    realArgv1 = fs.realpathSync(argv1);
  } catch {
    realArgv1 = argv1;
  }
  return import.meta.url === pathToFileURL(realArgv1).href;
}

if (isEntryPoint()) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`nousboot-mcp fatal: ${message}\n`);
    process.exit(1);
  });
}
