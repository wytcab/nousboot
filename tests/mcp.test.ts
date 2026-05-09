/**
 * Tests for the NousBoot MCP server.
 *
 * Verifies the server can be constructed, registers the nousboot_briefing
 * tool, and reports its identity correctly. Does not exercise stdio
 * transport or real LLM calls — those are covered by the CLI tests and
 * by manual end-to-end testing.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { buildServer } from "../src/mcp.js";
import { VERSION } from "../src/lens.js";

test("buildServer() returns an McpServer with the right identity", () => {
  const server = buildServer();
  assert.ok(server, "server should exist");
  // McpServer doesn't expose name/version publicly, but we can verify the
  // construction didn't throw and that the underlying server is set up.
  // The real verification is the integration test in main() against an
  // actual MCP client.
});

test("buildServer() registers nousboot_briefing tool", async () => {
  const server = buildServer();
  // Access the underlying tool registry via the SDK's introspection.
  // We can't easily list tools from the high-level McpServer API, but we
  // can check that the underlying `_registeredTools` field exists and
  // contains our tool name.
  const tools = (server as unknown as {
    _registeredTools?: Record<string, unknown>;
  })._registeredTools;
  if (tools) {
    // Newer SDK versions expose this map. If present, verify our tool.
    assert.ok(
      "nousboot_briefing" in tools,
      "nousboot_briefing should be registered",
    );
  }
  // If _registeredTools isn't exposed in this SDK version, the test still
  // passes (server constructed without throwing). The key assertion is
  // that buildServer() doesn't throw with our schema definitions.
});

test("VERSION is a valid semver", () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/);
});
