---
title: "Ch12: MCP 协议"
description: "Model Context Protocol 实现，连接外部系统和数据"
part: "高级篇"
order: 12
---

# Ch12: MCP 协议

本章我们将实现 Model Context Protocol (MCP)，这是连接 Claude Code 与外部系统的标准化协议。通过 MCP，你可以让 AI 助手访问数据库、API、文件系统等外部资源。

## 目标

- 理解 MCP 协议设计
- 实现 MCP 客户端
- 构建 MCP 服务器
- 支持多种传输方式

## MCP 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      MCP Architecture                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────┐          ┌─────────────┐                  │
│   │  Claude     │◄────────►│   MCP       │                  │
│   │  Code       │          │   Client    │                  │
│   └─────────────┘          └──────┬──────┘                  │
│                                   │                          │
│                    MCP Protocol (JSON-RPC)                   │
│                                   │                          │
│   ┌───────────────────────────────┼───────────────────────┐ │
│   │                      MCP Server                        │ │
│   │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │ │
│   │  │ Tools   │  │Resources│  │ Prompts │  │ Sampling│   │ │
│   │  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │ │
│   └────────────────────────────────────────────────────────│ │
│                           │                                  │
│                    ┌──────┴──────┐                          │
│                    │  Transports │                          │
│                    │  Stdio/HTTP │                          │
│                    └─────────────┘                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## MCP 基础类型

```typescript
// src/mcp/types.ts

// MCP 协议版本
export const MCP_VERSION = '2024-11-05';

// JSON-RPC 基础消息
export interface JSONRPCMessage {
  jsonrpc: '2.0';
  id?: string | number;
}

export interface JSONRPCRequest extends JSONRPCMessage {
  method: string;
  params?: Record<string, unknown>;
}

export interface JSONRPCResponse extends JSONRPCMessage {
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// MCP Capability
export interface ServerCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { subscribe?: boolean; listChanged?: boolean };
  prompts?: { listChanged?: boolean };
  logging?: {};
  experimental?: Record<string, unknown>;
}

export interface ClientCapabilities {
  roots?: { listChanged?: boolean };
  sampling?: {};
  experimental?: Record<string, unknown>;
}

// MCP Tool
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
    resource?: MCPResourceContents;
  });
  isError?: boolean;
}

// MCP Resource
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPResourceContents {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string; // base64
}

// MCP Prompt
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface MCPPromptMessage {
  role: 'user' | 'assistant';
  content: {
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
    resource?: MCPResourceContents;
  };
}
```

## MCP 传输层

```typescript
// src/mcp/transport.ts

import { EventEmitter } from 'events';
import { JSONRPCMessage, JSONRPCRequest, JSONRPCResponse } from './types.js';

export interface MCPTransport extends EventEmitter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: JSONRPCMessage): Promise<void>;
  isConnected(): boolean;
}

// Stdio 传输
export class StdioTransport extends EventEmitter implements MCPTransport {
  private child: import('child_process').ChildProcess | null = null;
  private command: string;
  private args: string[];
  private buffer = '';

  constructor(command: string, args: string[] = []) {
    super();
    this.command = command;
    this.args = args;
  }

  async connect(): Promise<void> {
    const { spawn } = await import('child_process');
    this.child = spawn(this.command, this.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.child.stdout?.on('data', (data: Buffer) => {
      this.buffer += data.toString();
      this.processBuffer();
    });

    this.child.stderr?.on('data', (data: Buffer) => {
      this.emit('error', new Error(data.toString()));
    });

    this.child.on('close', (code) => {
      this.emit('close', code);
    });

    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.child?.stdin) {
      throw new Error('Not connected');
    }

    const data = JSON.stringify(message);
    this.child.stdin.write(data + '\n');
  }

  isConnected(): boolean {
    return this.child !== null && this.child.exitCode === null;
  }

  private processBuffer(): void {
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line) as JSONRPCMessage;
          this.emit('message', message);
        } catch (e) {
          this.emit('error', new Error(`Invalid JSON: ${line}`));
        }
      }
    }
  }
}

// HTTP 传输
export class HTTPTransport extends EventEmitter implements MCPTransport {
  private url: string;
  private headers: Record<string, string>;
  private sse: EventSource | null = null;
  private messageEndpoint = '';

  constructor(url: string, headers: Record<string, string> = {}) {
    super();
    this.url = url;
    this.headers = headers;
  }

  async connect(): Promise<void> {
    // SSE 连接用于接收服务器消息
    const { EventSource } = await import('eventsource');
    this.sse = new EventSource(this.url, {
      headers: this.headers,
    });

    this.sse.onmessage = (event) => {
      if (event.event === 'endpoint') {
        this.messageEndpoint = event.data;
      } else if (event.event === 'message') {
        try {
          const message = JSON.parse(event.data) as JSONRPCMessage;
          this.emit('message', message);
        } catch (e) {
          this.emit('error', e);
        }
      }
    };

    this.sse.onerror = (error) => {
      this.emit('error', error);
    };

    this.sse.onopen = () => {
      this.emit('connected');
    };
  }

  async disconnect(): Promise<void> {
    if (this.sse) {
      this.sse.close();
      this.sse = null;
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    const response = await fetch(this.messageEndpoint || this.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  isConnected(): boolean {
    return this.sse !== null && this.sse.readyState === 1;
  }
}
```

## MCP 客户端

```typescript
// src/mcp/Client.ts

import { EventEmitter } from 'events';
import {
  MCPTransport,
  JSONRPCRequest,
  JSONRPCResponse,
  ClientCapabilities,
  ServerCapabilities,
  MCPTool,
  MCPToolResult,
  MCPResource,
  MCPResourceContents,
  MCPPrompt,
  MCPPromptMessage,
} from './types.js';

export interface MCPClientOptions {
  name: string;
  version: string;
  capabilities?: ClientCapabilities;
}

export class MCPClient extends EventEmitter {
  private transport: MCPTransport;
  private options: MCPClientOptions;
  private requestId = 0;
  private pendingRequests = new Map<string, (response: JSONRPCResponse) => void>();
  private serverCapabilities: ServerCapabilities | null = null;
  private isConnected = false;

  constructor(transport: MCPTransport, options: MCPClientOptions) {
    super();
    this.transport = transport;
    this.options = options;

    this.transport.on('message', (message) => this.handleMessage(message));
    this.transport.on('error', (error) => this.emit('error', error));
    this.transport.on('close', () => {
      this.isConnected = false;
      this.emit('close');
    });
  }

  async connect(): Promise<void> {
    await this.transport.connect();

    // 初始化握手
    const result = await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: this.options.capabilities || {},
      clientInfo: {
        name: this.options.name,
        version: this.options.version,
      },
    });

    this.serverCapabilities = result.capabilities as ServerCapabilities;
    this.isConnected = true;

    // 发送初始化完成通知
    await this.notify('initialized', {});

    this.emit('connected', this.serverCapabilities);
  }

  async disconnect(): Promise<void> {
    await this.transport.disconnect();
    this.isConnected = false;
  }

  // 列出可用工具
  async listTools(): Promise<MCPTool[]> {
    const result = await this.request('tools/list', {});
    return (result.tools as MCPTool[]) || [];
  }

  // 调用工具
  async callTool(name: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    return await this.request('tools/call', {
      name,
      arguments: args,
    }) as MCPToolResult;
  }

  // 列出资源
  async listResources(): Promise<MCPResource[]> {
    const result = await this.request('resources/list', {});
    return (result.resources as MCPResource[]) || [];
  }

  // 读取资源
  async readResource(uri: string): Promise<MCPResourceContents[]> {
    return await this.request('resources/read', { uri }) as MCPResourceContents[];
  }

  // 列出提示模板
  async listPrompts(): Promise<MCPPrompt[]> {
    const result = await this.request('prompts/list', {});
    return (result.prompts as MCPPrompt[]) || [];
  }

  // 获取提示
  async getPrompt(name: string, args?: Record<string, string>): Promise<{
    description?: string;
    messages: MCPPromptMessage[];
  }> {
    return await this.request('prompts/get', {
      name,
      arguments: args,
    }) as {
      description?: string;
      messages: MCPPromptMessage[];
    };
  }

  private async request(method: string, params: unknown): Promise<unknown> {
    if (!this.isConnected) {
      throw new Error('Not connected');
    }

    const id = String(++this.requestId);

    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params: params as Record<string, unknown>,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, 30000);

      this.pendingRequests.set(id, (response) => {
        clearTimeout(timeout);

        if (response.error) {
          reject(new Error(`${response.error.message} (${response.error.code})`));
        } else {
          resolve(response.result);
        }
      });

      this.transport.send(request).catch(reject);
    });
  }

  private async notify(method: string, params: unknown): Promise<void> {
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      method,
      params: params as Record<string, unknown>,
    };

    await this.transport.send(request);
  }

  private handleMessage(message: JSONRPCResponse): void {
    if (message.id !== undefined && this.pendingRequests.has(String(message.id))) {
      const handler = this.pendingRequests.get(String(message.id))!;
      this.pendingRequests.delete(String(message.id));
      handler(message);
    }
  }
}
```

## MCP 服务器基础

```typescript
// src/mcp/Server.ts

import { EventEmitter } from 'events';
import {
  MCPTransport,
  JSONRPCRequest,
  JSONRPCResponse,
  ServerCapabilities,
  MCPTool,
  MCPToolResult,
  MCPResource,
  MCPPrompt,
  MCPPromptMessage,
} from './types.js';

export interface MCPServerOptions {
  name: string;
  version: string;
  capabilities?: ServerCapabilities;
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<MCPToolResult>;
export type ResourceHandler = (uri: string) => Promise<{
  mimeType?: string;
  text?: string;
  blob?: string;
}>;
export type PromptHandler = (args: Record<string, string> | undefined) => Promise<{
  description?: string;
  messages: MCPPromptMessage[];
}>;

export class MCPServer extends EventEmitter {
  private transport: MCPTransport;
  private options: MCPServerOptions;
  private tools = new Map<string, { tool: MCPTool; handler: ToolHandler }>();
  private resources = new Map<string, { resource: MCPResource; handler: ResourceHandler }>();
  private prompts = new Map<string, { prompt: MCPPrompt; handler: PromptHandler }>();

  constructor(transport: MCPTransport, options: MCPServerOptions) {
    super();
    this.transport = transport;
    this.options = options;

    this.transport.on('message', (message) => this.handleRequest(message));
    this.transport.on('error', (error) => this.emit('error', error));
  }

  async start(): Promise<void> {
    await this.transport.connect();
    this.emit('started');
  }

  async stop(): Promise<void> {
    await this.transport.disconnect();
    this.emit('stopped');
  }

  // 注册工具
  registerTool(tool: MCPTool, handler: ToolHandler): void {
    this.tools.set(tool.name, { tool, handler });
  }

  // 注册资源
  registerResource(resource: MCPResource, handler: ResourceHandler): void {
    this.resources.set(resource.uri, { resource, handler });
  }

  // 注册提示
  registerPrompt(prompt: MCPPrompt, handler: PromptHandler): void {
    this.prompts.set(prompt.name, { prompt, handler });
  }

  private async handleRequest(request: JSONRPCRequest): Promise<void> {
    const { method, params, id } = request;
    let result: unknown;
    let error: { code: number; message: string } | undefined;

    try {
      switch (method) {
        case 'initialize':
          result = {
            protocolVersion: '2024-11-05',
            capabilities: this.options.capabilities || {},
            serverInfo: {
              name: this.options.name,
              version: this.options.version,
            },
          };
          break;

        case 'tools/list':
          result = { tools: Array.from(this.tools.values()).map(t => t.tool) };
          break;

        case 'tools/call': {
          const { name, arguments: args } = params as { name: string; arguments: Record<string, unknown> };
          const tool = this.tools.get(name);
          if (!tool) {
            throw new Error(`Tool not found: ${name}`);
          }
          result = await tool.handler(args);
          break;
        }

        case 'resources/list':
          result = { resources: Array.from(this.resources.values()).map(r => r.resource) };
          break;

        case 'resources/read': {
          const { uri } = params as { uri: string };
          const resource = this.resources.get(uri);
          if (!resource) {
            throw new Error(`Resource not found: ${uri}`);
          }
          const contents = await resource.handler(uri);
          result = { contents };
          break;
        }

        case 'prompts/list':
          result = { prompts: Array.from(this.prompts.values()).map(p => p.prompt) };
          break;

        case 'prompts/get': {
          const { name, arguments: args } = params as { name: string; arguments: Record<string, string> };
          const prompt = this.prompts.get(name);
          if (!prompt) {
            throw new Error(`Prompt not found: ${name}`);
          }
          result = await prompt.handler(args);
          break;
        }

        default:
          error = { code: -32601, message: `Method not found: ${method}` };
      }
    } catch (e) {
      error = { code: -32603, message: e instanceof Error ? e.message : 'Internal error' };
    }

    // 发送响应
    if (id !== undefined) {
      const response: JSONRPCResponse = {
        jsonrpc: '2.0',
        id,
        ...(error ? { error } : { result }),
      };

      await this.transport.send(response);
    }
  }
}
```

## 示例：数据库 MCP 服务器

```typescript
// examples/mcp-database-server.ts

import { MCPServer } from '../src/mcp/Server.js';
import { StdioTransport } from '../src/mcp/transport.js';
import sqlite3 from 'sqlite3';

// 创建数据库 MCP 服务器
async function createDatabaseServer(dbPath: string) {
  const db = new sqlite3.Database(dbPath);

  const transport = new StdioTransport('node', ['-']);
  const server = new MCPServer(transport, {
    name: 'sqlite-server',
    version: '1.0.0',
    capabilities: {
      tools: {},
      resources: {},
    },
  });

  // 注册查询工具
  server.registerTool(
    {
      name: 'query',
      description: 'Execute a SQL query on the database',
      inputSchema: {
        type: 'object',
        properties: {
          sql: { type: 'string', description: 'SQL query to execute' },
        },
        required: ['sql'],
      },
    },
    async (args) => {
      const { sql } = args;

      try {
        const rows = await new Promise((resolve, reject) => {
          db.all(sql, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(rows, null, 2),
          }],
        };
      } catch (e) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
          }],
          isError: true,
        };
      }
    }
  );

  // 注册表结构资源
  server.registerResource(
    {
      uri: 'database://schema',
      name: 'Database Schema',
      description: 'Current database schema',
      mimeType: 'application/json',
    },
    async () => {
      const tables = await new Promise((resolve, reject) => {
        db.all(
          "SELECT name, sql FROM sqlite_master WHERE type='table'",
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });

      return {
        mimeType: 'application/json',
        text: JSON.stringify(tables, null, 2),
      };
    }
  );

  return server;
}

// 启动服务器
const dbPath = process.argv[2] || ':memory:';
createDatabaseServer(dbPath).then(server => {
  server.start();
  console.error(`Database MCP server started: ${dbPath}`);
});
```

## 在 Claude Code 中使用 MCP

```typescript
// src/mcp/Integration.ts

import { MCPClient } from './Client.js';
import { toolRegistry } from '../tools/Registry.js';
import { buildTool } from '../tools/buildTool.js';
import { z } from 'zod';

export interface MCPConnectionConfig {
  name: string;
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
}

export class MCPIntegration {
  private clients = new Map<string, MCPClient>();

  async connect(config: MCPConnectionConfig): Promise<void> {
    let transport;

    if (config.command) {
      const { StdioTransport } = await import('./transport.js');
      transport = new StdioTransport(config.command, config.args || []);
    } else if (config.url) {
      const { HTTPTransport } = await import('./transport.js');
      transport = new HTTPTransport(config.url, config.headers || {});
    } else {
      throw new Error('Must specify either command or url');
    }

    const client = new MCPClient(transport, {
      name: 'claude-code',
      version: '1.0.0',
      capabilities: {
        roots: { listChanged: true },
      },
    });

    await client.connect();
    this.clients.set(config.name, client);

    // 注册 MCP 工具到本地工具系统
    await this.registerMCPTools(config.name, client);
  }

  private async registerMCPTools(serverName: string, client: MCPClient): Promise<void> {
    const tools = await client.listTools();

    for (const mcpTool of tools) {
      // 创建本地工具包装
      const tool = buildTool({
        name: `${serverName}.${mcpTool.name}`,
        description: () => mcpTool.description || mcpTool.name,
        inputSchema: z.object(
          Object.fromEntries(
            Object.entries(mcpTool.inputSchema.properties || {}).map(([k, v]) => [
              k,
              z.any(), // 简化处理
            ])
          )
        ),
        isReadOnly: () => false, // 默认假设非只读

        execute: async (input) => {
          const result = await client.callTool(mcpTool.name, input);

          return {
            data: result.content.map(c => c.text).join('\n'),
          };
        },
      });

      toolRegistry.register(tool);
    }
  }

  async disconnect(name: string): Promise<void> {
    const client = this.clients.get(name);
    if (client) {
      await client.disconnect();
      this.clients.delete(name);
    }
  }

  async disconnectAll(): Promise<void> {
    for (const [name, client] of this.clients) {
      await client.disconnect();
    }
    this.clients.clear();
  }
}

// 配置文件示例
const mcpConfig = {
  servers: [
    {
      name: 'database',
      command: 'node',
      args: ['./mcp-database-server.ts', './app.db'],
    },
    {
      name: 'filesystem',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/home/user/projects'],
    },
  ],
};
```

## 本章小结

- ✓ MCP 协议理解（JSON-RPC）
- ✓ MCP 客户端实现
- ✓ MCP 服务器实现
- ✓ 传输层（Stdio/HTTP）
- ✓ 与工具系统集成

**下一步**: [Ch13: 企业部署](/claude_from_scratch/part3/ch13-enterprise-deployment.html) - 私有化部署与运维方案。
