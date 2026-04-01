---
title: "Ch9: 配置与持久化"
description: "构建企业级分层配置系统，支持 Enterprise → User 级联覆盖"
part: "核心篇"
order: 9
---

# Ch9: 配置与持久化

本章我们将构建企业级的分层配置系统，支持从企业级到用户级的级联覆盖，以及安全的敏感信息管理和配置版本控制。

## 目标

- 设计分层配置架构
- 实现级联覆盖机制
- 支持敏感信息加密
- 配置版本控制与回滚

## 配置层级

```
┌─────────────────────────────────────────────────────────────┐
│                    Configuration Layers                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Enterprise Config   (/etc/claude/enterprise.toml)  │   │
│   │  - Security policies                                │   │
│   │  - Allowed models                                   │   │
│   │  - Audit settings                                   │   │
│   └─────────────────────────────────────────────────────┘   │
│                          ↓ (可被覆盖)                        │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Project Config      (.claude/config.toml)          │   │
│   │  - Project-specific tools                           │   │
│   │  - Team conventions                                 │   │
│   │  - CI/CD integration                                │   │
│   └─────────────────────────────────────────────────────┘   │
│                          ↓ (可被覆盖)                        │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  User Config         (~/.claude/config.toml)        │   │
│   │  - Personal preferences                             │   │
│   │  - API keys (encrypted)                             │   │
│   │  - Custom themes                                    │   │
│   └─────────────────────────────────────────────────────┘   │
│                          ↓ (可被覆盖)                        │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Session Config      (环境变量 / CLI 参数)            │   │
│   │  - --model claude-opus                              │   │
│   │  - --verbose                                        │   │
│   │  - CLAUDE_API_KEY                                   │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 配置 Schema 定义

```typescript
// src/config/Schema.ts

import { z } from 'zod';

// API 配置
export const ApiConfigSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'azure']),
  apiKey: z.string().optional(), // 敏感，可能加密存储
  baseUrl: z.string().url().optional(),
  model: z.string().default('claude-sonnet-4-6'),
  maxTokens: z.number().default(4096),
  temperature: z.number().min(0).max(2).default(0.7),
});

// 安全策略
export const SecurityPolicySchema = z.object({
  defaultPermissionLevel: z.enum(['allow', 'confirm', 'deny']).default('confirm'),
  autoAllowReadOnly: z.boolean().default(true),
  forbiddenPaths: z.array(z.string()).default([]),
  allowedPaths: z.array(z.string()).default([]),
  requireApprovalFor: z.array(z.string()).default(['Bash', 'Edit']),
  auditLogPath: z.string().optional(),
});

// 工具配置
export const ToolConfigSchema = z.object({
  enabled: z.record(z.boolean()).default({}),
  aliases: z.record(z.string()).default({}),
  timeouts: z.record(z.number()).default({}),
  customTools: z.array(z.string()).default([]), // 自定义工具路径
});

// UI 配置
export const UIConfigSchema = z.object({
  theme: z.enum(['dark', 'light', 'auto']).default('dark'),
  language: z.enum(['zh', 'en', 'ja']).default('zh'),
  showToolCalls: z.boolean().default(true),
  syntaxHighlight: z.boolean().default(true),
  pager: z.string().default('less'),
  editor: z.string().default('vim'),
});

// 完整配置
export const ConfigSchema = z.object({
  version: z.string().default('1.0.0'),

  api: ApiConfigSchema.default({}),
  security: SecurityPolicySchema.default({}),
  tools: ToolConfigSchema.default({}),
  ui: UIConfigSchema.default({}),

  // 扩展配置（插件使用）
  extensions: z.record(z.any()).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;
export type ApiConfig = z.infer<typeof ApiConfigSchema>;
export type SecurityPolicy = z.infer<typeof SecurityPolicySchema>;
```

## 配置源接口

```typescript
// src/config/Source.ts

import { Config } from './Schema.js';

export interface ConfigSource {
  name: string;
  priority: number; // 数字越大优先级越高
  readonly: boolean; // 是否只读

  load(): Promise<Partial<Config>>;
  save?(config: Partial<Config>): Promise<void>;
  watch?(callback: (config: Partial<Config>) => void): void;
}

// 环境变量配置源
export class EnvConfigSource implements ConfigSource {
  name = 'environment';
  priority = 100;
  readonly = true;

  async load(): Promise<Partial<Config>> {
    const config: Partial<Config> = {};

    if (process.env.CLAUDE_API_KEY) {
      config.api = {
        provider: 'anthropic',
        apiKey: process.env.CLAUDE_API_KEY,
      };
    }

    if (process.env.CLAUDE_MODEL) {
      config.api = {
        ...config.api,
        model: process.env.CLAUDE_MODEL,
      };
    }

    if (process.env.CLAUDE_THEME) {
      config.ui = {
        theme: process.env.CLAUDE_THEME as 'dark' | 'light',
      };
    }

    return config;
  }
}

// CLI 参数配置源
export class CLIConfigSource implements ConfigSource {
  name = 'cli';
  priority = 90;
  readonly = true;

  private args: Record<string, any>;

  constructor(args: Record<string, any>) {
    this.args = args;
  }

  async load(): Promise<Partial<Config>> {
    const config: Partial<Config> = {};

    if (this.args.model) {
      config.api = { model: this.args.model };
    }

    if (this.args.theme) {
      config.ui = { theme: this.args.theme };
    }

    if (this.args.verbose !== undefined) {
      config.ui = { ...config.ui, showToolCalls: this.args.verbose };
    }

    return config;
  }
}

// 文件配置源
export class FileConfigSource implements ConfigSource {
  name: string;
  priority: number;
  readonly = false;

  private filePath: string;
  private encryptor?: ConfigEncryptor;

  constructor(filePath: string, priority: number, encryptor?: ConfigEncryptor) {
    this.filePath = filePath;
    this.priority = priority;
    this.name = `file:${path.basename(filePath)}`;
    this.encryptor = encryptor;
  }

  async load(): Promise<Partial<Config>> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      let decrypted = content;

      if (this.encryptor && content.startsWith('encrypted:')) {
        decrypted = await this.encryptor.decrypt(content.slice(10));
      }

      const parsed = this.parseToml(decrypted);
      return ConfigSchema.partial().parse(parsed);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        return {};
      }
      throw e;
    }
  }

  async save(config: Partial<Config>): Promise<void> {
    const content = this.serializeToml(config);
    let output = content;

    if (this.encryptor) {
      output = 'encrypted:' + await this.encryptor.encrypt(content);
    }

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, output, 'utf-8');
  }

  private parseToml(content: string): any {
    // 简化实现，实际使用 @iarna/toml
    const result: any = {};
    let currentSection: any = result;

    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // 章节 [section]
      const sectionMatch = trimmed.match(/^\[(.+?)\]$/);
      if (sectionMatch) {
        const section = sectionMatch[1];
        result[section] = result[section] || {};
        currentSection = result[section];
        continue;
      }

      // 键值对 key = value
      const kvMatch = trimmed.match(/^(.+?)\s*=\s*(.+)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim();
        const value = kvMatch[2].trim().replace(/^["']|["']$/g, '');
        currentSection[key] = this.parseValue(value);
      }
    }

    return result;
  }

  private parseValue(value: string): any {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (/^\d+$/.test(value)) return parseInt(value);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
    if (value.startsWith('[') && value.endsWith(']')) {
      return value.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    }
    return value;
  }

  private serializeToml(config: any): string {
    const lines: string[] = [];

    for (const [section, values] of Object.entries(config)) {
      lines.push(`[${section}]`);
      for (const [key, value] of Object.entries(values as object)) {
        if (Array.isArray(value)) {
          lines.push(`${key} = [${value.map(v => `"${v}"`).join(', ')}]`);
        } else if (typeof value === 'string') {
          lines.push(`${key} = "${value}"`);
        } else {
          lines.push(`${key} = ${value}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
```

## 配置管理器

```typescript
// src/config/Manager.ts

import { Config, ConfigSchema } from './Schema.js';
import { ConfigSource } from './Source.js';
import { EventEmitter } from 'events';

export class ConfigManager extends EventEmitter {
  private sources: ConfigSource[] = [];
  private cache: Config | null = null;
  private cacheValid = false;

  registerSource(source: ConfigSource): void {
    this.sources.push(source);
    this.sources.sort((a, b) => b.priority - a.priority);
    this.cacheValid = false;

    // 监听变化
    if (source.watch) {
      source.watch((partial) => {
        this.cacheValid = false;
        this.emit('change', { source: source.name, config: partial });
      });
    }
  }

  async load(): Promise<Config> {
    if (this.cacheValid && this.cache) {
      return this.cache;
    }

    const merged: Partial<Config> = {};

    // 从低优先级到高优先级加载
    const sortedSources = [...this.sources].sort((a, b) => a.priority - b.priority);

    for (const source of sortedSources) {
      try {
        const partial = await source.load();
        this.deepMerge(merged, partial);
      } catch (e) {
        console.warn(`Failed to load config from ${source.name}:`, e);
      }
    }

    // 验证并填充默认值
    this.cache = ConfigSchema.parse(merged);
    this.cacheValid = true;

    return this.cache;
  }

  async get<K extends keyof Config>(key: K): Promise<Config[K]> {
    const config = await this.load();
    return config[key];
  }

  async set<K extends keyof Config>(key: K, value: Config[K]): Promise<void> {
    // 找到最高优先级的可写源
    const writableSource = this.sources
      .filter(s => !s.readonly && s.save)
      .sort((a, b) => b.priority - a.priority)[0];

    if (!writableSource) {
      throw new Error('No writable config source available');
    }

    const partial: Partial<Config> = { [key]: value };
    await writableSource.save(partial);

    this.cacheValid = false;
    this.emit('change', { source: writableSource.name, key, value });
  }

  // 获取某个键的有效配置（考虑级联）
  async getEffective<K extends keyof Config>(
    key: K,
    scope: 'enterprise' | 'project' | 'user' = 'user'
  ): Promise<Config[K]> {
    const config = await this.load();
    return config[key];
  }

  private deepMerge(target: any, source: any): void {
    for (const key of Object.keys(source)) {
      if (source[key] === null || source[key] === undefined) {
        continue;
      }

      if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
        target[key] = target[key] || {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  invalidateCache(): void {
    this.cacheValid = false;
  }
}

export const configManager = new ConfigManager();
```

## 配置加密器

```typescript
// src/config/Encryptor.ts

import crypto from 'crypto';

export interface ConfigEncryptor {
  encrypt(plaintext: string): Promise<string>;
  decrypt(ciphertext: string): Promise<string>;
}

export class MasterKeyEncryptor implements ConfigEncryptor {
  private masterKey: Buffer;

  constructor(masterKey: string) {
    // 从环境变量或密钥管理系统获取
    this.masterKey = crypto.scryptSync(masterKey, 'claude-config-salt', 32);
  }

  async encrypt(plaintext: string): Promise<string> {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  async decrypt(ciphertext: string): Promise<string> {
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// OS 密钥链加密器（使用系统密钥链）
export class KeychainEncryptor implements ConfigEncryptor {
  async encrypt(plaintext: string): Promise<string> {
    // 实际实现使用 keytar 或其他密钥链库
    // 简化示例
    return Buffer.from(plaintext).toString('base64');
  }

  async decrypt(ciphertext: string): Promise<string> {
    return Buffer.from(ciphertext, 'base64').toString('utf8');
  }
}
```

## 配置版本控制

```typescript
// src/config/VersionControl.ts

import { Config } from './Schema.js';

export interface ConfigVersion {
  id: string;
  timestamp: number;
  author: string;
  message: string;
  config: Config;
  diff: ConfigDiff;
}

export interface ConfigDiff {
  added: string[]; // 路径列表
  removed: string[];
  modified: string[];
}

export class ConfigVersionControl {
  private versions: ConfigVersion[] = [];
  private maxVersions = 50;

  async commit(
    config: Config,
    message: string,
    author: string
  ): Promise<ConfigVersion> {
    const previous = this.versions[this.versions.length - 1];
    const diff = previous ? this.calculateDiff(previous.config, config) : { added: [], removed: [], modified: [] };

    const version: ConfigVersion = {
      id: this.generateVersionId(),
      timestamp: Date.now(),
      author,
      message,
      config: JSON.parse(JSON.stringify(config)), // 深拷贝
      diff,
    };

    this.versions.push(version);

    // 限制历史数量
    if (this.versions.length > this.maxVersions) {
      this.versions = this.versions.slice(-this.maxVersions);
    }

    await this.saveVersions();
    return version;
  }

  async rollback(versionId: string): Promise<Config> {
    const version = this.versions.find(v => v.id === versionId);
    if (!version) {
      throw new Error(`Version not found: ${versionId}`);
    }

    return JSON.parse(JSON.stringify(version.config));
  }

  getHistory(): ConfigVersion[] {
    return [...this.versions].reverse();
  }

  getVersion(id: string): ConfigVersion | undefined {
    return this.versions.find(v => v.id === id);
  }

  private calculateDiff(oldConfig: Config, newConfig: Config): ConfigDiff {
    const diff: ConfigDiff = { added: [], removed: [], modified: [] };

    const oldPaths = this.getAllPaths(oldConfig);
    const newPaths = this.getAllPaths(newConfig);

    for (const path of newPaths) {
      if (!oldPaths.has(path)) {
        diff.added.push(path);
      } else if (this.getValueAtPath(oldConfig, path) !== this.getValueAtPath(newConfig, path)) {
        diff.modified.push(path);
      }
    }

    for (const path of oldPaths) {
      if (!newPaths.has(path)) {
        diff.removed.push(path);
      }
    }

    return diff;
  }

  private getAllPaths(obj: any, prefix = ''): Set<string> {
    const paths = new Set<string>();

    for (const key of Object.keys(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        for (const subPath of this.getAllPaths(obj[key], path)) {
          paths.add(subPath);
        }
      } else {
        paths.add(path);
      }
    }

    return paths;
  }

  private getValueAtPath(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  }

  private generateVersionId(): string {
    return `v${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  private async saveVersions(): Promise<void> {
    // 持久化到文件
    const versionsPath = path.join(os.homedir(), '.claude', 'versions.json');
    await fs.writeFile(versionsPath, JSON.stringify(this.versions, null, 2));
  }
}
```

## 配置初始化

```typescript
// src/config/init.ts

import { configManager } from './Manager.js';
import { EnvConfigSource, FileConfigSource } from './Source.js';
import { MasterKeyEncryptor } from './Encryptor.js';
import path from 'path';
import os from 'os';

export async function initializeConfig(cliArgs: Record<string, any>): Promise<void> {
  // 1. 企业级配置（只读，如存在）
  const enterprisePath = '/etc/claude/enterprise.toml';
  configManager.registerSource(
    new FileConfigSource(enterprisePath, 10)
  );

  // 2. 项目级配置
  const projectPath = path.join(process.cwd(), '.claude', 'config.toml');
  configManager.registerSource(
    new FileConfigSource(projectPath, 20)
  );

  // 3. 用户级配置（加密）
  const userPath = path.join(os.homedir(), '.claude', 'config.toml');
  const encryptor = process.env.CLAUDE_MASTER_KEY
    ? new MasterKeyEncryptor(process.env.CLAUDE_MASTER_KEY)
    : undefined;
  configManager.registerSource(
    new FileConfigSource(userPath, 30, encryptor)
  );

  // 4. 环境变量
  configManager.registerSource(new EnvConfigSource());

  // 5. CLI 参数（最高优先级）
  configManager.registerSource(new CLIConfigSource(cliArgs));

  // 加载配置
  await configManager.load();

  // 监听变化
  configManager.on('change', ({ source, key }) => {
    console.log(`Config changed: ${key} (from ${source})`);
  });
}
```

## 使用示例

```toml
# ~/.claude/config.toml
[api]
apiKey = "sk-xxx"  # 将被加密
model = "claude-sonnet-4-6"
temperature = 0.5

[security]
autoAllowReadOnly = true
forbiddenPaths = ["/etc/passwd", "/etc/shadow"]
requireApprovalFor = ["Bash", "Edit"]

[tools]
enabled.Read = true
enabled.Edit = true
enabled.Bash = true
timeouts.Bash = 30000

[ui]
theme = "dark"
language = "zh"
showToolCalls = true
```

```typescript
// 代码中使用
import { configManager } from './config/Manager.js';

// 加载配置
const config = await configManager.load();
console.log(config.api.model);

// 获取特定配置
const apiConfig = await configManager.get('api');

// 更新配置
await configManager.set('ui', { theme: 'light', language: 'zh' });

// 监听变化
configManager.on('change', ({ source, key, value }) => {
  console.log(`${key} changed to ${value} (from ${source})`);
});
```

## 本章小结

- ✓ 分层配置架构
- ✓ 级联覆盖机制
- ✓ 敏感信息加密
- ✓ 配置版本控制

**下一步**: [Ch10: 消息流与 UI](/claude_from_scratch/part2/ch10-message-stream.html) - 流畅的用户体验。
