---
title: "Ch3: 读取世界"
description: "实现文件系统操作，让 AI 能读取项目文件"
part: "基础篇"
order: 3
---

# Ch3: 读取世界

本章我们将实现文件系统操作工具，让 AI 能够读取文件、列出目录、搜索文件内容。

## 目标

- 实现文件读取
- 实现目录列表
- 实现 Glob 搜索
- 集成到对话中

## 文件读取工具

创建 `src/tools/ReadTool.ts`：

```typescript
import fs from 'fs/promises';
import path from 'path';

export interface ReadInput {
  file_path: string;
  offset?: number;
  limit?: number;
}

export interface ReadOutput {
  content: string;
  totalLines: number;
}

export class ReadTool {
  name = 'Read';
  description = '读取文件内容';

  async execute(input: ReadInput): Promise<ReadOutput> {
    const content = await fs.readFile(input.file_path, 'utf-8');
    const lines = content.split('\n');

    let result = content;
    if (input.offset !== undefined || input.limit !== undefined) {
      const start = input.offset || 0;
      const end = input.limit ? start + input.limit : lines.length;
      result = lines.slice(start, end).join('\n');
    }

    return {
      content: result,
      totalLines: lines.length
    };
  }
}
```

## 目录列表工具

创建 `src/tools/LSTool.ts`：

```typescript
import fs from 'fs/promises';
import path from 'path';

export interface LSInput {
  directory: string;
}

export interface LSEntry {
  name: string;
  type: 'file' | 'directory';
  size?: number;
}

export class LSTool {
  name = 'LS';
  description = '列出目录内容';

  async execute(input: LSInput): Promise<LSEntry[]> {
    const entries = await fs.readdir(input.directory, { withFileTypes: true });

    return Promise.all(
      entries.map(async (entry) => {
        const result: LSEntry = {
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file'
        };

        if (entry.isFile()) {
          const stat = await fs.stat(path.join(input.directory, entry.name));
          result.size = stat.size;
        }

        return result;
      })
    );
  }
}
```

## Glob 搜索工具

```typescript
// src/tools/GlobTool.ts
import { glob } from 'glob';

export interface GlobInput {
  pattern: string;
}

export class GlobTool {
  name = 'Glob';
  description = '搜索匹配模式的文件';

  async execute(input: GlobInput): Promise<string[]> {
    return glob(input.pattern, { absolute: true });
  }
}
```

:::scenario{title="查看项目结构"}
**用户说**: "这个项目有哪些文件？"

**系统响应**:
1. 调用 LSTool 列出根目录
2. 显示目录结构
3. 询问是否需要查看特定文件
:::

## 工具系统集成

创建 `src/tools/index.ts`：

```typescript
import { ReadTool } from './ReadTool.js';
import { LSTool } from './LSTool.js';
import { GlobTool } from './GlobTool.js';

export const tools = {
  Read: new ReadTool(),
  LS: new LSTool(),
  Glob: new GlobTool()
};

export type ToolName = keyof typeof tools;
```

## 让 AI 使用工具

修改 `src/chat.ts`：

```typescript
import { tools, ToolName } from './tools/index.js';

const TOOL_PROMPT = `你可以使用以下工具：
- Read(file_path: string): 读取文件内容
- LS(directory: string): 列出目录内容
- Glob(pattern: string): 搜索文件

如需使用工具，请回复 JSON 格式：
{"tool": "ToolName", "input": {...}}`;

export class ChatSession {
  constructor(private provider: LLMProvider) {
    this.messages.push({
      role: 'system',
      content: TOOL_PROMPT
    });
  }

  private async handleToolCall(toolName: string, input: any): Promise<string> {
    const tool = tools[toolName as ToolName];
    if (!tool) return `未知工具: ${toolName}`;

    try {
      const result = await tool.execute(input);
      return JSON.stringify(result, null, 2);
    } catch (err) {
      return `执行失败: ${err}`;
    }
  }
}
```

## 本章小结

- ✓ ReadTool - 文件读取
- ✓ LSTool - 目录列表
- ✓ GlobTool - 文件搜索
- ✓ 工具系统集成到对话

**下一步**: [Ch4: 执行命令](/claude_from_scratch/part1/ch4-bash-execution.html) - 实现 Bash 命令执行。
