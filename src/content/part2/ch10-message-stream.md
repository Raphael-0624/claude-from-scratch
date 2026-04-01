---
title: "Ch10: 消息流与 UI"
description: "实现流式消息渲染、进度反馈和流畅的用户交互体验"
part: "核心篇"
order: 10
---

# Ch10: 消息流与 UI

本章我们将构建流式消息渲染系统，实现流畅的用户交互体验。从流式输出到富文本渲染，从进度反馈到交互式组件，打造专业级的 CLI 界面。

## 目标

- 实现流式消息渲染
- 构建进度反馈系统
- 支持富文本和代码高亮
- 实现交互式组件（确认、选择、输入）

## 消息流架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Message Stream                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  LLM Output ──→ Token Stream ──→ Renderer ──→ Terminal      │
│       ↓              ↓              ↓              ↓          │
│   ┌───────┐     ┌───────┐     ┌───────┐     ┌───────┐      │
│   │Chunk  │     │Buffer │     │Parser │     │ANSI   │      │
│   └───────┘     └───────┘     └───────┘     └───────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 消息类型定义

```typescript
// src/ui/messages/types.ts

export enum MessageType {
  TEXT = 'text',
  CODE = 'code',
  TOOL_CALL = 'tool_call',
  TOOL_RESULT = 'tool_result',
  THINKING = 'thinking',
  ERROR = 'error',
  PROGRESS = 'progress',
  MARKDOWN = 'markdown',
}

export interface BaseMessage {
  id: string;
  type: MessageType;
  timestamp: number;
}

export interface TextMessage extends BaseMessage {
  type: MessageType.TEXT;
  content: string;
}

export interface CodeMessage extends BaseMessage {
  type: MessageType.CODE;
  content: string;
  language: string;
  filePath?: string;
  lineNumbers?: boolean;
}

export interface ToolCallMessage extends BaseMessage {
  type: MessageType.TOOL_CALL;
  toolName: string;
  input: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'error';
}

export interface ToolResultMessage extends BaseMessage {
  type: MessageType.TOOL_RESULT;
  toolName: string;
  result: any;
  error?: string;
  duration: number;
}

export interface ThinkingMessage extends BaseMessage {
  type: MessageType.THINKING;
  content: string;
  isStreaming: boolean;
}

export interface ProgressMessage extends BaseMessage {
  type: MessageType.PROGRESS;
  progress: number; // 0-100
  message: string;
  detail?: string;
}

export type Message =
  | TextMessage
  | CodeMessage
  | ToolCallMessage
  | ToolResultMessage
  | ThinkingMessage
  | ProgressMessage;
```

## 流式渲染器

```typescript
// src/ui/StreamRenderer.ts

import { EventEmitter } from 'events';
import { Message, MessageType, ThinkingMessage } from './messages/types.js';

export interface RenderOptions {
  streaming?: boolean;
  syntaxHighlight?: boolean;
  emoji?: boolean;
  width?: number;
}

export class StreamRenderer extends EventEmitter {
  private options: RenderOptions;
  private buffer: string = '';
  private isStreaming: boolean = false;

  constructor(options: RenderOptions = {}) {
    super();
    this.options = {
      streaming: true,
      syntaxHighlight: true,
      emoji: true,
      width: process.stdout.columns || 80,
      ...options,
    };
  }

  // 开始流式输出
  startStream(): void {
    this.isStreaming = true;
    this.buffer = '';
    this.emit('streamStart');
  }

  // 写入流式数据
  writeChunk(chunk: string): void {
    if (!this.isStreaming) {
      throw new Error('Stream not started');
    }

    this.buffer += chunk;

    // 实时渲染
    if (this.options.streaming) {
      process.stdout.write(chunk);
    }

    this.emit('chunk', chunk);
  }

  // 结束流式输出
  endStream(): string {
    this.isStreaming = false;
    const content = this.buffer;
    this.buffer = '';
    this.emit('streamEnd', content);
    return content;
  }

  // 渲染完整消息
  render(message: Message): string {
    switch (message.type) {
      case MessageType.TEXT:
        return this.renderText(message.content);

      case MessageType.CODE:
        return this.renderCode(message);

      case MessageType.TOOL_CALL:
        return this.renderToolCall(message);

      case MessageType.TOOL_RESULT:
        return this.renderToolResult(message);

      case MessageType.THINKING:
        return this.renderThinking(message);

      case MessageType.PROGRESS:
        return this.renderProgress(message);

      default:
        return String(message);
    }
  }

  private renderText(content: string): string {
    return this.wrap(content);
  }

  private renderCode(message: CodeMessage): string {
    const lines: string[] = [];

    // 文件头
    if (message.filePath) {
      lines.push(this.style(`┌── ${message.filePath} ──`, 'dim'));
    } else {
      lines.push(this.style(`┌── ${message.language} ──`, 'dim'));
    }

    // 代码内容
    const codeLines = message.content.split('\n');
    codeLines.forEach((line, i) => {
      const lineNum = message.lineNumbers ? String(i + 1).padStart(4, ' ') + ' │ ' : '';
      const highlighted = this.options.syntaxHighlight
        ? this.highlightSyntax(line, message.language)
        : line;
      lines.push(lineNum + highlighted);
    });

    // 底部
    lines.push(this.style('└' + '─'.repeat(this.options.width! - 1), 'dim'));

    return lines.join('\n');
  }

  private renderToolCall(message: ToolCallMessage): string {
    const icon = this.options.emoji ? '🔧' : '[TOOL]';
    const status = this.style(message.status.toUpperCase(), this.getStatusColor(message.status));
    const input = JSON.stringify(message.input, null, 2);

    return [
      `${icon} ${this.style(message.toolName, 'cyan')} ${status}`,
      this.indent(input),
    ].join('\n');
  }

  private renderToolResult(message: ToolResultMessage): string {
    const icon = message.error ? '❌' : '✓';
    const duration = this.style(`(${message.duration}ms)`, 'dim');

    if (message.error) {
      return `${icon} Error ${duration}\n${this.indent(this.style(message.error, 'red'))}`;
    }

    const result = typeof message.result === 'string'
      ? message.result
      : JSON.stringify(message.result, null, 2);

    return `${icon} Result ${duration}\n${this.indent(result)}`;
  }

  private renderThinking(message: ThinkingMessage): string {
    const icon = message.isStreaming ? '💭' : '💡';
    const style = message.isStreaming ? 'dim' : 'reset';
    return this.style(`${icon} ${message.content}`, style);
  }

  private renderProgress(message: ProgressMessage): string {
    const width = 30;
    const filled = Math.round((message.progress / 100) * width);
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
    const percent = String(Math.round(message.progress)).padStart(3, ' ');

    let output = `[${bar}] ${percent}% ${message.message}`;

    if (message.detail) {
      output += '\n' + this.style(this.indent(message.detail), 'dim');
    }

    return output;
  }

  // ANSI 样式
  private style(text: string, style: string): string {
    const codes: Record<string, string> = {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
    };

    return `${codes[style] || ''}${text}\x1b[0m`;
  }

  private getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: 'yellow',
      running: 'blue',
      completed: 'green',
      error: 'red',
    };
    return colors[status] || 'reset';
  }

  private highlightSyntax(code: string, language: string): string {
    // 简化的语法高亮
    // 实际使用 highlight.js 或 prism
    const keywords = /\b(function|const|let|var|if|else|for|while|return|import|export|class|async|await)\b/g;
    const strings = /(['"`])((?:\\\1|.)*?)\1/g;
    const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm;

    return code
      .replace(comments, (m) => this.style(m, 'dim'))
      .replace(strings, (m) => this.style(m, 'green'))
      .replace(keywords, (m) => this.style(m, 'magenta'));
  }

  private wrap(text: string): string {
    // 自动换行
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + word).length > this.options.width!) {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    }
    lines.push(currentLine.trim());

    return lines.join('\n');
  }

  private indent(text: string, spaces: number = 2): string {
    const prefix = ' '.repeat(spaces);
    return text.split('\n').map(line => prefix + line).join('\n');
  }
}
```

## 交互式组件

```typescript
// src/ui/interactive/Confirm.ts

import readline from 'readline';

export interface ConfirmOptions {
  message: string;
  default?: boolean;
}

export async function confirm(options: ConfirmOptions): Promise<boolean> {
  const { message, default: defaultValue = false } = options;
  const suffix = defaultValue ? ' [Y/n]' : ' [y/N]';

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message + suffix + ' ', (answer) => {
      rl.close();

      if (answer.trim() === '') {
        resolve(defaultValue);
        return;
      }

      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

// 使用示例
// const proceed = await confirm({ message: 'Delete this file?', default: false });
```

```typescript
// src/ui/interactive/Select.ts

import readline from 'readline';

export interface SelectOption<T> {
  value: T;
  label: string;
  description?: string;
}

export interface SelectOptions<T> {
  message: string;
  options: SelectOption<T>[];
  default?: T;
}

export async function select<T>(opts: SelectOptions<T>): Promise<T> {
  const { message, options, default: defaultValue } = opts;

  console.log(message);
  options.forEach((opt, i) => {
    const marker = opt.value === defaultValue ? '>' : ' ';
    console.log(`  ${marker} ${i + 1}. ${opt.label}`);
    if (opt.description) {
      console.log(`      ${style(opt.description, 'dim')}`);
    }
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('Select (number): ', (answer) => {
      rl.close();

      const index = parseInt(answer.trim()) - 1;
      if (index >= 0 && index < options.length) {
        resolve(options[index].value);
      } else {
        reject(new Error('Invalid selection'));
      }
    });
  });
}
```

```typescript
// src/ui/interactive/Input.ts

import readline from 'readline';

export interface InputOptions {
  message: string;
  default?: string;
  validate?: (value: string) => boolean | string;
  secret?: boolean; // 密码输入
}

export async function input(options: InputOptions): Promise<string> {
  const { message, default: defaultValue, validate, secret } = options;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // 密码输入隐藏
  if (secret) {
    rl.stdoutMuted = true;
  }

  return new Promise((resolve, reject) => {
    const ask = () => {
      const prompt = defaultValue ? `${message} (${defaultValue}): ` : `${message}: `;

      rl.question(prompt, (answer) => {
        const value = answer.trim() || defaultValue || '';

        if (validate) {
          const result = validate(value);
          if (result !== true) {
            console.log(result || 'Invalid input');
            ask();
            return;
          }
        }

        rl.close();
        resolve(value);
      });
    };

    ask();
  });
}
```

## 消息面板

```typescript
// src/ui/Panel.ts

import { EventEmitter } from 'events';
import { Message, MessageType } from './messages/types.js';
import { StreamRenderer } from './StreamRenderer.js';

export interface PanelOptions {
  maxHeight?: number;
  showTimestamps?: boolean;
  compactToolCalls?: boolean;
}

export class MessagePanel extends EventEmitter {
  private messages: Message[] = [];
  private renderer: StreamRenderer;
  private options: PanelOptions;

  constructor(options: PanelOptions = {}) {
    super();
    this.options = {
      maxHeight: 100,
      showTimestamps: false,
      compactToolCalls: true,
      ...options,
    };
    this.renderer = new StreamRenderer();
  }

  addMessage(message: Message): void {
    this.messages.push(message);

    // 限制消息数量
    if (this.messages.length > this.options.maxHeight!) {
      this.messages = this.messages.slice(-this.options.maxHeight!);
    }

    this.renderMessage(message);
    this.emit('message', message);
  }

  private renderMessage(message: Message): void {
    const output = this.renderer.render(message);
    console.log(output);
    console.log(); // 空行分隔
  }

  // 更新消息（用于工具状态更新）
  updateMessage(id: string, updates: Partial<Message>): void {
    const index = this.messages.findIndex(m => m.id === id);
    if (index === -1) return;

    this.messages[index] = { ...this.messages[index], ...updates } as Message;

    // 重新渲染（简化实现，实际使用终端控制代码更新特定行）
    this.redraw();
  }

  private redraw(): void {
    console.clear();
    for (const message of this.messages) {
      this.renderMessage(message);
    }
  }

  clear(): void {
    this.messages = [];
    console.clear();
  }

  getMessages(): Message[] {
    return [...this.messages];
  }
}
```

## 进度指示器

```typescript
// src/ui/Progress.ts

import { EventEmitter } from 'events';

export interface ProgressOptions {
  total?: number;
  title?: string;
  format?: string;
}

export class ProgressBar extends EventEmitter {
  private current = 0;
  private total: number;
  private title: string;
  private startTime: number;

  constructor(options: ProgressOptions = {}) {
    super();
    this.total = options.total || 100;
    this.title = options.title || 'Progress';
    this.startTime = Date.now();
  }

  update(current: number, message?: string): void {
    this.current = Math.min(current, this.total);
    const percentage = (this.current / this.total) * 100;

    this.draw(message);
    this.emit('update', { current: this.current, total: this.total, percentage });

    if (this.current >= this.total) {
      this.emit('complete');
    }
  }

  increment(amount = 1): void {
    this.update(this.current + amount);
  }

  private draw(message?: string): void {
    const width = 40;
    const filled = Math.round((this.current / this.total) * width);
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
    const percent = Math.round((this.current / this.total) * 100);

    const elapsed = Date.now() - this.startTime;
    const rate = this.current / (elapsed / 1000);
    const eta = rate > 0 ? (this.total - this.current) / rate : 0;

    // 清行并重新绘制
    process.stdout.write('\r\x1b[K');
    process.stdout.write(
      `${this.title} [${bar}] ${percent}% | ${this.current}/${this.total}` +
      (message ? ` | ${message}` : '') +
      (eta > 0 ? ` | ETA: ${Math.round(eta)}s` : '')
    );
  }

  complete(): void {
    process.stdout.write('\n');
    this.emit('complete');
  }
}

// 使用示例
// const progress = new ProgressBar({ total: files.length, title: 'Processing' });
// for (const file of files) {
//   await process(file);
//   progress.increment();
// }
// progress.complete();
```

## 动画组件

```typescript
// src/ui/Spinner.ts

export class Spinner {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private interval: NodeJS.Timeout | null = null;
  private frameIndex = 0;
  private message: string;

  constructor(message: string = 'Loading') {
    this.message = message;
  }

  start(): void {
    if (this.interval) return;

    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      process.stdout.write(`\r\x1b[K${frame} ${this.message}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
  }

  update(message: string): void {
    this.message = message;
  }

  stop(success: boolean = true): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    const icon = success ? '✓' : '✗';
    process.stdout.write(`\r\x1b[K${icon} ${this.message}\n`);
  }
}

// 使用示例
// const spinner = new Spinner('Analyzing code...');
// spinner.start();
// await analyze();
// spinner.stop(true);
```

## 完整使用示例

```typescript
// src/ui/index.ts

import { MessagePanel } from './Panel.js';
import { StreamRenderer } from './StreamRenderer.js';
import { MessageType, ToolCallMessage, ToolResultMessage } from './messages/types.js';
import { confirm, select, input } from './interactive/index.js';
import { ProgressBar } from './Progress.js';
import { Spinner } from './Spinner.js';

export async function demonstrateUI() {
  const panel = new MessagePanel();

  // 1. 添加文本消息
  panel.addMessage({
    id: '1',
    type: MessageType.TEXT,
    content: 'Hello! I\'m Claude Code, your AI coding assistant.',
    timestamp: Date.now(),
  });

  // 2. 显示工具调用
  const toolCallId = '2';
  panel.addMessage({
    id: toolCallId,
    type: MessageType.TOOL_CALL,
    toolName: 'Glob',
    input: { pattern: 'src/**/*.ts' },
    status: 'running',
    timestamp: Date.now(),
  });

  // 模拟工具执行
  await new Promise(r => setTimeout(r, 1000));

  // 更新为结果
  panel.updateMessage(toolCallId, { status: 'completed' });
  panel.addMessage({
    id: '3',
    type: MessageType.TOOL_RESULT,
    toolName: 'Glob',
    result: ['src/index.ts', 'src/utils.ts'],
    duration: 1000,
    timestamp: Date.now(),
  });

  // 3. 流式输出
  const renderer = new StreamRenderer();
  renderer.startStream();

  const chunks = ['Analyzing', ' your', ' codebase', '...', '\n', 'Found', ' 42', ' files', '.'];
  for (const chunk of chunks) {
    renderer.writeChunk(chunk);
    await new Promise(r => setTimeout(r, 100));
  }

  renderer.endStream();

  // 4. 交互式确认
  const shouldRefactor = await confirm({
    message: 'Found potential improvements. Apply refactoring?',
    default: false,
  });

  if (shouldRefactor) {
    // 5. 进度条
    const progress = new ProgressBar({
      total: 42,
      title: 'Refactoring',
    });

    for (let i = 0; i < 42; i++) {
      await new Promise(r => setTimeout(r, 50));
      progress.increment();
    }

    progress.complete();
  }

  // 6. 选择
  const model = await select({
    message: 'Choose model for next task:',
    options: [
      { value: 'opus', label: 'Claude Opus', description: 'Most capable' },
      { value: 'sonnet', label: 'Claude Sonnet', description: 'Balanced' },
      { value: 'haiku', label: 'Claude Haiku', description: 'Fastest' },
    ],
    default: 'sonnet',
  });

  console.log(`Selected: ${model}`);
}
```

## 本章小结

- ✓ 流式消息渲染
- ✓ 进度反馈系统
- ✓ 富文本和代码高亮
- ✓ 交互式组件

**下一步**: [Part 3: 高级篇](/claude_from_scratch/part3/) - 性能优化、MCP 协议、企业部署。
