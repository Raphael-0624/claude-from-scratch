---
title: "Ch2: 连接大脑"
description: "接入 LLM API，实现流式对话"
part: "基础篇"
order: 2
---

# Ch2: 连接大脑

本章我们将接入 LLM API，实现真正的 AI 对话功能。支持 OpenAI、Anthropic 等主流 API，并实现流式响应展示。

## 目标

- 接入 LLM API
- 实现流式响应处理
- 管理消息历史
- 实现交互式对话

## API 封装

创建 `src/llm.ts`：

```typescript
import { Config } from './config.js';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
}

export abstract class LLMProvider {
  constructor(protected config: Config) {}
  abstract chat(messages: Message[]): Promise<LLMResponse>;
  abstract streamChat(messages: Message[], onChunk: (chunk: string) => void): Promise<void>;
}
```

### OpenAI 实现

```typescript
// src/providers/openai.ts
import { LLMProvider, Message, LLMResponse } from '../llm.js';

export class OpenAIProvider extends LLMProvider {
  async chat(messages: Message[]): Promise<LLMResponse> {
    const response = await fetch(`${this.config.baseUrl || 'https://api.openai.com'}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4',
        messages
      })
    });

    const data = await response.json();
    return { content: data.choices[0].message.content };
  }

  async streamChat(messages: Message[], onChunk: (chunk: string) => void): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        stream: true
      })
    });

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) onChunk(content);
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }
}
```

## 交互式对话

创建 `src/chat.ts`：

```typescript
import readline from 'readline';
import chalk from 'chalk';
import { LLMProvider, Message } from './llm.js';

export class ChatSession {
  private messages: Message[] = [];

  constructor(private provider: LLMProvider) {
    this.messages.push({
      role: 'system',
      content: '你是一个编程助手，帮助用户编写和理解代码。'
    });
  }

  async start() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log(chalk.cyan('🤖 开始对话 (输入 exit 退出)\n'));

    const askQuestion = () => {
      rl.question(chalk.green('你: '), async (input) => {
        if (input.toLowerCase() === 'exit') {
          rl.close();
          return;
        }

        this.messages.push({ role: 'user', content: input });

        process.stdout.write(chalk.cyan('AI: '));

        let response = '';
        await this.provider.streamChat(this.messages, (chunk) => {
          process.stdout.write(chunk);
          response += chunk;
        });

        console.log('\n');

        this.messages.push({ role: 'assistant', content: response });

        askQuestion();
      });
    };

    askQuestion();
  }
}
```

:::scenario{title="第一次对话"}
**用户输入**: "你好，能帮我写一个快速排序吗？"

**系统流程**:
1. 接收用户输入
2. 构造 messages 数组
3. 调用 LLM API
4. 流式显示响应
5. 保存对话历史
:::

## 更新 CLI

修改 `src/index.ts`：

```typescript
import { ChatSession } from './chat.js';
import { OpenAIProvider } from './providers/openai.js';

program
  .command('chat')
  .description('开始对话')
  .action(async () => {
    const config = await initConfig();
    const provider = new OpenAIProvider(config);
    const session = new ChatSession(provider);
    await session.start();
  });
```

## 运行测试

```bash
npm run dev chat
```

预期交互：

```
🤖 开始对话 (输入 exit 退出)

你: 你好
AI: 你好！我是你的编程助手，有什么可以帮你的吗？

你: exit
```

## 本章小结

- ✓ LLM API 封装（OpenAI/Anthropic）
- ✓ 流式响应处理（SSE）
- ✓ 消息历史管理
- ✓ 交互式对话实现

**下一步**: [Ch3: 读取世界](/claude_from_scratch/part1/ch3-file-operations.html) - 实现文件系统操作。
