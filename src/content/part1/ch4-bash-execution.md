---
title: "Ch4: 执行命令"
description: "实现 Bash 命令执行与安全验证"
part: "基础篇"
order: 4
---

# Ch4: 执行命令

本章我们将实现 Bash 命令执行工具，并添加基础安全验证。

## 目标

- 实现 Bash 命令执行
- 危险命令检测
- 超时控制
- 输出捕获

## Bash 工具

创建 `src/tools/BashTool.ts`：

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface BashInput {
  command: string;
  timeout?: number;
}

export interface BashOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

// 危险命令列表
const DANGEROUS_COMMANDS = [
  /^rm\s+-rf\s+\//,  // rm -rf /
  />\s*\/dev\/null.*<&\s*0/,  // 输入重定向到 /dev/null
  /curl.*\|.*sh/,  // curl | sh
];

export class BashTool {
  name = 'Bash';
  description = '执行 Bash 命令';

  private validateCommand(command: string): void {
    for (const pattern of DANGEROUS_COMMANDS) {
      if (pattern.test(command)) {
        throw new Error(`危险命令被阻止: ${command}`);
      }
    }
  }

  async execute(input: BashInput): Promise<BashOutput> {
    this.validateCommand(input.command);

    const { stdout, stderr } = await execAsync(input.command, {
      timeout: input.timeout || 30000,
      maxBuffer: 1024 * 1024  // 1MB
    });

    return {
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0
    };
  }
}
```

:::scenario{title="运行测试"}
**用户说**: "运行 npm test"

**系统流程**:
1. 检测命令安全性
2. 询问用户确认（如果是潜在危险命令）
3. 执行命令
4. 捕获并格式化输出
:::

## 添加确认机制

```typescript
import readline from 'readline';

async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

// 在 BashTool 中使用
const POTENTIALLY_DESTRUCTIVE = /^(rm|mv|git\s+(reset|clean))/;

if (POTENTIALLY_DESTRUCTIVE.test(input.command)) {
  const confirmed = await confirm(`执行: ${input.command}?`);
  if (!confirmed) {
    return { stdout: '', stderr: '用户取消', exitCode: 1 };
  }
}
```

## 本章小结

- ✓ Bash 命令执行
- ✓ 危险命令检测
- ✓ 用户确认机制
- ✓ 超时控制

**下一步**: [Ch5: 编辑代码](/claude_from_scratch/part1/ch5-code-editing.html) - 实现文件编辑功能。
