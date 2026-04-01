---
title: "Ch13: 企业部署"
description: "私有化部署、运维监控和安全加固，生产环境完整方案"
part: "高级篇"
order: 13
---

# Ch13: 企业部署

本章我们将完成企业级的私有化部署方案，包括运维监控、安全加固和生产环境最佳实践。

## 目标

- 私有化部署架构
- Docker 容器化
- 运维监控体系
- 安全加固策略

## 部署架构

```
┌─────────────────────────────────────────────────────────────┐
│                   Enterprise Architecture                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────┐      ┌─────────────┐      ┌──────────┐   │
│   │   Load      │──────▶   Claude    │──────▶   LLM    │   │
│   │   Balancer  │      │   Code      │      │   API    │   │
│   └─────────────┘      └──────┬──────┘      └──────────┘   │
│                               │                             │
│                    ┌──────────┼──────────┐                 │
│                    ↓          ↓          ↓                 │
│               ┌────────┐  ┌────────┐  ┌────────┐          │
│               │  Redis │  │  DB    │  │  Log   │          │
│               │ (Cache)│  │ (State)│  │(Audit) │          │
│               └────────┘  └────────┘  └────────┘          │
│                                                              │
│   ┌────────────────────────────────────────────────────┐  │
│   │              Monitoring Stack                       │  │
│   │  Prometheus + Grafana + Alertmanager               │  │
│   └────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Docker 容器化

```dockerfile
# Dockerfile
FROM node:20-slim

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制源码
COPY dist/ ./dist/
COPY config/ ./config/

# 创建非 root 用户
RUN useradd -m -s /bin/bash claude && \
    chown -R claude:claude /app
USER claude

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node dist/healthcheck.js || exit 1

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  claude-code:
    build: .
    image: claude-code:latest
    container_name: claude-code
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgres://postgres:postgres@db:5432/claude
      - LOG_LEVEL=info
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    depends_on:
      - redis
      - db
    networks:
      - claude-net

  redis:
    image: redis:7-alpine
    container_name: claude-redis
    restart: unless-stopped
    volumes:
      - redis-data:/data
    networks:
      - claude-net

  db:
    image: postgres:15-alpine
    container_name: claude-db
    restart: unless-stopped
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=claude
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - claude-net

  prometheus:
    image: prom/prometheus:latest
    container_name: claude-prometheus
    restart: unless-stopped
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - claude-net

  grafana:
    image: grafana/grafana:latest
    container_name: claude-grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    ports:
      - "3001:3000"
    networks:
      - claude-net

volumes:
  redis-data:
  postgres-data:
  prometheus-data:
  grafana-data:

networks:
  claude-net:
    driver: bridge
```

## Prometheus 监控

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets: []

rule_files: []

scrape_configs:
  - job_name: 'claude-code'
    static_configs:
      - targets: ['claude-code:3000']
    metrics_path: '/metrics'

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
```

```typescript
// src/monitoring/Metrics.ts

import { EventEmitter } from 'events';

interface MetricValue {
  timestamp: number;
  value: number;
  labels: Record<string, string>;
}

export class MetricsCollector extends EventEmitter {
  private gauges = new Map<string, MetricValue[]>();
  private counters = new Map<string, number>();
  private histograms = new Map<string, number[]>();

  // Gauge: 可上下波动的值
  gauge(name: string, value: number, labels: Record<string, string> = {}): void {
    if (!this.gauges.has(name)) {
      this.gauges.set(name, []);
    }

    const values = this.gauges.get(name)!;
    values.push({
      timestamp: Date.now(),
      value,
      labels,
    });

    // 保留最近 1000 个数据点
    if (values.length > 1000) {
      values.shift();
    }

    this.emit('gauge', { name, value, labels });
  }

  // Counter: 单调递增的计数器
  counter(name: string, increment: number = 1, labels: Record<string, string> = {}): void {
    const key = `${name}${JSON.stringify(labels)}`;
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + increment);
    this.emit('counter', { name, value: current + increment, labels });
  }

  // Histogram: 分布统计
  histogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = `${name}${JSON.stringify(labels)}`;
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }

    const values = this.histograms.get(key)!;
    values.push(value);

    // 保留最近 10000 个样本
    if (values.length > 10000) {
      values.shift();
    }

    this.emit('histogram', { name, value, labels });
  }

  // 生成 Prometheus 格式输出
  exportPrometheus(): string {
    const lines: string[] = [];

    // Gauges
    for (const [name, values] of this.gauges) {
      lines.push(`# HELP ${name} Gauge metric`);
      lines.push(`# TYPE ${name} gauge`);

      const latest = values[values.length - 1];
      if (latest) {
        const labelStr = Object.entries(latest.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        lines.push(`${name}{${labelStr}} ${latest.value}`);
      }
    }

    // Counters
    lines.push('');
    for (const [key, value] of this.counters) {
      const [name, ...labelParts] = key.split('{');
      lines.push(`# HELP ${name} Counter metric`);
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name}${labelParts.join('{') || ''} ${value}`);
    }

    return lines.join('\n');
  }

  getStats(): {
    gauges: Record<string, number>;
    counters: Record<string, number>;
    histograms: Record<string, { count: number; sum: number; avg: number; p95: number }>;
  } {
    const histogramStats: Record<string, { count: number; sum: number; avg: number; p95: number }> = {};

    for (const [key, values] of this.histograms) {
      if (values.length === 0) continue;

      const sorted = [...values].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      const p95Index = Math.floor(sorted.length * 0.95);

      histogramStats[key] = {
        count: sorted.length,
        sum,
        avg: sum / sorted.length,
        p95: sorted[p95Index],
      };
    }

    return {
      gauges: Object.fromEntries(
        Array.from(this.gauges).map(([k, v]) => [k, v[v.length - 1]?.value || 0])
      ),
      counters: Object.fromEntries(this.counters),
      histograms: histogramStats,
    };
  }
}

export const metrics = new MetricsCollector();
```

```typescript
// src/monitoring/HTTPExporter.ts

import http from 'http';
import { metrics } from './Metrics.js';

export function startMetricsServer(port: number = 9090): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === '/metrics') {
      const prometheusData = metrics.exportPrometheus();
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(prometheusData);
    } else if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(port, () => {
    console.log(`Metrics server listening on port ${port}`);
  });

  return server;
}
```

## 审计日志

```typescript
// src/monitoring/AuditLogger.ts

import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

export interface AuditEvent {
  id: string;
  timestamp: number;
  type: 'tool_call' | 'permission_check' | 'file_access' | 'config_change';
  severity: 'info' | 'warning' | 'error' | 'critical';
  user?: string;
  session?: string;
  details: Record<string, any>;
}

export class AuditLogger extends EventEmitter {
  private logDir: string;
  private currentFile: string;
  private maxFileSize = 10 * 1024 * 1024; // 10MB
  private maxFiles = 10;

  constructor(logDir: string = './logs/audit') {
    super();
    this.logDir = logDir;
    this.currentFile = path.join(logDir, 'audit.log');
    this.ensureDirectory();
  }

  private async ensureDirectory(): Promise<void> {
    await fs.mkdir(this.logDir, { recursive: true });
  }

  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: AuditEvent = {
      ...event,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    // 写入日志文件
    const logLine = JSON.stringify(fullEvent) + '\n';
    await fs.appendFile(this.currentFile, logLine);

    // 检查文件大小
    await this.rotateIfNeeded();

    // 发送实时事件
    this.emit('event', fullEvent);

    // 严重事件立即告警
    if (event.severity === 'critical') {
      this.emit('alert', fullEvent);
    }
  }

  async query(options: {
    startTime?: number;
    endTime?: number;
    types?: string[];
    severity?: string;
    user?: string;
    limit?: number;
  }): Promise<AuditEvent[]> {
    const files = await this.getLogFiles();
    const events: AuditEvent[] = [];

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.trim().split('\n');

      for (const line of lines) {
        try {
          const event = JSON.parse(line) as AuditEvent;

          // 过滤
          if (options.startTime && event.timestamp < options.startTime) continue;
          if (options.endTime && event.timestamp > options.endTime) continue;
          if (options.types && !options.types.includes(event.type)) continue;
          if (options.severity && event.severity !== options.severity) continue;
          if (options.user && event.user !== options.user) continue;

          events.push(event);
        } catch {
          // 跳过无效行
        }
      }
    }

    // 排序和限制
    events.sort((a, b) => b.timestamp - a.timestamp);
    return events.slice(0, options.limit || 100);
  }

  private async rotateIfNeeded(): Promise<void> {
    try {
      const stats = await fs.stat(this.currentFile);
      if (stats.size > this.maxFileSize) {
        await this.rotate();
      }
    } catch {
      // 文件不存在，忽略
    }
  }

  private async rotate(): Promise<void> {
    // 重命名现有文件
    const timestamp = Date.now();
    const newFile = path.join(this.logDir, `audit-${timestamp}.log`);
    await fs.rename(this.currentFile, newFile);

    // 清理旧文件
    await this.cleanupOldFiles();
  }

  private async cleanupOldFiles(): Promise<void> {
    const files = await this.getLogFiles();
    if (files.length > this.maxFiles) {
      const toDelete = files.slice(this.maxFiles);
      for (const file of toDelete) {
        await fs.unlink(file);
      }
    }
  }

  private async getLogFiles(): Promise<string[]> {
    const entries = await fs.readdir(this.logDir);
    return entries
      .filter(f => f.startsWith('audit') && f.endsWith('.log'))
      .map(f => path.join(this.logDir, f))
      .sort();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

export const auditLogger = new AuditLogger();
```

## 安全加固

```typescript
// src/security/Hardening.ts

import crypto from 'crypto';
import { configManager } from '../config/Manager.js';

export interface SecurityPolicy {
  // API 安全
  apiKeyRotationDays: number;
  maxRequestsPerMinute: number;
  maxTokensPerRequest: number;

  // 文件安全
  allowedPaths: string[];
  forbiddenPaths: string[];
  requireApprovalForDestructive: boolean;

  // 网络安全
  allowedHosts: string[];
  blockedHosts: string[];
  requireHttps: boolean;

  // 审计
  auditAllRequests: boolean;
  auditFileAccess: boolean;
  retentionDays: number;
}

export class SecurityHardening {
  private policy: SecurityPolicy;

  constructor(policy: SecurityPolicy) {
    this.policy = policy;
  }

  // 验证文件路径
  validateFilePath(filePath: string): { allowed: boolean; reason?: string } {
    const resolved = path.resolve(filePath);

    // 检查禁止路径
    for (const forbidden of this.policy.forbiddenPaths) {
      if (resolved.startsWith(forbidden)) {
        return {
          allowed: false,
          reason: `Access to system path forbidden: ${forbidden}`,
        };
      }
    }

    // 检查允许路径
    if (this.policy.allowedPaths.length > 0) {
      const isAllowed = this.policy.allowedPaths.some(allowed =>
        resolved.startsWith(allowed)
      );
      if (!isAllowed) {
        return {
          allowed: false,
          reason: 'Path outside allowed directories',
        };
      }
    }

    return { allowed: true };
  }

  // 验证网络请求
  validateNetworkRequest(url: string): { allowed: boolean; reason?: string } {
    const hostname = new URL(url).hostname;

    // 检查禁止主机
    if (this.policy.blockedHosts.includes(hostname)) {
      return {
        allowed: false,
        reason: `Host blocked: ${hostname}`,
      };
    }

    // 检查允许主机
    if (this.policy.allowedHosts.length > 0) {
      if (!this.policy.allowedHosts.includes(hostname)) {
        return {
          allowed: false,
          reason: `Host not in allowlist: ${hostname}`,
        };
      }
    }

    // HTTPS 检查
    if (this.policy.requireHttps && !url.startsWith('https://')) {
      return {
        allowed: false,
        reason: 'HTTPS required',
      };
    }

    return { allowed: true };
  }

  // 速率限制检查
  checkRateLimit(clientId: string, requestCount: number): {
    allowed: boolean;
    retryAfter?: number;
  } {
    if (requestCount > this.policy.maxRequestsPerMinute) {
      return {
        allowed: false,
        retryAfter: 60,
      };
    }
    return { allowed: true };
  }

  // 敏感数据脱敏
  sanitizeOutput(output: string): string {
    // API Key 脱敏
    let sanitized = output.replace(
      /sk-[a-zA-Z0-9]{48}/g,
      'sk-********************************'
    );

    // 密码脱敏
    sanitized = sanitized.replace(
      /password[=:]\s*\S+/gi,
      'password=*****'
    );

    // Token 脱敏
    sanitized = sanitized.replace(
      /[a-f0-9]{64}/g,
      '********************************'
    );

    return sanitized;
  }

  // 生成安全报告
  async generateSecurityReport(): Promise<{
    status: 'secure' | 'warning' | 'critical';
    findings: Array<{
      severity: 'info' | 'warning' | 'critical';
      category: string;
      message: string;
      recommendation: string;
    }>;
  }> {
    const findings: Array<{
      severity: 'info' | 'warning' | 'critical';
      category: string;
      message: string;
      recommendation: string;
    }> = [];

    // 检查 API Key
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      findings.push({
        severity: 'critical',
        category: 'credentials',
        message: 'API key not configured',
        recommendation: 'Set CLAUDE_API_KEY environment variable',
      });
    } else if (apiKey.length < 40) {
      findings.push({
        severity: 'warning',
        category: 'credentials',
        message: 'API key appears to be malformed',
        recommendation: 'Verify API key format',
      });
    }

    // 检查配置
    const config = await configManager.load();
    if (!config.security.requireApprovalFor?.includes('Bash')) {
      findings.push({
        severity: 'warning',
        category: 'permissions',
        message: 'Bash tool may be auto-allowed',
        recommendation: 'Enable confirmation for Bash tool',
      });
    }

    const hasCritical = findings.some(f => f.severity === 'critical');
    const hasWarning = findings.some(f => f.severity === 'warning');

    return {
      status: hasCritical ? 'critical' : hasWarning ? 'warning' : 'secure',
      findings,
    };
  }
}
```

## 部署脚本

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Deploying Claude Code..."

# 检查环境
if [ -z "$CLAUDE_API_KEY" ]; then
    echo "❌ CLAUDE_API_KEY not set"
    exit 1
fi

# 构建
echo "📦 Building..."
npm ci
npm run build

# 运行安全扫描
echo "🔒 Running security scan..."
npm audit

# 启动服务
echo "🐳 Starting services..."
docker-compose down
docker-compose up -d --build

# 健康检查
echo "🏥 Health check..."
sleep 5
curl -f http://localhost:3000/health || {
    echo "❌ Health check failed"
    exit 1
}

echo "✅ Deployment complete!"
echo ""
echo "📊 Monitoring:"
echo "  - Application: http://localhost:3000"
echo "  - Metrics:     http://localhost:9090"
echo "  - Dashboard:   http://localhost:3001"
```

## Nginx 配置（生产）

```nginx
# nginx.conf
upstream claude_code {
    server localhost:3000;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name claude.example.com;

    # SSL 配置
    ssl_certificate /etc/ssl/certs/claude.crt;
    ssl_certificate_key /etc/ssl/private/claude.key;
    ssl_protocols TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 安全头部
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # 速率限制
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # 日志
    access_log /var/log/nginx/claude-access.log;
    error_log /var/log/nginx/claude-error.log;

    location / {
        proxy_pass http://claude_code;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 300s;

        # 流式响应
        proxy_buffering off;
    }

    location /metrics {
        # 限制访问
        allow 10.0.0.0/8;
        deny all;

        proxy_pass http://claude_code/metrics;
    }
}
```

## 本章小结

- ✓ Docker 容器化部署
- ✓ Prometheus + Grafana 监控
- ✓ 审计日志系统
- ✓ 安全加固策略
- ✓ 生产环境最佳实践

## 课程总结

恭喜！你已经完成了《从零构建 Claude Code》全部 13 章的学习。

### 你掌握的能力

| 篇 | 核心能力 |
|---|---------|
| 基础篇 | CLI 框架、LLM 连接、文件操作、Bash 执行、代码编辑 |
| 核心篇 | 工具系统、权限管理、Agent 系统、配置系统、消息流 UI |
| 高级篇 | 性能优化、MCP 协议、企业部署 |

### 下一步

- 构建你自己的 AI 编程助手
- 集成到团队工作流
- 贡献开源社区

**感谢学习！** 🎉
