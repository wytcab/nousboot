/**
 * @wytcab/nousboot
 *
 * Pre-flight briefing lens for agentic coding sessions.
 *
 * Reads CLAUDE.md, README.md, recent git log, and any prior briefing on disk,
 * then produces a four-section briefing: Since last session / Likely stale /
 * Blocked on you / Suggested session goal.
 *
 * Copyright (c) 2026 Vilhelm Drosjer
 * MIT License.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type Corpus,
  type Lens,
  type LensConfig,
  type LensOutput,
  LensValidationError,
  defaultBriefingPath,
  loadPromptTemplate,
  renderPromptTemplate,
} from "@wytcab/projection-core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const VERSION = "0.2.1";

/** Path to a prompt template, resolved relative to this module's location. */
function promptPath(name: string): string {
  // After build: __dirname is <package>/dist/, prompts live at <package>/prompts/
  // In dev (tsx): __dirname is <package>/src/, prompts live at <package>/prompts/
  return path.join(__dirname, "..", "prompts", name);
}

/**
 * Read a prior briefing from disk, if one exists.
 * Returns null if no briefing directory or no prior file.
 */
async function readPreviousBriefing(rootPath: string): Promise<string | null> {
  const briefingDir = path.join(rootPath, ".nousboot", "briefings");
  const entries = await fs.readdir(briefingDir).catch(() => null);
  if (!entries || entries.length === 0) return null;
  // Filter to YYYY-MM-DD.md files, sort descending, take most recent
  const dated = entries
    .filter((e) => /^\d{4}-\d{2}-\d{2}\.md$/.test(e))
    .sort()
    .reverse();
  const mostRecent = dated[0];
  if (!mostRecent) return null;
  return fs.readFile(path.join(briefingDir, mostRecent), "utf8").catch(() => null);
}

export const nousboot: Lens = {
  name: "nousboot",
  version: VERSION,
  description: "Pre-flight briefings for agentic coding sessions.",

  validate(corpus: Corpus): void {
    const hasReadme = corpus.files.some(
      (f) => f.path.toLowerCase() === "readme.md",
    );
    const hasClaudeMd = corpus.files.some((f) => f.path === "CLAUDE.md");
    if (!hasReadme && !hasClaudeMd) {
      throw new LensValidationError(
        "Corpus is missing both README.md and CLAUDE.md.",
        "NousBoot needs at least one project document to brief from. Add a README.md or a CLAUDE.md to your project root.",
      );
    }
    const gitLog = corpus.metadata.gitLog;
    if (!gitLog || gitLog.length === 0) {
      throw new LensValidationError(
        "Corpus has no git log.",
        "NousBoot uses recent git activity to construct the 'Since last session' section. Ensure the project is a git repository with at least one commit.",
      );
    }
  },

  async run(corpus: Corpus, config: LensConfig): Promise<LensOutput> {
    const start = Date.now();

    // Load prompt templates
    const systemTpl = await loadPromptTemplate(promptPath("system.md"));
    const userTpl = await loadPromptTemplate(promptPath("user.md"));

    // Build template variables from corpus
    const claudeMd =
      corpus.files.find((f) => f.path === "CLAUDE.md")?.content ?? "(no CLAUDE.md in corpus)";
    const readmeMd =
      corpus.files.find((f) => f.path.toLowerCase() === "readme.md")?.content ??
      "(no README in corpus)";
    const gitLogText = (corpus.metadata.gitLog ?? [])
      .map((e) => {
        const date = e.date.toISOString().slice(0, 10);
        const sha = e.sha.slice(0, 7);
        return `- ${date} ${sha} ${e.subject} (${e.author})`;
      })
      .join("\n") || "(no recent commits)";

    let previousBriefing = "(no prior briefing)";
    if (corpus.metadata.rootPath) {
      const prior = await readPreviousBriefing(corpus.metadata.rootPath);
      if (prior) previousBriefing = prior;
    }

    const userPrompt = renderPromptTemplate(userTpl, {
      rootPath: corpus.metadata.rootPath ?? "(unknown)",
      capturedAt: corpus.metadata.capturedAt.toISOString(),
      gitLog: gitLogText,
      claudeMd,
      readmeMd,
      previousBriefing,
    });

    // Call the LLM
    const response = await config.provider.generate({
      model: config.model,
      system: systemTpl.body,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 2048,
      temperature: 0.3,
    });

    return {
      markdown: response.text,
      meta: {
        lensName: "nousboot",
        lensVersion: VERSION,
        model: response.model,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        costUsd: response.costUsd,
        durationMs: Date.now() - start,
        generatedAt: new Date(),
      },
    };
  },
};

export default nousboot;
export { defaultBriefingPath };
