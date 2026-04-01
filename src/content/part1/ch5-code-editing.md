---
title: "Ch5: 编辑代码"
description: "实现文件编辑能力，完成 MVP"
part: "基础篇"
order: 5
---

# Ch5: 编辑代码

本章我们将实现文件编辑功能，支持应用修改并显示 Diff。完成本章后，你就拥有了一个完整的 MVP——能聊天、读写文件、执行命令、编辑代码的 AI 助手。

## 目标

- 实现文件编辑工具
- 生成并显示 Diff
- 用户确认机制
- MVP 完整测试

## 编辑工具

创建 `src/tools/EditTool.ts`：

```typescript
import fs from 'fs/promises';

export interface EditInput {
  file_path: string;
  old_string: string;
  new_string: string;
}

export interface EditOutput {
  success: boolean;
  diff: string;
}

export class EditTool {
  name = 'Edit';
  description = '编辑文件内容';

  async execute(input: EditInput): Promise<EditOutput> {
    const content = await fs.readFile(input.file_path, 'utf-8');

    if (!content.includes(input.old_string)) {
      return {
        success: false,
        diff: '错误: 未找到匹配字符串'
      };
    }

    const newContent = content.replace(input.old_string, input.new_string);
    const diff = this.generateDiff(content, newContent, input.file_path);

    await fs.writeFile(input.file_path, newContent);

    return { success: true, diff };
  }

  private generateDiff(oldContent: string, newContent: string, filePath: string): string {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    let diff = `--- ${filePath}\n+++ ${filePath}\n`;

    // 简化的 diff 生成
    for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
      if (oldLines[i] !== newLines[i]) {
        if (oldLines[i]) diff += `- ${oldLines[i]}\n`;
        if (newLines[i]) diff += `+ ${newLines[i]}\n`;
      }
    }

    return diff;
  }
}
```

## Diff 显示

```typescript
import chalk from 'chalk';

export function printDiff(diff: string): void {
  const lines = diff.split('\n');

  for (const line of lines) {
    if (line.startsWith('+')) {
      console.log(chalk.green(line));
    } else if (line.startsWith('-')) {
      console.log(chalk.red(line));
    } else {
      console.log(chalk.gray(line));
    }
  }
}
```

:::scenario{title="修改配置文件"}
**用户说**: "把 package.json 中的 version 改成 1.1.0"

**系统流程**:
1. 读取当前文件内容
2. 生成修改后的内容
3. 显示 Diff
4. 询问用户确认
5. 应用修改
:::

## MVP 完整测试

```bash
npm run dev chat
```

测试场景：
1. "读取 README.md" - 测试 ReadTool
2. "列出当前目录" - 测试 LSTool
3. "搜索所有 .ts 文件" - 测试 GlobTool
4. "运行 ls -la" - 测试 BashTool
5. "修改 src/index.ts，添加注释" - 测试 EditTool

## 本章小结

- ✓ EditTool - 文件编辑
- ✓ Diff 生成与显示
- ✓ 用户确认机制
- ✓ MVP 完成

## 基础篇完成！

恭喜你！你现在拥有了一个能运行的 AI 编程助手。接下来是[核心篇](/claude_from_scratch/part2/index.html)，我们将构建更强大的基础设施。
