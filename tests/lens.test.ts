/**
 * NousBoot fixture tests.
 *
 * Runs the lens end-to-end against a synthetic corpus with a mock provider.
 * No real LLM API calls; the mock provider returns a fixed response so
 * we can assert on the entire pipeline (corpus reading, prompt rendering,
 * lens.run() invocation, output shape) without requiring DEEPSEEK_API_KEY.
 *
 * Run: pnpm test
 */

import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type Corpus,
  type ProviderHandle,
  type ProviderRequest,
  type ProviderResponse,
  validateOutput,
  serializeOutput,
} from "@wytcab/projection-core";

import { nousboot } from "../src/lens.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE = path.join(__dirname, "fixtures", "synthetic");

/**
 * A mock provider that records the request and returns a canned response.
 * Used to assert what the lens sends to the LLM without needing real network.
 */
function makeMockProvider(): {
  provider: ProviderHandle;
  requests: ProviderRequest[];
} {
  const requests: ProviderRequest[] = [];
  const provider: ProviderHandle = {
    async generate(req: ProviderRequest): Promise<ProviderResponse> {
      requests.push(req);
      const text = [
        "## Since last session",
        "- (mock response)",
        "",
        "## Likely stale",
        "- (mock response)",
        "",
        "## Blocked on you",
        "- (mock response)",
        "",
        "## Suggested session goal",
        "(mock response)",
      ].join("\n");
      return {
        text,
        inputTokens: 1234,
        outputTokens: 56,
        costUsd: 0.0001,
        model: req.model,
        durationMs: 42,
      };
    },
  };
  return { provider, requests };
}

/**
 * Build a synthetic Corpus that mimics what readCorpus would produce
 * for a real project (with git log, etc.) but with deterministic content.
 */
function makeSyntheticCorpus(): Corpus {
  return {
    files: [
      {
        path: "README.md",
        content: "# synthetic-project\n\nA synthetic test fixture.\n",
      },
      {
        path: "CLAUDE.md",
        content:
          "# synthetic-project — agent context\n\nTODO: pick a logging library.\n\nBLOCKED: waiting on Vilhelm.\n",
      },
    ],
    metadata: {
      rootPath: FIXTURE,
      capturedAt: new Date("2026-05-06T20:00:00Z"),
      gitLog: [
        {
          sha: "abc1234567890abcdef1234567890abcdef12345",
          author: "Vilhelm Drosjer",
          date: new Date("2026-05-06T18:00:00Z"),
          subject: "Add auth scaffolding",
        },
        {
          sha: "def4567890abcdef1234567890abcdef12345678",
          author: "Vilhelm Drosjer",
          date: new Date("2026-05-05T15:30:00Z"),
          subject: "Initial commit",
        },
      ],
    },
  };
}

// =============================================================================
// Tests
// =============================================================================

test("lens identity: name, version, description", () => {
  assert.equal(nousboot.name, "nousboot");
  assert.match(nousboot.version, /^\d+\.\d+\.\d+$/);
  assert.ok(nousboot.description.length > 0);
});

test("validate() accepts a valid corpus", async () => {
  const corpus = makeSyntheticCorpus();
  const { provider } = makeMockProvider();
  await nousboot.validate?.(corpus, { provider, model: "deepseek-v4-flash" });
});

test("validate() rejects corpus with no README and no CLAUDE.md", async () => {
  const corpus: Corpus = {
    files: [{ path: "package.json", content: "{}" }],
    metadata: {
      capturedAt: new Date(),
      gitLog: [
        {
          sha: "a".repeat(40),
          author: "Test",
          date: new Date(),
          subject: "init",
        },
      ],
    },
  };
  const { provider } = makeMockProvider();
  await assert.rejects(
    async () => {
      await nousboot.validate!(corpus, { provider, model: "deepseek-v4-flash" });
    },
    /missing both README/i,
  );
});

test("validate() rejects corpus with no git log", async () => {
  const corpus: Corpus = {
    files: [{ path: "README.md", content: "# x" }],
    metadata: { capturedAt: new Date() },
  };
  const { provider } = makeMockProvider();
  await assert.rejects(
    async () => {
      await nousboot.validate!(corpus, { provider, model: "deepseek-v4-flash" });
    },
    /no git log/i,
  );
});

test("run() produces valid LensOutput shape", async () => {
  const corpus = makeSyntheticCorpus();
  const { provider } = makeMockProvider();
  const output = await nousboot.run(corpus, {
    provider,
    model: "deepseek-v4-flash",
  });
  validateOutput(output);
  assert.equal(output.meta.lensName, "nousboot");
  assert.equal(output.meta.model, "deepseek-v4-flash");
  assert.equal(output.meta.inputTokens, 1234);
  assert.equal(output.meta.outputTokens, 56);
});

test("run() sends system prompt and user prompt to provider", async () => {
  const corpus = makeSyntheticCorpus();
  const { provider, requests } = makeMockProvider();
  await nousboot.run(corpus, { provider, model: "deepseek-v4-flash" });
  assert.equal(requests.length, 1);
  const req = requests[0];
  assert.ok(req, "expected one request");
  assert.equal(req.model, "deepseek-v4-flash");
  assert.ok(req.system, "system prompt should be set");
  assert.match(req.system!, /You are NousBoot/);
  assert.equal(req.messages.length, 1);
  assert.equal(req.messages[0]?.role, "user");
});

test("run() includes corpus content in user prompt", async () => {
  const corpus = makeSyntheticCorpus();
  const { provider, requests } = makeMockProvider();
  await nousboot.run(corpus, { provider, model: "deepseek-v4-flash" });
  const req = requests[0];
  const userContent = req?.messages[0]?.content ?? "";
  // Verify the user prompt contains corpus-derived data
  assert.match(userContent, /synthetic-project/, "should include README content");
  assert.match(userContent, /TODO: pick a logging library/, "should include CLAUDE.md content");
  assert.match(userContent, /abc1234/, "should include short SHA from git log");
  assert.match(userContent, /Add auth scaffolding/, "should include commit subjects");
});

test("serializeOutput() produces frontmatter + body", async () => {
  const corpus = makeSyntheticCorpus();
  const { provider } = makeMockProvider();
  const output = await nousboot.run(corpus, {
    provider,
    model: "deepseek-v4-flash",
  });
  const serialized = serializeOutput(output);
  assert.match(serialized, /^---\n/, "starts with frontmatter delimiter");
  assert.match(serialized, /\nlens: nousboot\n/);
  assert.match(serialized, /\nmodel: deepseek-v4-flash\n/);
  assert.match(serialized, /\n## Since last session\n/);
});
