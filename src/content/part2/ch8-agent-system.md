---
title: "Ch8: Agent 系统"
description: "实现多 Agent 并行执行、Fork/Resume 模式和任务协调"
part: "核心篇"
order: 8
---

# Ch8: Agent 系统

本章我们将构建强大的 Agent 系统，支持多 Agent 并行执行、Fork/Resume 模式，以及复杂的任务协调机制。这是实现高效 AI 编程助手的核心能力。

## 目标

- 设计 Agent 生命周期管理
- 实现 Fork/Resume 模式
- 构建 Agent 间通信机制
- 支持并行执行与结果合并

## Agent 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Agent Manager                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│  │  Agent #1   │    │  Agent #2   │    │  Agent #3   │      │
│  │  (Main)     │    │  (Search)   │    │  (Edit)     │      │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            ↓                                 │
│                    ┌─────────────┐                           │
│                    │  Result Merger│                          │
│                    └─────────────┘                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Agent 状态机

```typescript
// src/agents/State.ts

export enum AgentState {
  /** 初始状态 */
  IDLE = 'idle',

  /** 正在规划 */
  PLANNING = 'planning',

  /** 执行中 */
  RUNNING = 'running',

  /** 等待用户输入 */
  WAITING = 'waiting',

  /** 已暂停 */
  PAUSED = 'paused',

  /** 执行完成 */
  COMPLETED = 'completed',

  /** 执行失败 */
  FAILED = 'failed',

  /** 已取消 */
  CANCELLED = 'cancelled',
}

export interface AgentSnapshot {
  id: string;
  state: AgentState;
  context: AgentContext;
  messages: Message[];
  toolCalls: ToolCall[];
  memory: Map<string, any>;
  timestamp: number;
}
```

## Agent 接口定义

```typescript
// src/agents/Agent.ts

import { Tool } from '../tools/Tool.js';
import { AgentState, AgentSnapshot } from './State.js';

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  model: string;
  systemPrompt: string;
  maxIterations: number;
  timeout: number;
  tools: string[]; // 允许的工具名列表
}

export interface AgentContext {
  cwd: string;
  env: Record<string, string>;
  userPreferences: UserPreferences;
}

export interface UserPreferences {
  autoConfirm: boolean;
  verbose: boolean;
  maxParallelAgents: number;
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  timestamp: number;
}

export interface ToolCall {
  id: string;
  tool: string;
  input: Record<string, any>;
}

export interface ToolResult {
  callId: string;
  data: any;
  error?: string;
}

export interface Agent {
  readonly config: AgentConfig;
  readonly state: AgentState;

  // 生命周期
  initialize(): Promise<void>;
  run(input: string): Promise<AgentResult>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  cancel(): Promise<void>;

  // Fork/Resume 支持
  fork(): Promise<Agent>;
  restore(snapshot: AgentSnapshot): Promise<void>;
  snapshot(): AgentSnapshot;

  // 事件
  onStateChange(callback: (state: AgentState) => void): void;
  onProgress(callback: (progress: AgentProgress) => void): void;
}

export interface AgentResult {
  success: boolean;
  output: string;
  messages: Message[];
  toolCalls: ToolCall[];
  duration: number;
}

export interface AgentProgress {
  iteration: number;
  maxIterations: number;
  currentTool?: string;
  messageCount: number;
}
```

## Agent 实现

```typescript
// src/agents/BaseAgent.ts

import { EventEmitter } from 'events';
import {
  Agent,
  AgentConfig,
  AgentContext,
  AgentResult,
  AgentProgress,
  Message,
  ToolCall,
} from './Agent.js';
import { AgentState, AgentSnapshot } from './State.js';
import { LLMClient } from '../llm/Client.js';
import { toolRegistry } from '../tools/Registry.js';

export class BaseAgent extends EventEmitter implements Agent {
  public readonly config: AgentConfig;
  public state: AgentState = AgentState.IDLE;

  private context: AgentContext;
  private messages: Message[] = [];
  private toolCalls: ToolCall[] = [];
  private memory = new Map<string, any>();
  private llm: LLMClient;
  private abortController: AbortController | null = null;

  constructor(config: AgentConfig, context: AgentContext, llm: LLMClient) {
    super();
    this.config = config;
    this.context = context;
    this.llm = llm;
  }

  async initialize(): Promise<void> {
    this.messages.push({
      role: 'system',
      content: this.config.systemPrompt,
      timestamp: Date.now(),
    });
    this.setState(AgentState.IDLE);
  }

  async run(input: string): Promise<AgentResult> {
    const startTime = Date.now();
    this.abortController = new AbortController();

    try {
      this.setState(AgentState.RUNNING);

      // 添加用户输入
      this.messages.push({
        role: 'user',
        content: input,
        timestamp: Date.now(),
      });

      // 执行循环
      for (let i = 0; i < this.config.maxIterations; i++) {
        if (this.abortController.signal.aborted) {
          throw new Error('Agent execution cancelled');
        }

        this.emitProgress({
          iteration: i + 1,
          maxIterations: this.config.maxIterations,
          messageCount: this.messages.length,
        });

        // 调用 LLM
        const response = await this.llm.chat({
          model: this.config.model,
          messages: this.messages,
          tools: this.getAvailableTools(),
        });

        // 添加助手响应
        this.messages.push({
          role: 'assistant',
          content: response.content,
          toolCalls: response.toolCalls,
          timestamp: Date.now(),
        });

        // 处理工具调用
        if (!response.toolCalls || response.toolCalls.length === 0) {
          // 没有工具调用，任务完成
          break;
        }

        // 执行工具调用
        for (const call of response.toolCalls) {
          this.emitProgress({
            iteration: i + 1,
            maxIterations: this.config.maxIterations,
            currentTool: call.tool,
            messageCount: this.messages.length,
          });

          const result = await this.executeTool(call);

          this.messages.push({
            role: 'tool',
            content: JSON.stringify(result.data),
            toolResults: [{ callId: call.id, ...result }],
            timestamp: Date.now(),
          });

          this.toolCalls.push(call);
        }
      }

      this.setState(AgentState.COMPLETED);

      const lastMessage = this.messages[this.messages.length - 1];
      return {
        success: true,
        output: lastMessage.content,
        messages: this.messages,
        toolCalls: this.toolCalls,
        duration: Date.now() - startTime,
      };

    } catch (error) {
      this.setState(AgentState.FAILED);
      return {
        success: false,
        output: error instanceof Error ? error.message : 'Unknown error',
        messages: this.messages,
        toolCalls: this.toolCalls,
        duration: Date.now() - startTime,
      };
    }
  }

  async pause(): Promise<void> {
    this.setState(AgentState.PAUSED);
  }

  async resume(): Promise<void> {
    if (this.state === AgentState.PAUSED) {
      this.setState(AgentState.RUNNING);
    }
  }

  async cancel(): Promise<void> {
    this.abortController?.abort();
    this.setState(AgentState.CANCELLED);
  }

  // Fork/Resume 模式
  async fork(): Promise<Agent> {
    const forkedConfig = {
      ...this.config,
      id: `${this.config.id}-fork-${Date.now()}`,
      name: `${this.config.name} (Fork)`,
    };

    const forked = new BaseAgent(forkedConfig, this.context, this.llm);
    await forked.initialize();

    // 复制状态
    forked.messages = [...this.messages];
    forked.toolCalls = [...this.toolCalls];
    forked.memory = new Map(this.memory);

    return forked;
  }

  async restore(snapshot: AgentSnapshot): Promise<void> {
    this.state = snapshot.state;
    this.messages = snapshot.messages;
    this.toolCalls = snapshot.toolCalls;
    this.memory = new Map(snapshot.memory);
  }

  snapshot(): AgentSnapshot {
    return {
      id: this.config.id,
      state: this.state,
      context: this.context,
      messages: [...this.messages],
      toolCalls: [...this.toolCalls],
      memory: new Map(this.memory),
      timestamp: Date.now(),
    };
  }

  private async executeTool(call: ToolCall): Promise<any> {
    const tool = toolRegistry.get(call.tool);
    if (!tool) {
      throw new Error(`Tool not found: ${call.tool}`);
    }

    return tool.execute(call.input, {
      cwd: this.context.cwd,
      logger: console,
    });
  }

  private getAvailableTools() {
    return this.config.tools
      .map(name => toolRegistry.get(name))
      .filter(Boolean);
  }

  private setState(state: AgentState): void {
    this.state = state;
    this.emit('stateChange', state);
  }

  private emitProgress(progress: AgentProgress): void {
    this.emit('progress', progress);
  }
}
```

## Agent 管理器

```typescript
// src/agents/Manager.ts

import { Agent, AgentConfig, AgentResult } from './Agent.js';
import { BaseAgent } from './BaseAgent.js';
import { AgentSnapshot, AgentState } from './State.js';
import { LLMClient } from '../llm/Client.js';

export interface ParallelTask {
  id: string;
  agentConfig: AgentConfig;
  input: string;
}

export interface ParallelResult {
  taskId: string;
  result: AgentResult;
}

export class AgentManager {
  private agents = new Map<string, Agent>();
  private snapshots = new Map<string, AgentSnapshot>();
  private llm: LLMClient;

  constructor(llm: LLMClient) {
    this.llm = llm;
  }

  async createAgent(config: AgentConfig, context: AgentContext): Promise<Agent> {
    const agent = new BaseAgent(config, context, this.llm);
    await agent.initialize();
    this.agents.set(config.id, agent);
    return agent;
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  async forkAgent(agentId: string): Promise<Agent> {
    const original = this.agents.get(agentId);
    if (!original) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const forked = await original.fork();
    this.agents.set(forked.config.id, forked);
    return forked;
  }

  async runParallel(
    tasks: ParallelTask[],
    context: AgentContext,
    maxConcurrency: number = 3
  ): Promise<ParallelResult[]> {
    const results: ParallelResult[] = [];
    const executing = new Set<Promise<void>>();

    for (const task of tasks) {
      // 控制并发数
      while (executing.size >= maxConcurrency) {
        await Promise.race(executing);
      }

      const agent = await this.createAgent(task.agentConfig, context);

      const promise = agent.run(task.input).then(result => {
        results.push({ taskId: task.id, result });
        executing.delete(promise);
      });

      executing.add(promise);
    }

    await Promise.all(executing);
    return results;
  }

  async saveSnapshot(agentId: string): Promise<string> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const snapshot = agent.snapshot();
    const snapshotId = `${agentId}-${Date.now()}`;
    this.snapshots.set(snapshotId, snapshot);

    return snapshotId;
  }

  async restoreFromSnapshot(snapshotId: string): Promise<Agent> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    const config = {
      ...snapshot.context.userPreferences,
      id: `restored-${snapshot.id}`,
    } as AgentConfig;

    const agent = new BaseAgent(config, snapshot.context, this.llm);
    await agent.restore(snapshot);
    this.agents.set(config.id, agent);

    return agent;
  }

  getActiveAgents(): Agent[] {
    return Array.from(this.agents.values()).filter(
      a => a.state === AgentState.RUNNING || a.state === AgentState.PLANNING
    );
  }

  async cancelAll(): Promise<void> {
    for (const agent of this.agents.values()) {
      await agent.cancel();
    }
  }
}
```

## 并行执行示例

```typescript
// 示例：并行代码分析
async function analyzeCodebase(manager: AgentManager, cwd: string) {
  const tasks: ParallelTask[] = [
    {
      id: 'analyze-structure',
      agentConfig: {
        id: 'agent-structure',
        name: 'Structure Analyzer',
        description: '分析项目结构',
        model: 'claude-sonnet-4-6',
        systemPrompt: '你是一个代码结构分析专家。分析项目目录结构、模块依赖关系。',
        maxIterations: 10,
        timeout: 60000,
        tools: ['Glob', 'Read', 'Grep'],
      },
      input: '分析这个项目的整体架构和目录组织',
    },
    {
      id: 'find-bugs',
      agentConfig: {
        id: 'agent-bugs',
        name: 'Bug Finder',
        description: '查找潜在 Bug',
        model: 'claude-sonnet-4-6',
        systemPrompt: '你是一个代码审查专家。查找潜在的 bug、错误处理问题和代码异味。',
        maxIterations: 15,
        timeout: 120000,
        tools: ['Glob', 'Read', 'Grep'],
      },
      input: '审查代码库中的潜在问题和 bug',
    },
    {
      id: 'suggest-refactoring',
      agentConfig: {
        id: 'agent-refactor',
        name: 'Refactoring Advisor',
        description: '提供重构建议',
        model: 'claude-sonnet-4-6',
        systemPrompt: '你是一个重构专家。识别需要重构的代码，提供改进建议。',
        maxIterations: 10,
        timeout: 60000,
        tools: ['Glob', 'Read'],
      },
      input: '识别可以重构改进的代码区域',
    },
  ];

  const context: AgentContext = {
    cwd,
    env: process.env as Record<string, string>,
    userPreferences: {
      autoConfirm: false,
      verbose: true,
      maxParallelAgents: 3,
    },
  };

  const results = await manager.runParallel(tasks, context, 3);

  // 合并结果
  const merged = {
    structure: results.find(r => r.taskId === 'analyze-structure')?.result.output,
    bugs: results.find(r => r.taskId === 'find-bugs')?.result.output,
    refactoring: results.find(r => r.taskId === 'suggest-refactoring')?.result.output,
  };

  return merged;
}
```

## Agent 协调器（复杂任务分解）

```typescript
// src/agents/Coordinator.ts

import { AgentManager, ParallelTask } from './Manager.js';
import { AgentConfig } from './Agent.js';

export interface TaskPlan {
  steps: TaskStep[];
  dependencies: Map<string, string[]>; // stepId -> dependency stepIds
}

export interface TaskStep {
  id: string;
  description: string;
  agentConfig: Partial<AgentConfig>;
  input: string;
}

export class AgentCoordinator {
  private manager: AgentManager;

  constructor(manager: AgentManager) {
    this.manager = manager;
  }

  async executePlan(plan: TaskPlan, context: AgentContext): Promise<Record<string, any>> {
    const completedSteps = new Map<string, any>();
    const pendingSteps = new Set(plan.steps.map(s => s.id));

    while (pendingSteps.size > 0) {
      // 找出可以执行的步骤（依赖已完成）
      const readySteps = plan.steps.filter(step => {
        if (!pendingSteps.has(step.id)) return false;
        const deps = plan.dependencies.get(step.id) || [];
        return deps.every(dep => completedSteps.has(dep));
      });

      if (readySteps.length === 0) {
        throw new Error('Circular dependency detected');
      }

      // 并行执行就绪步骤
      const tasks: ParallelTask[] = readySteps.map(step => ({
        id: step.id,
        agentConfig: {
          id: `coordinator-${step.id}`,
          name: step.description,
          description: step.description,
          model: 'claude-sonnet-4-6',
          systemPrompt: '你是一个任务执行 Agent。',
          maxIterations: 20,
          timeout: 120000,
          tools: ['Read', 'Edit', 'Bash', 'Glob', 'Grep'],
          ...step.agentConfig,
        },
        input: this.buildStepInput(step, completedSteps),
      }));

      const results = await this.manager.runParallel(tasks, context, 3);

      // 记录完成结果
      for (const result of results) {
        completedSteps.set(result.taskId, result.result.output);
        pendingSteps.delete(result.taskId);
      }
    }

    return Object.fromEntries(completedSteps);
  }

  private buildStepInput(
    step: TaskStep,
    completedSteps: Map<string, any>
  ): string {
    let input = step.input;

    // 替换模板变量
    for (const [stepId, result] of completedSteps) {
      input = input.replace(`{{${stepId}}}`, result);
    }

    return input;
  }
}
```

## 使用示例

```typescript
// 协调多步骤重构任务
const plan: TaskPlan = {
  steps: [
    {
      id: 'analyze',
      description: '分析当前代码',
      input: '分析 src/services/api.ts 的当前实现',
    },
    {
      id: 'design',
      description: '设计改进方案',
      input: '基于以下分析结果设计改进方案：\n{{analyze}}',
    },
    {
      id: 'implement',
      description: '实施重构',
      input: '按照以下方案实施重构：\n{{design}}',
    },
    {
      id: 'test',
      description: '验证重构',
      input: '验证重构后的代码，确保功能正常',
    },
  ],
  dependencies: new Map([
    ['design', ['analyze']],
    ['implement', ['design']],
    ['test', ['implement']],
  ]),
};

const results = await coordinator.executePlan(plan, context);
console.log('重构完成:', results.test);
```

## 本章小结

- ✓ Agent 生命周期管理
- ✓ Fork/Resume 模式实现
- ✓ 并行执行与结果合并
- ✓ 复杂任务协调

**下一步**: [Ch9: 配置与持久化](/claude_from_scratch/part2/ch9-configuration.html) - 企业级配置系统。
