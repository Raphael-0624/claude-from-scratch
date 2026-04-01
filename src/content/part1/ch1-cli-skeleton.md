---
title: "Ch1: 搭建骨架"
description: "创建 CLI 框架、配置系统，完成第一次运行"
part: "基础篇"
order: 1
---

# Ch1: 搭建骨架

本章我们将创建项目的骨架。不要小看骨架——好的骨架支撑起整个建筑，好的项目结构支撑起后续所有功能的扩展。我们将初始化 Node.js 项目、设置 TypeScript、创建 CLI 入口，最终得到一个能运行的命令行程序。

## 本章目标

- 理解为什么 CLI 是 AI 编程助手的最佳形态
- 掌握 TypeScript + Node.js 项目初始化
- 创建一个可扩展的 CLI 框架
- 实现基础的配置系统

---

## 为什么选择 CLI？

在开始编码之前，让我们思考一个问题：**为什么 Claude Code 选择 CLI 而非 GUI？**

<div class="why-section">
<h4>设计思考</h4>
<p>CLI（命令行界面）是开发者的母语。当你说"帮我查看 src/index.ts 的第 10-20 行"，CLI 可以直接执行。更重要的是，CLI 天然支持脚本化、自动化和远程部署——这些都是企业级工具的核心需求。</p>
</div>

CLI 的优势：
- **快速启动** — 无需等待 Electron 或浏览器加载
- **低资源占用** — 适合在远程服务器或容器中运行
- **开发者友好** — 与现有工具链（Git、Docker、CI/CD）无缝集成
- **自动化就绪** — 易于脚本化和批处理

---

## 项目初始化

### 第一步：创建目录结构

一个好的项目结构应该让代码的意图一目了然。我们采用按功能分层的方式：

```
my-ai-coder/
├── src/
│   ├── index.ts          # CLI 入口
│   ├── commands/         # 命令实现
│   ├── config/           # 配置管理
│   └── types/            # 类型定义
├── dist/                 # 编译输出
├── config.json           # 用户配置
└── package.json
```

<div class="section-intro">
<h4>为什么是这种结构？</h4>
<p>按功能组织而非按类型组织。当项目变大时，你会发现"找配置相关代码"比"找所有 TypeScript 文件"更容易。</p>
</div>

### 第二步：初始化 Node.js 项目

```bash
mkdir my-ai-coder
cd my-ai-coder
npm init -y
```

### 第三步：安装依赖

```bash
npm install typescript tsx @types/node --save-dev
npm install commander chalk
```

**依赖说明：**
- `commander` — 业界标准的 CLI 框架，Express.js 也在用
- `chalk` — 让终端输出带颜色，提升可读性
- `tsx` — 开发时直接运行 TypeScript，无需等待编译

---

## TypeScript 配置

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
  }
}
```

<div class="section-intro">
<h4>关键配置解读</h4>
<p><code>module: "NodeNext"</code> 启用 ES 模块，这是现代 Node.js 项目的标准。<code>strict: true</code> 开启严格类型检查——在 AI 编程助手这种复杂系统中，类型就是文档。</p>
</div>

---

## 创建 CLI 入口

CLI 入口是用户与系统交互的第一道门。我们需要：
1. 解析命令行参数
2. 显示帮助信息
3. 路由到对应的命令处理函数

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

<div class="section-intro">
<h4>代码解析</h4>
<p>第一行 <code>#!/usr/bin/env node</code> 是 Shebang，让系统知道用 Node.js 执行这个文件。<code>Command</code> 是 Commander 的核心类，负责解析命令行参数。</p>
</div>

### 添加到 package.json

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

`bin` 字段让 npm 知道如何全局安装你的 CLI。

---

## 运行测试

开发模式运行：

```bash
npm run dev chat
```

预期输出：

```
🤖 你好！我是你的 AI 编程助手。
提示: 输入 exit 退出
```

---

## 配置系统基础

一个可配置的 CLI 才能适应不同场景。我们实现一个简单的 JSON 配置：

创建 `src/config/index.ts`：

```typescript
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface Config {
  apiKey?: string;
  model: string;
  verbose: boolean;
}

const defaultConfig: Config = {
  model: 'claude-sonnet-4-6',
  verbose: false,
};

export async function loadConfig(): Promise<Config> {
  const configPath = path.join(os.homedir(), '.my-ai-coder.json');

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const userConfig = JSON.parse(content);
    return { ...defaultConfig, ...userConfig };
  } catch {
    return defaultConfig;
  }
}
```

<div class="why-section">
<h4>为什么放在 home 目录？</h4>
<p>遵循 Unix 惯例，用户级配置放在 <code>~/.config/</code> 或 <code>~/.name</code>。这样项目目录保持干净，配置也不会被意外提交到 Git。</p>
</div>

---

## 本章小结

我们完成了：
- ✅ Node.js + TypeScript 项目初始化
- ✅ CLI 框架搭建
- ✅ 基础配置系统
- ✅ 第一次运行

<div class="chapter-overview">
<h3>下一步</h3>
<ul>
<li><a href="/claude_from_scratch/part1/ch2-llm-connection.html">Ch2: 连接大脑</a> — 接入 LLM API，实现真正的对话</li>
</ul>
</div>
