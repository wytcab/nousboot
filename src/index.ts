/**
 * @wytcab/nousboot
 *
 * Pre-flight briefing lens for agentic coding sessions.
 *
 * Phase 0 stub: implements the Lens interface but returns a placeholder
 * markdown document. Real briefing logic (corpus reading, prompt scaffolding,
 * the four briefing sections) ships in Phase 1.
 *
 * The purpose of this file in Phase 0 is to validate that:
 *   1. The workspace symlink to @wytcab/projection-core works.
 *   2. The Lens interface compiles with a real implementation.
 *   3. `pnpm build` produces a valid dist/ directory.
 *
 * Copyright (c) 2026 Vilhelm Drosjer
 * MIT License.
 */

import type {
  Corpus,
  Lens,
  LensConfig,
  LensOutput,
} from "@wytcab/projection-core";

export const nousboot: Lens = {
  name: "nousboot",
  version: "0.0.1",
  description:
    "Pre-flight briefings for agentic coding sessions. Phase 0 stub.",

  async run(corpus: Corpus, config: LensConfig): Promise<LensOutput> {
    const start = Date.now();
    const fileCount = corpus.files.length;
    const rootPath = corpus.metadata.rootPath ?? "(no root path)";

    const markdown = [
      "# NousBoot",
      "",
      "_Phase 0 stub. Real briefing logic ships in Phase 1._",
      "",
      "## What this run saw",
      "",
      `- Corpus root: \`${rootPath}\``,
      `- Files in corpus: ${fileCount}`,
      `- Configured model: \`${config.model}\``,
      `- Captured at: ${corpus.metadata.capturedAt.toISOString()}`,
      "",
      "## Coming in Phase 1",
      "",
      "1. **Since last session** — what changed.",
      "2. **Likely stale** — assumptions to re-examine.",
      "3. **Blocked on you** — items needing human decision.",
      "4. **Suggested session goal** — single-sentence focus for this session.",
      "",
    ].join("\n");

    return {
      markdown,
      meta: {
        lensName: "nousboot",
        lensVersion: "0.0.1",
        model: config.model,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        durationMs: Date.now() - start,
        generatedAt: new Date(),
      },
    };
  },
};

export default nousboot;
