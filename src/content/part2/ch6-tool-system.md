---
title: "Ch6: 工具系统"
description: "构建可扩展的工具框架，实现类型安全的工具定义与注册"
part: "核心篇"
order: 6
---

# Ch6: 工具系统

本章我们将构建一个类型安全、可扩展的工具系统，这是 Claude Code 的核心基础设施之一。我们将实现工具接口定义、注册中心、类型安全工厂模式，以及延迟加载机制。

## 目标

- 设计 Tool 接口与类型系统
- 实现类型安全工厂（buildTool）
- 构建工具注册中心
- 实现延迟加载机制

## Tool 接口设计

创建 `src/tools/Tool.ts`：

```typescript
import { z } from 'zod';

// 工具输入/输出类型
export type ToolInput = Record<string, any>;
export type ToolOutput = any;

// 工具进度数据
export interface ToolProgressData {
  type: string;
  [key: string]: any;
}

// 工具结果
export interface ToolResult<T = ToolOutput> {
  data: T;
  messages?: string[];
}

// 工具接口定义
export interface Tool<
  Input extends ToolInput = ToolInput,
  Output extends ToolOutput = ToolOutput,
  Progress extends ToolProgressData = ToolProgressData
> {
  // 基础信息
  name: string;
  description: string | (() => string);

  // 输入输出 Schema
  inputSchema: z.ZodSchema<Input>;

  // 执行函数
  execute(input: Input, context: ToolContext): Promise<ToolResult<Output>>;

  // 安全属性
  isReadOnly: () => boolean;
  isDestructive: () => boolean;
  isConcurrencySafe: () => boolean;

  // 可选：进度回调支持
  onProgress?: (progress: Progress) => void;
}

// 工具上下文
export interface ToolContext {
  cwd: string;
  abortSignal?: AbortSignal;
  logger: Logger;
}

export interface Logger {
  debug: (msg: string) => void;
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
}
```

## 类型安全工厂

实现 `buildTool` 工厂函数，提供 fail-closed 默认值：

```typescript
// src/tools/buildTool.ts

// 默认可选属性
const TOOL_DEFAULTS = {
  isReadOnly: () => false,
  isDestructive: () => false,
  isConcurrencySafe: () => false,
};

// 工具定义（部分属性可选）
export interface ToolDef<
  Input extends ToolInput,
  Output extends ToolOutput,
  Progress extends ToolProgressData
> {
  name: string;
  description: string | (() => string);
  inputSchema: z.ZodSchema<Input>;
  execute: (input: Input, context: ToolContext) => Promise<ToolResult<Output>>;

  // 可选安全属性
  isReadOnly?: () => boolean;
  isDestructive?: () => boolean;
  isConcurrencySafe?: () => boolean;
}

// 构建完整工具
export function buildTool<
  Input extends ToolInput,
  Output extends ToolOutput,
  Progress extends ToolProgressData
>(def: ToolDef<Input, Output, Progress>): Tool<Input, Output, Progress> {
  return {
    ...TOOL_DEFAULTS,
    ...def,
  } as Tool<Input, Output, Progress>;
}
```

## 工具注册中心

创建 `src/tools/Registry.ts`：

```typescript
import { Tool, ToolName } from './Tool.js';

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  // 注册工具
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  // 获取工具
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  // 获取所有工具
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  // 获取工具名称列表
  getNames(): string[] {
    return Array.from(this.tools.keys());
  }

  // 检查是否存在
  has(name: string): boolean {
    return this.tools.has(name);
  }
}

// 单例实例
export const toolRegistry = new ToolRegistry();
```

## 重构现有工具

使用新系统重构 ReadTool：

```typescript
// src/tools/ReadTool.ts
import { z } from 'zod';
import { buildTool } from './buildTool.js';
import fs from 'fs/promises';

const ReadInputSchema = z.object({
  file_path: z.string(),
  offset: z.number().optional(),
  limit: z.number().optional(),
});

export type ReadInput = z.infer<typeof ReadInputSchema>;

export interface ReadOutput {
  content: string;
  totalLines: number;
}

export const ReadTool = buildTool({
  name: 'Read',
  description: () => '读取文件内容，支持偏移量和行数限制',
  inputSchema: ReadInputSchema,

  isReadOnly: () => true,
  isConcurrencySafe: () => true,

  async execute(input, context) {
    context.logger.debug(`Reading file: ${input.file_path}`);

    const content = await fs.readFile(input.file_path, 'utf-8');
    const lines = content.split('\n');

    let result = content;
    if (input.offset !== undefined || input.limit !== undefined) {
      const start = input.offset || 0;
      const end = input.limit ? start + input.limit : lines.length;
      result = lines.slice(start, end).join('\n');
    }

    return {
      data: {
        content: result,
        totalLines: lines.length,
      },
    };
  },
});
```

## 延迟加载机制

实现工具延迟加载，节省上下文窗口：

```typescript
// src/tools/DeferredTool.ts

export interface DeferredTool {
  name: string;
  description: string;
  searchHint: string[];  // 搜索关键词
  load: () => Promise<Tool>;  // 动态加载
}

// 延迟工具注册表
export const deferredTools = new Map<string, DeferredTool>();

export function registerDeferredTool(deferred: DeferredTool): void {
  deferredTools.set(deferred.name, deferred);
}

// ToolSearch 工具 - 用于发现延迟加载的工具
export const ToolSearchTool = buildTool({
  name: 'ToolSearch',
  description: () => '搜索并加载可用的工具',
  inputSchema: z.object({
    query: z.string(),
  }),

  isReadOnly: () => true,

  async execute(input, context) {
    const query = input.query.toLowerCase();
    const matches: string[] = [];

    for (const [name, deferred] of deferredTools) {
      if (deferred.searchHint.some(hint => hint.includes(query))) {
        matches.push(name);
      }
    }

    return {
      data: {
        matches,
        count: matches.length,
      },
    };
  },
});
```

## 工具执行管线

创建工具执行协调器：

```typescript
// src/tools/ToolExecutor.ts

import { Tool, ToolContext, ToolResult } from './Tool.js';
import { toolRegistry } from './Registry.js';

export interface ExecuteOptions {
  timeout?: number;
  onProgress?: (progress: any) => void;
}

export class ToolExecutor {
  async execute(
    toolName: string,
    input: any,
    context: ToolContext,
    options: ExecuteOptions = {}
  ): Promise<ToolResult> {
    const tool = toolRegistry.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    // 验证输入
    const parseResult = tool.inputSchema.safeParse(input);
    if (!parseResult.success) {
      throw new Error(`Invalid input: ${parseResult.error.message}`);
    }

    // 设置超时
    const timeout = options.timeout || 30000;
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeout);

    try {
      const result = await tool.execute(parseResult.data, {
        ...context,
        abortSignal: abortController.signal,
      });

      return result;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const toolExecutor = new ToolExecutor();
```

:::scenario{title="添加自定义 Lint 工具"}
**场景**: 团队需要集成内部的 ESLint 规则检查

**实现步骤**:
1. 定义 LintTool 输入输出 Schema
2. 使用 buildTool 创建工具
3. 注册到 toolRegistry
4. AI 可以通过名称调用该工具
:::

## 工具系统初始化

```typescript
// src/tools/index.ts
import { toolRegistry } from './Registry.js';
import { ReadTool } from './ReadTool.js';
import { LSTool } from './LSTool.js';
import { GlobTool } from './GlobTool.js';
import { BashTool } from './BashTool.js';
import { EditTool } from './EditTool.js';

// 注册基础工具
export function initializeTools(): void {
  toolRegistry.register(ReadTool);
  toolRegistry.register(LSTool);
  toolRegistry.register(GlobTool);
  toolRegistry.register(BashTool);
  toolRegistry.register(EditTool);
}

export { toolRegistry, toolExecutor } from './ToolExecutor.js';
export { buildTool } from './buildTool.js';
export type { Tool, ToolContext, ToolResult } from './Tool.js';
```

## 本章小结

- ✓ Tool 接口设计（泛型支持）
- ✓ buildTool 类型安全工厂
- ✓ 工具注册中心
- ✓ 延迟加载机制
- ✓ 工具执行管线

**下一步**: [Ch7: 权限管理](/claude_from_scratch/part2/ch7-permissions.html) - 构建多层安全体系。
