#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { pathToFileURL } from 'node:url';
import { createDefaultMcpCore, createDpcoMcpServer } from './adapter';

export async function startMcpServer(): Promise<void> {
  const server = createDpcoMcpServer(createDefaultMcpCore());
  await server.connect(new StdioServerTransport());
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  startMcpServer().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`DPCO MCP server failed to start: ${message}\n`);
    process.exitCode = 1;
  });
}
