---
title: "Ch1: 搭建骨架"
description: "创建 CLI 框架、配置系统，完成第一次运行"
part: "基础篇"
order: 1
---

# Ch1: 搭建骨架

本章我们将创建项目的骨架：初始化 Node.js 项目、设置 TypeScript、创建 CLI 入口、实现基础配置系统，最终得到一个能显示欢迎消息的 CLI 程序。

## 目标

- 初始化 Node.js + TypeScript 项目
- 创建 CLI 入口文件
- 实现基础配置系统
- 第一次运行程序

## 项目初始化

创建项目目录并初始化：

```bash
mkdir my-ai-coder
cd my-ai-coder
npm init -y
```

安装 TypeScript 和基础依赖：

```bash
npm install typescript tsx @types/node --save-dev
npm install commander chalk
```

创建 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

## 创建 CLI 入口

创建 `src/index.ts`：

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';

const program = new Command();

program
  .name('my-ai-coder')
  .description('AI 编程助手')
  .version('1.0.0');

program
  .command('chat')
  .description('开始对话')
  .action(() => {
    console.log(chalk.cyan('🤖 你好！我是你的 AI 编程助手。'));
    console.log(chalk.gray('提示: 输入 exit 退出'));
  });

program.parse();
```

更新 `package.json` 添加 bin 入口：

```json
{
  "bin": {
    "my-ai-coder": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts"
  }
}
```

## 运行测试

```bash
npm run dev chat
```

预期输出：

```
🤖 你好！我是你的 AI 编程助手。
提示: 输入 exit 退出
```

:::scenario{title="初始化项目配置"}
**用户场景**: 第一次运行程序

**系统需要**:
- 检测配置文件是否存在
- 引导用户输入 API Key
- 保存配置到本地
:::

## 配置系统

创建 `src/config.ts`：

```typescript
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.my-ai-coder');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface Config {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export async function loadConfig(): Promise<Config> {
  try {
    const content = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}
```

## 配置初始化流程

修改 `src/index.ts`：

```typescript
import { loadConfig, saveConfig } from './config.js';
import readline from 'readline';

async function initConfig() {
  const config = await loadConfig();

  if (!config.apiKey) {
    console.log(chalk.yellow('首次使用，请配置 API Key'));

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const apiKey = await new Promise<string>((resolve) => {
      rl.question('请输入 OpenAI API Key: ', (answer) => {
        resolve(answer.trim());
        rl.close();
      });
    });

    await saveConfig({ apiKey, model: 'gpt-4' });
    console.log(chalk.green('✓ 配置已保存'));
  }
}

// 在 chat command 中调用
program
  .command('chat')
  .description('开始对话')
  .action(async () => {
    await initConfig();
    console.log(chalk.cyan('🤖 你好！我是你的 AI 编程助手。'));
  });
```

## 本章小结

本章我们完成了：
- ✓ Node.js + TypeScript 项目初始化
- ✓ CLI 框架搭建（Commander.js）
- ✓ 基础配置系统（文件读写）
- ✓ 首次运行配置引导

**下一步**: [Ch2: 连接大脑](/claude_from_scratch/part1/ch2-llm-connection.html) - 接入 LLM API，实现真正的对话功能。
