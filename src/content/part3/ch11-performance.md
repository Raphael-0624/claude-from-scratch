---
title: "Ch11: 性能优化"
description: "智能缓存策略、Token 优化和流式处理，降低 API 成本"
part: "高级篇"
order: 11
---

# Ch11: 性能优化

本章我们将实现智能缓存策略、Token 优化和流式处理，显著降低 API 成本并提升响应速度。

## 目标

- 实现多级缓存系统
- 优化 Token 使用
- 流式处理优化
- 成本监控与分析

## 缓存架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Cache Architecture                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   User Query ──→ L1 (Memory) ──→ L2 (Disk) ──→ LLM API     │
│                      ↓              ↓                        │
│                 ┌────────┐    ┌────────┐                   │
│                 │ Semantic│    │ File   │                   │
│                 │ Match   │    │ Cache  │                   │
│                 └────────┘    └────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 缓存接口

```typescript
// src/cache/types.ts

export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  tags: string[];
}

export interface CacheOptions {
  ttl?: number; // Time to live in ms
  tags?: string[];
  priority?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  memoryUsage: number;
}

export interface Cache<T> {
  name: string;

  get(key: string): Promise<T | undefined>;
  set(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;

  getStats(): CacheStats;
  invalidateTags(tags: string[]): Promise<number>;
}
```

## 内存缓存

```typescript
// src/cache/MemoryCache.ts

import { Cache, CacheEntry, CacheOptions, CacheStats } from './types.js';
import { EventEmitter } from 'events';

interface MemoryCacheOptions {
  maxSize?: number; // 最大条目数
  maxMemoryMB?: number; // 最大内存占用
  defaultTTL?: number; // 默认 TTL
}

export class MemoryCache<T> extends EventEmitter implements Cache<T> {
  public name = 'memory';

  private store = new Map<string, CacheEntry<T>>();
  private options: MemoryCacheOptions;
  private stats = { hits: 0, misses: 0 };
  private cleanupInterval: NodeJS.Timeout;

  constructor(options: MemoryCacheOptions = {}) {
    super();
    this.options = {
      maxSize: 1000,
      maxMemoryMB: 100,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      ...options,
    };

    // 定期清理过期条目
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async get(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // 检查过期
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // 更新访问统计
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    this.stats.hits++;
    this.emit('hit', key);
    return entry.value;
  }

  async set(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    // 检查容量
    if (this.store.size >= this.options.maxSize!) {
      this.evictLRU();
    }

    const ttl = options.ttl ?? this.options.defaultTTL!;

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      tags: options.tags || [],
    };

    this.store.set(key, entry);
    this.emit('set', key);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
    this.emit('delete', key);
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.emit('clear');
  }

  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      size: this.store.size,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  async invalidateTags(tags: string[]): Promise<number> {
    let count = 0;
    const tagSet = new Set(tags);

    for (const [key, entry] of this.store) {
      if (entry.tags.some(t => tagSet.has(t))) {
        this.store.delete(key);
        count++;
      }
    }

    return count;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt < now) {
        this.store.delete(key);
      }
    }
  }

  private evictLRU(): void {
    // 找到最久未访问的条目
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.store) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }

  private estimateMemoryUsage(): number {
    // 粗略估计内存使用
    let total = 0;
    for (const entry of this.store.values()) {
      total += JSON.stringify(entry).length * 2; // UTF-16
    }
    return total;
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}
```

## 语义缓存

```typescript
// src/cache/SemanticCache.ts

import { Cache, CacheEntry, CacheOptions } from './types.js';
import { LLMClient } from '../llm/Client.js';

interface SemanticCacheOptions {
  similarityThreshold: number; // 相似度阈值
  embeddingModel: string;
}

export class SemanticCache<T> implements Cache<T> {
  public name = 'semantic';

  private entries: Array<{
    embedding: number[];
    entry: CacheEntry<T>;
  }> = [];
  private options: SemanticCacheOptions;
  private llm: LLMClient;

  constructor(llm: LLMClient, options: SemanticCacheOptions) {
    this.llm = llm;
    this.options = options;
  }

  async get(key: string): Promise<T | undefined> {
    // 为查询生成 embedding
    const queryEmbedding = await this.generateEmbedding(key);

    // 查找最相似的缓存条目
    let bestMatch: { entry: CacheEntry<T>; similarity: number } | null = null;

    for (const item of this.entries) {
      const similarity = this.cosineSimilarity(queryEmbedding, item.embedding);

      if (similarity > this.options.similarityThreshold) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { entry: item.entry, similarity };
        }
      }
    }

    if (bestMatch) {
      // 检查过期
      if (bestMatch.entry.expiresAt < Date.now()) {
        this.removeEntry(bestMatch.entry.key);
        return undefined;
      }

      return bestMatch.entry.value;
    }

    return undefined;
  }

  async set(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const embedding = await this.generateEmbedding(key);

    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + (options.ttl || 300000),
      accessCount: 0,
      lastAccessed: Date.now(),
      tags: options.tags || [],
    };

    this.entries.push({ embedding, entry });
  }

  async delete(key: string): Promise<void> {
    this.removeEntry(key);
  }

  async clear(): Promise<void> {
    this.entries = [];
  }

  async has(key: string): Promise<boolean> {
    return (await this.get(key)) !== undefined;
  }

  getStats() {
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: this.entries.length,
      memoryUsage: 0,
    };
  }

  async invalidateTags(tags: string[]): Promise<number> {
    const tagSet = new Set(tags);
    let count = 0;

    this.entries = this.entries.filter(item => {
      if (item.entry.tags.some(t => tagSet.has(t))) {
        count++;
        return false;
      }
      return true;
    });

    return count;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // 使用 LLM API 生成 embedding
    const response = await this.llm.embeddings({
      model: this.options.embeddingModel,
      input: text,
    });

    return response.embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private removeEntry(key: string): void {
    this.entries = this.entries.filter(e => e.entry.key !== key);
  }
}
```

## 多级缓存管理器

```typescript
// src/cache/CacheManager.ts

import { Cache, CacheOptions } from './types.js';

export class CacheManager<T> {
  private caches: Cache<T>[] = [];

  addCache(cache: Cache<T>): void {
    this.caches.push(cache);
    // 按优先级排序（Memory -> Disk -> Semantic）
    this.caches.sort((a, b) => this.getPriority(a) - this.getPriority(b));
  }

  async get(key: string): Promise<T | undefined> {
    // 从 L1 到 Ln 逐级查找
    for (let i = 0; i < this.caches.length; i++) {
      const value = await this.caches[i].get(key);
      if (value !== undefined) {
        // 回填到更高级的缓存
        for (let j = 0; j < i; j++) {
          await this.caches[j].set(key, value);
        }
        return value;
      }
    }
    return undefined;
  }

  async set(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    // 写入所有缓存
    for (const cache of this.caches) {
      await cache.set(key, value, options);
    }
  }

  async invalidate(pattern: RegExp): Promise<number> {
    let count = 0;
    for (const cache of this.caches) {
      // 需要缓存支持 key 遍历
    }
    return count;
  }

  async invalidateTags(tags: string[]): Promise<number> {
    let total = 0;
    for (const cache of this.caches) {
      total += await cache.invalidateTags(tags);
    }
    return total;
  }

  getStats() {
    return this.caches.map(c => ({
      name: c.name,
      stats: c.getStats(),
    }));
  }

  private getPriority(cache: Cache<T>): number {
    const priorities: Record<string, number> = {
      memory: 1,
      disk: 2,
      semantic: 3,
    };
    return priorities[cache.name] || 99;
  }
}
```

## Token 优化

```typescript
// src/optimization/TokenOptimizer.ts

export interface TokenOptimizerOptions {
  maxContextTokens: number;
  reserveTokens: number;
  compressionRatio: number;
}

export class TokenOptimizer {
  private options: TokenOptimizerOptions;

  constructor(options: TokenOptimizerOptions) {
    this.options = options;
  }

  // 估算 token 数量（简化版）
  estimateTokens(text: string): number {
    // 粗略估算：平均每个 token 约 4 个字符
    return Math.ceil(text.length / 4);
  }

  // 压缩消息历史
  compressMessages(messages: Message[]): Message[] {
    const availableTokens = this.options.maxContextTokens - this.options.reserveTokens;
    let currentTokens = messages.reduce((sum, m) => sum + this.estimateTokens(m.content), 0);

    if (currentTokens <= availableTokens) {
      return messages;
    }

    // 策略1: 移除旧的工具结果
    const compressed = [...messages];
    for (let i = compressed.length - 1; i >= 0; i--) {
      if (compressed[i].role === 'tool') {
        // 简化工具结果
        compressed[i] = {
          ...compressed[i],
          content: this.summarizeToolResult(compressed[i].content),
        };

        currentTokens = this.recalculateTokens(compressed);
        if (currentTokens <= availableTokens) break;
      }
    }

    // 策略2: 摘要早期消息
    if (currentTokens > availableTokens) {
      return this.summarizeEarlyMessages(compressed, availableTokens);
    }

    return compressed;
  }

  // 智能截断文件内容
  smartTruncate(content: string, maxTokens: number): string {
    const lines = content.split('\n');
    const estimatedTokens = this.estimateTokens(content);

    if (estimatedTokens <= maxTokens) {
      return content;
    }

    // 保留文件头和关键部分
    const headLines = lines.slice(0, 50);
    const tailLines = lines.slice(-30);

    return [
      ...headLines,
      `\n... (${lines.length - 80} lines truncated) ...\n`,
      ...tailLines,
    ].join('\n');
  }

  // 构建高效提示
  buildEfficientPrompt(context: {
    files?: string[];
    query: string;
    history?: Message[];
  }): string {
    const parts: string[] = [];

    // 系统提示（简洁）
    parts.push('You are Claude Code, an AI coding assistant.');

    // 相关文件（带行号范围）
    if (context.files) {
      parts.push('\nRelevant files:');
      for (const file of context.files.slice(0, 10)) { // 限制文件数
        parts.push(`- ${file}`);
      }
    }

    // 历史摘要
    if (context.history && context.history.length > 0) {
      parts.push('\nConversation summary:');
      parts.push(this.summarizeHistory(context.history));
    }

    // 用户查询
    parts.push(`\nUser: ${context.query}`);

    return parts.join('\n');
  }

  private summarizeToolResult(content: string): string {
    // 简化工具输出
    if (content.length > 500) {
      return content.substring(0, 500) + `... (${content.length - 500} chars more)`;
    }
    return content;
  }

  private summarizeHistory(messages: Message[]): string {
    // 提取关键信息
    const topics = new Set<string>();
    const files = new Set<string>();

    for (const msg of messages) {
      // 提取文件名
      const fileMatches = msg.content.match(/\b\w+\.(ts|js|py|java|go|rs)\b/g);
      fileMatches?.forEach(f => files.add(f));
    }

    return [
      `Files discussed: ${Array.from(files).slice(0, 5).join(', ')}`,
    ].join('; ');
  }

  private summarizeEarlyMessages(messages: Message[], maxTokens: number): Message[] {
    // 保留系统消息和最近的对话
    const systemMsg = messages.find(m => m.role === 'system');
    const recentMessages = messages.slice(-10);

    const result: Message[] = [];
    if (systemMsg) result.push(systemMsg);

    // 添加摘要消息
    const earlyMessages = messages.slice(0, -10);
    if (earlyMessages.length > 0) {
      result.push({
        role: 'system',
        content: `[Earlier conversation summarized: ${this.summarizeHistory(earlyMessages)}]`,
        timestamp: Date.now(),
      });
    }

    result.push(...recentMessages);
    return result;
  }

  private recalculateTokens(messages: Message[]): number {
    return messages.reduce((sum, m) => sum + this.estimateTokens(m.content), 0);
  }
}
```

## 成本监控

```typescript
// src/optimization/CostTracker.ts

export interface APICall {
  timestamp: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  duration: number;
  cacheHit: boolean;
}

export class CostTracker {
  private calls: APICall[] = [];
  private modelPrices: Record<string, { input: number; output: number }> = {
    'claude-opus-4-6': { input: 15, output: 75 }, // per 1M tokens
    'claude-sonnet-4-6': { input: 3, output: 15 },
    'claude-haiku-4-5': { input: 0.25, output: 1.25 },
  };

  track(call: Omit<APICall, 'cost'>): void {
    const price = this.modelPrices[call.model] || { input: 3, output: 15 };
    const inputCost = (call.inputTokens / 1_000_000) * price.input;
    const outputCost = (call.outputTokens / 1_000_000) * price.output;

    this.calls.push({
      ...call,
      cost: inputCost + outputCost,
    });
  }

  getStats(timeRange: 'session' | 'day' | 'week' = 'session') {
    const cutoff = this.getCutoffTime(timeRange);
    const relevant = this.calls.filter(c => c.timestamp >= cutoff);

    const totalTokens = relevant.reduce((sum, c) => sum + c.inputTokens + c.outputTokens, 0);
    const totalCost = relevant.reduce((sum, c) => sum + c.cost, 0);
    const cacheHits = relevant.filter(c => c.cacheHit).length;

    return {
      totalCalls: relevant.length,
      totalTokens,
      totalCost,
      cacheHitRate: relevant.length > 0 ? cacheHits / relevant.length : 0,
      averageLatency: relevant.length > 0
        ? relevant.reduce((sum, c) => sum + c.duration, 0) / relevant.length
        : 0,
      byModel: this.groupByModel(relevant),
    };
  }

  private getCutoffTime(range: string): number {
    const now = Date.now();
    switch (range) {
      case 'day': return now - 24 * 60 * 60 * 1000;
      case 'week': return now - 7 * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  }

  private groupByModel(calls: APICall[]) {
    const grouped: Record<string, { calls: number; tokens: number; cost: number }> = {};

    for (const call of calls) {
      if (!grouped[call.model]) {
        grouped[call.model] = { calls: 0, tokens: 0, cost: 0 };
      }
      grouped[call.model].calls++;
      grouped[call.model].tokens += call.inputTokens + call.outputTokens;
      grouped[call.model].cost += call.cost;
    }

    return grouped;
  }

  exportReport(): string {
    const stats = this.getStats('session');

    return `
API Usage Report
================
Total Calls: ${stats.totalCalls}
Total Tokens: ${stats.totalTokens.toLocaleString()}
Total Cost: $${stats.totalCost.toFixed(4)}
Cache Hit Rate: ${(stats.cacheHitRate * 100).toFixed(1)}%
Avg Latency: ${stats.averageLatency.toFixed(0)}ms

By Model:
${Object.entries(stats.byModel).map(([model, s]) =>
  `  ${model}: ${s.calls} calls, ${s.tokens.toLocaleString()} tokens, $${s.cost.toFixed(4)}`
).join('\n')}
    `.trim();
  }
}
```

## 本章小结

- ✓ 多级缓存系统（Memory → Semantic）
- ✓ Token 优化策略
- ✓ 成本监控与分析
- ✓ 智能压缩与摘要

**下一步**: [Ch12: MCP 协议](/claude_from_scratch/part3/ch12-mcp-protocol.html) - Model Context Protocol 实现。
