---
title: "Ch7: 权限管理"
description: "构建多层安全体系，实现 hooks、rules 和 dialogs 三级权限控制"
part: "核心篇"
order: 7
---

# Ch7: 权限管理

本章我们将构建一个多层安全体系，这是生产级 AI 助手的核心能力。从自动审批到人工确认，从规则匹配到动态判断，实现灵活且安全的权限控制。

## 目标

- 设计三级权限架构（hooks → rules → dialogs）
- 实现权限规则引擎
- 构建确认对话框系统
- 支持批量审批模式

## 权限架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    Permission Layer                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   │
│  │   Hooks     │ → │   Rules     │ → │   Dialogs   │   │
│  │  (自动拦截)  │   │  (规则匹配)  │   │  (人工确认)  │   │
│  └─────────────┘   └─────────────┘   └─────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 权限级别枚举

创建 `src/permissions/Level.ts`：

```typescript
export enum PermissionLevel {
  /** 自动允许，无需确认 */
  AUTO_ALLOW = 0,

  /** 记录日志但允许 */
  LOG_ONLY = 1,

  /** 工具内确认（非阻塞） */
  NOTIFY = 2,

  /** 阻塞式确认对话框 */
  CONFIRM = 3,

  /** 需要密码/额外认证 */
  AUTHENTICATE = 4,

  /** 完全禁止 */
  DENY = 5,
}
```

## 权限规则接口

```typescript
// src/permissions/Rule.ts

import { Tool } from '../tools/Tool.js';
import { PermissionLevel } from './Level.js';

export interface PermissionRule {
  id: string;
  name: string;
  description: string;

  // 匹配条件
  matches: {
    toolName?: string | RegExp;
    operation?: string | RegExp;
    pathPattern?: RegExp;
    custom?: (context: PermissionContext) => boolean;
  };

  // 权限级别
  level: PermissionLevel;

  // 可选：覆盖消息
  message?: string | ((context: PermissionContext) => string);

  // 优先级（数字越大越优先）
  priority: number;
}

export interface PermissionContext {
  tool: Tool;
  input: Record<string, any>;
  cwd: string;
  userConfig: UserPermissionConfig;
}

export interface UserPermissionConfig {
  defaultLevel: PermissionLevel;
  trustedPaths: string[];
  dangerousPaths: string[];
  autoAllowReadOnly: boolean;
  rememberChoices: boolean;
}
```

## 规则引擎实现

```typescript
// src/permissions/RuleEngine.ts

import { PermissionRule, PermissionContext } from './Rule.js';
import { PermissionLevel } from './Level.js';

export class PermissionRuleEngine {
  private rules: PermissionRule[] = [];

  register(rule: PermissionRule): void {
    this.rules.push(rule);
    // 按优先级排序
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  evaluate(context: PermissionContext): PermissionRule | null {
    for (const rule of this.rules) {
      if (this.matches(rule, context)) {
        return rule;
      }
    }
    return null;
  }

  private matches(rule: PermissionRule, context: PermissionContext): boolean {
    const { matches } = rule;

    // 工具名匹配
    if (matches.toolName) {
      if (matches.toolName instanceof RegExp) {
        if (!matches.toolName.test(context.tool.name)) return false;
      } else if (matches.toolName !== context.tool.name) {
        return false;
      }
    }

    // 路径模式匹配
    if (matches.pathPattern && context.input.file_path) {
      const fullPath = path.resolve(context.cwd, context.input.file_path);
      if (!matches.pathPattern.test(fullPath)) return false;
    }

    // 自定义条件
    if (matches.custom && !matches.custom(context)) {
      return false;
    }

    return true;
  }
}

export const ruleEngine = new PermissionRuleEngine();
```

## 预定义规则集

```typescript
// src/permissions/BuiltinRules.ts

import { PermissionLevel } from './Level.js';
import { PermissionRule } from './Rule.js';

export const builtinRules: PermissionRule[] = [
  // 规则1: 只读工具自动允许
  {
    id: 'readonly-auto',
    name: '只读工具自动允许',
    description: 'Read, Glob, Grep 等只读操作自动允许',
    matches: {
      custom: (ctx) => ctx.tool.isReadOnly?.() ?? false,
    },
    level: PermissionLevel.AUTO_ALLOW,
    priority: 100,
  },

  // 规则2: 系统目录保护
  {
    id: 'system-protect',
    name: '系统目录保护',
    description: '禁止修改系统关键目录',
    matches: {
      pathPattern: /^\/(etc|usr|bin|sbin|lib|sys|proc)\//,
    },
    level: PermissionLevel.DENY,
    message: '无法修改系统目录，这可能破坏系统稳定性',
    priority: 1000,
  },

  // 规则3: Git 仓库外操作确认
  {
    id: 'outside-git-confirm',
    name: 'Git 仓库外操作确认',
    description: '在 Git 仓库外执行写操作需要确认',
    matches: {
      custom: (ctx) => {
        if (ctx.tool.isReadOnly?.()) return false;
        // 检查是否在 git 仓库内
        const targetPath = ctx.input.file_path || ctx.cwd;
        return !isInsideGitRepo(targetPath);
      },
    },
    level: PermissionLevel.CONFIRM,
    message: (ctx) => `即将在 ${ctx.cwd} 执行写操作，该目录不在 Git 版本控制下`,
    priority: 50,
  },

  // 规则4: 大文件删除警告
  {
    id: 'large-file-delete',
    name: '大文件删除警告',
    description: '删除超过 10MB 的文件需要额外确认',
    matches: {
      toolName: 'Bash',
      custom: (ctx) => {
        const cmd = ctx.input.command || '';
        if (!cmd.includes('rm') && !cmd.includes('delete')) return false;

        // 检查文件大小
        const fileMatch = cmd.match(/rm\s+(.+)/);
        if (fileMatch) {
          const filePath = fileMatch[1].trim();
          const stats = fs.statSync(filePath);
          return stats.size > 10 * 1024 * 1024; // 10MB
        }
        return false;
      },
    },
    level: PermissionLevel.AUTHENTICATE,
    message: '即将删除大文件，请确认操作',
    priority: 200,
  },

  // 规则5: 网络请求确认
  {
    id: 'network-confirm',
    name: '网络请求确认',
    description: '首次向外部域名发送请求需要确认',
    matches: {
      toolName: /Fetch|HTTPClient/,
    },
    level: PermissionLevel.CONFIRM,
    message: (ctx) => `即将向 ${ctx.input.url} 发送网络请求`,
    priority: 75,
  },
];

function isInsideGitRepo(dir: string): boolean {
  // 简化的 git 检测
  const gitDir = path.join(dir, '.git');
  return fs.existsSync(gitDir);
}
```

## 确认对话框系统

```typescript
// src/permissions/Dialog.ts

import { PermissionRule } from './Rule.js';
import { PermissionLevel } from './Level.js';

export interface ConfirmDialog {
  id: string;
  type: 'confirm' | 'authenticate' | 'notify';
  title: string;
  message: string;
  detail?: string;

  // 选项
  options: DialogOption[];

  // 是否记住选择
  canRemember: boolean;

  // 超时设置
  timeout?: number;
}

export interface DialogOption {
  id: string;
  label: string;
  value: DialogChoice;
  style?: 'primary' | 'danger' | 'secondary';
}

export enum DialogChoice {
  ALLOW = 'allow',
  ALLOW_ONCE = 'allow_once',
  DENY = 'deny',
  DENY_ONCE = 'deny_once',
  VIEW_DETAILS = 'view_details',
}

export class DialogManager {
  private activeDialogs = new Map<string, ConfirmDialog>();
  private rememberedChoices = new Map<string, DialogChoice>();

  async show(
    rule: PermissionRule,
    context: PermissionContext
  ): Promise<DialogChoice> {
    const dialogId = this.generateDialogId(rule, context);

    // 检查是否有记住的选择
    if (rule.level === PermissionLevel.AUTHENTICATE) {
      const remembered = this.rememberedChoices.get(dialogId);
      if (remembered) return remembered;
    }

    const dialog = this.createDialog(rule, context);
    this.activeDialogs.set(dialogId, dialog);

    // 实际 UI 渲染由上层处理
    const choice = await this.renderDialog(dialog);

    this.activeDialogs.delete(dialogId);
    return choice;
  }

  private createDialog(
    rule: PermissionRule,
    context: PermissionContext
  ): ConfirmDialog {
    const message = typeof rule.message === 'function'
      ? rule.message(context)
      : rule.message || `执行 ${context.tool.name}`;

    return {
      id: this.generateDialogId(rule, context),
      type: this.mapLevelToDialogType(rule.level),
      title: rule.name,
      message,
      detail: JSON.stringify(context.input, null, 2),
      canRemember: rule.level >= PermissionLevel.CONFIRM,
      options: [
        { id: 'allow', label: '允许', value: DialogChoice.ALLOW, style: 'primary' },
        { id: 'allow_once', label: '仅本次允许', value: DialogChoice.ALLOW_ONCE },
        { id: 'deny', label: '拒绝', value: DialogChoice.DENY, style: 'danger' },
        { id: 'view', label: '查看详情', value: DialogChoice.VIEW_DETAILS, style: 'secondary' },
      ],
    };
  }

  private mapLevelToDialogType(level: PermissionLevel): ConfirmDialog['type'] {
    switch (level) {
      case PermissionLevel.AUTHENTICATE:
        return 'authenticate';
      case PermissionLevel.CONFIRM:
        return 'confirm';
      default:
        return 'notify';
    }
  }

  private generateDialogId(rule: PermissionRule, context: PermissionContext): string {
    return `${rule.id}::${context.tool.name}::${context.cwd}`;
  }

  private async renderDialog(dialog: ConfirmDialog): Promise<DialogChoice> {
    // 实际实现由 UI 层提供
    throw new Error('DialogManager.renderDialog must be implemented by UI layer');
  }
}

export const dialogManager = new DialogManager();
```

## 权限检查器

```typescript
// src/permissions/Checker.ts

import { Tool } from '../tools/Tool.js';
import { PermissionLevel } from './Level.js';
import { ruleEngine } from './RuleEngine.js';
import { dialogManager, DialogChoice } from './Dialog.js';

export interface CheckResult {
  allowed: boolean;
  rule?: PermissionRule;
  choice?: DialogChoice;
}

export class PermissionChecker {
  async check(
    tool: Tool,
    input: Record<string, any>,
    cwd: string
  ): Promise<CheckResult> {
    const context = {
      tool,
      input,
      cwd,
      userConfig: this.loadUserConfig(),
    };

    // 1. 检查 Hooks（快速拒绝）
    if (this.shouldFastDeny(context)) {
      return { allowed: false };
    }

    // 2. 运行规则引擎
    const rule = ruleEngine.evaluate(context);

    if (!rule) {
      // 无匹配规则，使用默认级别
      return { allowed: true };
    }

    // 3. 根据级别处理
    switch (rule.level) {
      case PermissionLevel.AUTO_ALLOW:
      case PermissionLevel.LOG_ONLY:
        return { allowed: true, rule };

      case PermissionLevel.NOTIFY:
        // 非阻塞通知
        this.notifyUser(rule, context);
        return { allowed: true, rule };

      case PermissionLevel.CONFIRM:
      case PermissionLevel.AUTHENTICATE:
        const choice = await dialogManager.show(rule, context);
        return {
          allowed: choice === DialogChoice.ALLOW || choice === DialogChoice.ALLOW_ONCE,
          rule,
          choice,
        };

      case PermissionLevel.DENY:
        return { allowed: false, rule };

      default:
        return { allowed: false };
    }
  }

  private shouldFastDeny(context: PermissionContext): boolean {
    // 快速拒绝逻辑
    return false;
  }

  private notifyUser(rule: PermissionRule, context: PermissionContext): void {
    console.log(`[Permission] ${rule.name}: ${rule.description}`);
  }

  private loadUserConfig(): UserPermissionConfig {
    // 从配置文件加载
    return {
      defaultLevel: PermissionLevel.CONFIRM,
      trustedPaths: [],
      dangerousPaths: [],
      autoAllowReadOnly: true,
      rememberChoices: true,
    };
  }
}

export const permissionChecker = new PermissionChecker();
```

## CLI 对话框实现

```typescript
// src/permissions/CLIDialog.ts

import { DialogManager, ConfirmDialog, DialogChoice } from './Dialog.js';
import readline from 'readline';

export class CLIDialogRenderer {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async render(dialog: ConfirmDialog): Promise<DialogChoice> {
    console.clear();
    console.log('\n' + '='.repeat(60));
    console.log(`🔒 ${dialog.title}`);
    console.log('='.repeat(60));
    console.log(`\n${dialog.message}\n`);

    if (dialog.detail) {
      console.log('详情:');
      console.log(dialog.detail.substring(0, 500));
      console.log('');
    }

    console.log('选项:');
    dialog.options.forEach((opt, i) => {
      const style = opt.style === 'danger' ? '🔴' : opt.style === 'primary' ? '🟢' : '⚪';
      console.log(`  ${i + 1}. ${style} ${opt.label}`);
    });

    const answer = await this.ask('请选择 (1-' + dialog.options.length + '): ');
    const choice = parseInt(answer) - 1;

    if (choice >= 0 && choice < dialog.options.length) {
      return dialog.options[choice].value;
    }

    return DialogChoice.DENY_ONCE;
  }

  private ask(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  close(): void {
    this.rl.close();
  }
}
```

## 批量审批模式

```typescript
// src/permissions/BatchMode.ts

import { PermissionRule } from './Rule.js';

export interface BatchOperation {
  id: string;
  tool: string;
  input: Record<string, any>;
  estimatedRisk: 'low' | 'medium' | 'high';
}

export class BatchApprover {
  private operations: BatchOperation[] = [];
  private approvedIds = new Set<string>();

  add(operation: BatchOperation): void {
    this.operations.push(operation);
  }

  async approveAll(pattern: { risk?: string; tool?: string }): Promise<string[]> {
    const matched = this.operations.filter(op => {
      if (pattern.risk && op.estimatedRisk !== pattern.risk) return false;
      if (pattern.tool && op.tool !== pattern.tool) return false;
      return true;
    });

    matched.forEach(op => this.approvedIds.add(op.id));
    return matched.map(op => op.id);
  }

  isApproved(operationId: string): boolean {
    return this.approvedIds.has(operationId);
  }

  getSummary(): { total: number; approved: number; pending: number } {
    return {
      total: this.operations.length,
      approved: this.approvedIds.size,
      pending: this.operations.length - this.approvedIds.size,
    };
  }
}
```

## 本章小结

- ✓ 三级权限架构（hooks → rules → dialogs）
- ✓ 规则引擎实现
- ✓ 对话框系统
- ✓ 批量审批模式

**下一步**: [Ch8: Agent 系统](/claude_from_scratch/part2/ch8-agent-system.html) - 多 Agent 并行与协调。
