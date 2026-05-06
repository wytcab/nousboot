#!/usr/bin/env node
/**
 * @wytcab/nousboot CLI
 *
 * Usage:
 *   nousboot <project-path> [options]
 *
 * Options:
 *   --model <id>        Model to use. Default: deepseek-v4-flash
 *   --output <path>     Write briefing to this file (in addition to stdout)
 *   --save              Save briefing to <project>/.nousboot/briefings/YYYY-MM-DD.md
 *   --quiet             Suppress non-output text
 *   --help              Show help
 *   --version           Print version
 *
 * Environment:
 *   DEEPSEEK_API_KEY    Required for deepseek-* models
 *   ANTHROPIC_API_KEY   Required for claude-* models
 *
 * Copyright (c) 2026 Vilhelm Drosjer
 * MIT License.
 */

import fs from "node:fs/promises";
import path from "node:path";

import {
  DEFAULT_MODEL,
  LensValidationError,
  defaultBriefingPath,
  makeProviderFromEnv,
  readCorpus,
  serializeOutput,
} from "@wytcab/projection-core";

import { VERSION, nousboot } from "./lens.js";

interface ParsedArgs {
  projectPath: string;
  model: string;
  output?: string;
  save: boolean;
  quiet: boolean;
}

interface FlagResult {
  type: "flag";
  flag: "help" | "version";
}

interface ErrorResult {
  type: "error";
  message: string;
}

type ParseResult = ParsedArgs | FlagResult | ErrorResult;

function parseArgs(argv: string[]): ParseResult {
  const args = argv.slice(2);
  if (args.length === 0) {
    return { type: "error", message: "Missing required argument: project path." };
  }
  if (args.includes("--help") || args.includes("-h")) {
    return { type: "flag", flag: "help" };
  }
  if (args.includes("--version") || args.includes("-v")) {
    return { type: "flag", flag: "version" };
  }

  let projectPath: string | undefined;
  let model: string = DEFAULT_MODEL;
  let output: string | undefined;
  let save = false;
  let quiet = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (arg === "--model") {
      const next = args[i + 1];
      if (!next) return { type: "error", message: "--model requires a value." };
      model = next;
      i++;
    } else if (arg === "--output" || arg === "-o") {
      const next = args[i + 1];
      if (!next) return { type: "error", message: "--output requires a value." };
      output = next;
      i++;
    } else if (arg === "--save") {
      save = true;
    } else if (arg === "--quiet" || arg === "-q") {
      quiet = true;
    } else if (arg.startsWith("--")) {
      return { type: "error", message: `Unknown option: ${arg}` };
    } else {
      if (projectPath !== undefined) {
        return { type: "error", message: `Unexpected extra argument: ${arg}` };
      }
      projectPath = arg;
    }
  }

  if (!projectPath) {
    return { type: "error", message: "Missing required argument: project path." };
  }

  return { projectPath, model, output, save, quiet };
}

const HELP_TEXT = `nousboot — pre-flight briefings for agentic coding sessions

Usage:
  nousboot <project-path> [options]

Options:
  --model <id>     Model to use (default: ${DEFAULT_MODEL})
  --output <path>  Write briefing to this file
  --save           Save to <project>/.nousboot/briefings/YYYY-MM-DD.md
  --quiet          Suppress non-output text
  --help           Show this help
  --version        Print version

Environment:
  DEEPSEEK_API_KEY   Required for deepseek-* models
  ANTHROPIC_API_KEY  Required for claude-* models

Example:
  nousboot ~/work/my-project
  nousboot ~/work/my-project --model claude-sonnet-4-6 --save
`;

async function main(): Promise<number> {
  const parsed = parseArgs(process.argv);

  if ("type" in parsed) {
    if (parsed.type === "flag") {
      if (parsed.flag === "help") {
        process.stdout.write(HELP_TEXT);
        return 0;
      }
      if (parsed.flag === "version") {
        process.stdout.write(`${VERSION}\n`);
        return 0;
      }
    }
    if (parsed.type === "error") {
      process.stderr.write(`Error: ${parsed.message}\n\n`);
      process.stderr.write(HELP_TEXT);
      return 64; // EX_USAGE
    }
  } else {
    const args = parsed;
    const log = args.quiet
      ? () => {}
      : (msg: string) => process.stderr.write(`${msg}\n`);

    log(`nousboot ${VERSION} - briefing ${args.projectPath} with ${args.model}`);

    // Build provider from env. Fails fast if API key missing.
    const provider = makeProviderFromEnv(args.model);

    // Read corpus
    log("reading corpus...");
    const corpus = await readCorpus({ rootPath: args.projectPath });
    log(`  ${corpus.files.length} files, ${corpus.metadata.gitLog?.length ?? 0} commits`);

    // Validate
    if (nousboot.validate) {
      await nousboot.validate(corpus, { provider, model: args.model });
    }

    // Run
    log("calling LLM...");
    const result = await nousboot.run(corpus, { provider, model: args.model });
    log(
      `  ${result.meta.inputTokens} in / ${result.meta.outputTokens} out tokens, $${result.meta.costUsd.toFixed(4)}, ${result.meta.durationMs}ms`,
    );

    // Output
    process.stdout.write(result.markdown);
    if (!result.markdown.endsWith("\n")) process.stdout.write("\n");

    if (args.output) {
      await fs.mkdir(path.dirname(path.resolve(args.output)), { recursive: true });
      await fs.writeFile(args.output, serializeOutput(result), "utf8");
      log(`wrote ${args.output}`);
    }
    if (args.save) {
      const savePath = defaultBriefingPath(
        path.resolve(args.projectPath),
        "nousboot",
        result.meta.generatedAt,
      );
      await fs.mkdir(path.dirname(savePath), { recursive: true });
      await fs.writeFile(savePath, serializeOutput(result), "utf8");
      log(`saved to ${savePath}`);
    }

    return 0;
  }
  return 1;
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    if (err instanceof LensValidationError) {
      process.stderr.write(`Error: ${err.message}\n`);
      if (err.hint) process.stderr.write(`Hint: ${err.hint}\n`);
      process.exit(2);
    }
    if (err instanceof Error) {
      process.stderr.write(`Error: ${err.message}\n`);
    } else {
      process.stderr.write(`Error: ${String(err)}\n`);
    }
    process.exit(1);
  },
);
