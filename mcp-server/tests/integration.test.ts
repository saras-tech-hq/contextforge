import { afterAll, beforeAll, describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const serverPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../dist/index.js"
);

describe("MCP SDK Integration", () => {
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
      cwd: path.dirname(serverPath),
      stderr: "pipe",
    });
    client = new Client({ name: "contextforge-vitest", version: "0.0.0" });
    await client.connect(transport);
  }, 30_000);

  afterAll(async () => {
    await client?.close();
    await transport?.close();
  });

  it("discovers html_to_markdown and fetch_web_page tools", async () => {
    const listed = await client.listTools();
    const names = listed.tools.map((t) => t.name);
    expect(names).toContain("html_to_markdown");
    expect(names).toContain("fetch_web_page");
  });

  it("executes html_to_markdown on real HTML", async () => {
    const result = await client.callTool({
      name: "html_to_markdown",
      arguments: {
        html: "<!doctype html><html><head><title>Hello</title></head><body><article><h1>Hello</h1><p>World from ContextForge.</p></article></body></html>",
        url: "https://example.com/hello",
      },
    });
    expect(result.isError).toBeFalsy();
    const texts = (result.content as { type: string; text: string }[])
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");
    expect(texts.toLowerCase()).toContain("hello");
    expect(texts).toMatch(/tokenEstimate/i);
  });

  it("returns an error for unknown tools", async () => {
    const result = await client.callTool({
      name: "not_a_real_tool",
      arguments: {},
    });
    expect(result.isError).toBe(true);
  });
});
