# Claude From Scratch - 设计规格文档

**项目名称**: claude-from-scratch
**项目愿景**: 从零构建 Claude Code 完整指南
**目标受众**: 个人开发者学习 + 企业团队落地
**技术栈**: TypeScript/Node.js
**内容形式**: 纯文档型网站（13章渐进式教程）
**部署方式**: 阿里云服务器 + Nginx (/claude_from_scratch)
**设计风格**: Cyber-Brutalist 工业风

---

## 目录

1. [项目概述](#1-项目概述)
2. [信息架构](#2-信息架构)
3. [视觉设计系统](#3-视觉设计系统)
4. [技术实现方案](#4-技术实现方案)
5. [部署方案](#5-部署方案)
6. [内容大纲](#6-内容大纲)
7. [场景卡片规范](#7-场景卡片规范)
8. [企业适配章节](#8-企业适配章节)

---

## 1. 项目概述

### 1.1 项目定位

claude-from-scratch 是一个**教育型文档网站**，通过 13 章渐进式教程，教开发者从零开始构建一个功能完整的 Claude Code 替代方案。

不同于其他开源项目直接提供成品代码，本项目强调**"构建过程"**本身——每个决策背后的思考、架构的演进、遇到的坑和解决方案。

### 1.2 核心特色

| 特色 | 说明 |
|------|------|
| **渐进式构建** | 从可运行的 MVP 开始，逐步叠加功能，每章都有成就感 |
| **场景驱动** | 每章穿插真实使用场景，理解"为什么要做这个功能" |
| **架构深度** | 不只是一步步跟着做，而是理解 Claude Code 的设计哲学 |
| **企业适配** | 专门章节讲解私有化部署、定制开发、团队推广 |
| **工业风设计** | Cyber-Brutalist 视觉风格，代码优先的审美体验 |

### 1.3 目标读者画像

**个人开发者**
- 想深入理解 AI 编程助手的工作原理
- 希望基于 Claude Code 架构做自己的定制版本
- 学习 TypeScript 高级模式和系统架构设计

**企业团队**
- 需要在内部部署私有 AI 编程助手
- 希望集成自研工具到 AI 工作流
- 关注安全合规和审计需求

---

## 2. 信息架构

### 2.1 网站地图

```
claude-from-scratch/
├── index.html                    # 首页 - 项目介绍 + 快速导航
├── getting-started.html          # 开始阅读 - 环境准备 + 阅读指南
│
├── part1-foundation/             # Part 1: 基础篇
│   ├── index.html               # Part 1 概述
│   ├── ch1-cli-skeleton.html    # Ch1: 搭建骨架
│   ├── ch2-llm-connection.html  # Ch2: 连接大脑
│   ├── ch3-file-operations.html # Ch3: 读取世界
│   ├── ch4-bash-execution.html  # Ch4: 执行命令
│   └── ch5-code-editing.html    # Ch5: 编辑代码
│
├── part2-core/                   # Part 2: 核心篇
│   ├── index.html               # Part 2 概述
│   ├── ch6-tool-system.html     # Ch6: 工具系统
│   ├── ch7-permissions.html     # Ch7: 权限管理
│   ├── ch8-agent-system.html    # Ch8: Agent 系统
│   ├── ch9-configuration.html   # Ch9: 配置与持久化
│   └── ch10-message-stream.html # Ch10: 消息流与 UI
│
├── part3-advanced/               # Part 3: 高级篇
│   ├── index.html               # Part 3 概述
│   ├── ch11-performance.html    # Ch11: 性能与扩展
│   ├── ch12-mcp-protocol.html   # Ch12: MCP 协议
│   └── ch13-enterprise.html     # Ch13: 企业落地
│
├── appendix/                     # 附录
│   ├── architecture-reference.html    # 架构速查
│   ├── api-reference.html            # API 参考
│   ├── troubleshooting.html          # 常见问题
│   └── glossary.html                 # 术语表
│
├── scenarios/                    # 场景实验室（独立区域）
│   ├── index.html
│   ├── refactor-function.html
│   ├── multi-file-analysis.html
│   ├── git-workflow.html
│   └── custom-tool-integration.html
│
└── resources/                    # 静态资源
    ├── css/
    ├── js/
    ├── images/
    └── diagrams/
```

### 2.2 导航系统

**顶部导航栏**
- Logo: "CFS" + 项目名
- 主要链接: 首页 | Part 1 | Part 2 | Part 3 | 场景实验室 | 附录
- 搜索框（文档内搜索）
- 阅读进度指示器

**侧边章节导航**
- 当前 Part 的章节列表
- 每章的进度状态（未读/阅读中/已读）
- 当前章节的小节锚点

**面包屑导航**
`首页 > Part 1: 基础篇 > Ch3: 读取世界`

**上一篇/下一篇**
- 每章底部的章节切换
- 显示章节标题和简介预览

---

## 3. 视觉设计系统

### 3.1 设计哲学

**Cyber-Brutalist 工业风**

- **工业化**: 暴露结构、机械感、功能性优先
- **高对比**: 深色背景 + 亮色强调，代码清晰可读
- **几何感**: 直角边框、网格系统、对称布局
- **信息密度**: 紧凑但有序，适合技术阅读

### 3.2 色彩系统

```css
:root {
  /* 背景 */
  --bg-primary: #0a0a0b;        /* 主背景 - 近黑色 */
  --bg-secondary: #111113;      /* 次级背景 - 章节卡片 */
  --bg-tertiary: #1a1a1d;       /* 三级背景 - 代码块、信息框 */
  --bg-card: #141416;           /* 卡片背景 */

  /* 文字 */
  --text-primary: #f5f5f5;      /* 主文字 - 近白色 */
  --text-secondary: #8a8a8a;    /* 次级文字 - 描述 */
  --text-muted: #5a5a5a;        /* 弱化文字 - 注释 */

  /* 强调色 */
  --accent-primary: #ff6b35;    /* 主强调 - 电光橙 */
  --accent-secondary: #f7c548;  /* 次强调 - 琥珀黄 */
  --accent-cyan: #00d4aa;       /* 成功/提示 - 青绿色 */
  --accent-danger: #ff2d55;     /* 危险/错误 - 粉红 */

  /* 边框 */
  --border-color: #2a2a2e;      /* 标准边框 */
  --border-accent: #ff6b35;     /* 强调边框 */
}
```

### 3.3 字体系统

```css
/* 标题字体 */
font-family: 'Syne', sans-serif;
- H1: 48-72px, weight 800
- H2: 32-48px, weight 700
- H3: 24-32px, weight 700
- H4: 18-24px, weight 700

/* 正文字体 */
font-family: 'Space Mono', monospace;
- 正文: 14px, weight 400, line-height 1.7
- 代码: 13px, weight 400
- 注释: 12px, weight 400, italic
```

### 3.4 组件规范

#### 代码块

```
┌─────────────────────────────────────────┐
│ TypeScript    src/tools/ReadTool.ts    │  ← 语言 + 文件路径
├─────────────────────────────────────────┤
│                                         │
│  export class ReadTool {               │  ← 代码内容
│    async execute(...) {                │
│      // ...                            │
│    }                                    │
│  }                                      │
│                                         │
└─────────────────────────────────────────┘
```

- 深色背景 (#0d0d0f)
- 语法高亮：VS Code Dark+ 主题风格
- 行号显示
- 复制按钮（hover 显示）
- 文件名标注

#### 场景卡片

```
┌─────────────────────────────────────────┐
│  💡 场景: 帮我重构这个函数              │
├─────────────────────────────────────────┤
│                                         │
│  用户输入:                              │
│  "帮我重构这段代码，提取重复逻辑"        │
│                                         │
│  系统需要:                              │
│  • 读取指定文件                         │
│  • 分析代码结构                         │
│  • 生成重构方案                         │
│  • 应用编辑并保存                       │
│                                         │
│  涉及: [Read] → [Analyze] → [Edit]     │
│                                         │
└─────────────────────────────────────────┘
```

- 左侧 4px 琥珀色边框
- 图标 + 标题
- 结构化内容

#### 信息框

- **提示 (Tip)**: 青绿色左边框，💡 图标
- **注意 (Note)**: 橙色左边框，📌 图标
- **警告 (Warning)**: 粉红色左边框，⚠️ 图标

#### 章节导航卡片

- 大号章节数字（Syne 字体）
- 标题 + 简介
- 阅读状态指示
- Hover 显示边框高亮

---

## 4. 技术实现方案

### 4.1 技术选型

| 层级 | 技术 | 说明 |
|------|------|------|
| **构建工具** | Node.js + 自定义脚本 | 简单的静态站点生成 |
| **模板引擎** | EJS / Handlebars | HTML 模板复用 |
| **样式** | 原生 CSS + CSS Variables | 无框架依赖，轻量 |
| **交互** | 原生 JavaScript | 导航、搜索、主题切换 |
| **代码高亮** | Prism.js / highlight.js | 语法高亮 |
| **搜索** | Lunr.js / Fuse.js | 客户端全文搜索 |

### 4.2 项目结构

```
claude-from-scratch/
├── build/                    # 构建脚本
│   ├── build.js             # 主构建脚本
│   └── watch.js             # 开发模式监听
├── src/                      # 源文件
│   ├── templates/           # HTML 模板
│   │   ├── base.html
│   │   ├── chapter.html
│   │   └── partials/
│   ├── content/             # Markdown 内容
│   │   ├── part1/
│   │   ├── part2/
│   │   ├── part3/
│   │   └── scenarios/
│   ├── assets/              # 静态资源
│   │   ├── css/
│   │   ├── js/
│   │   └── images/
│   └── data/                # 配置数据
│       └── navigation.json
├── dist/                     # 构建输出
├── nginx.conf               # Nginx 配置
├── package.json
└── README.md
```

### 4.3 内容格式

使用 Markdown 编写内容，通过构建脚本转换为 HTML。

**Markdown 扩展语法**:

```markdown
<!-- 场景卡片 -->
:::scenario{title="帮我重构这个函数"}
用户输入: "帮我重构这段代码..."
系统需要:
- 读取指定文件
- 分析代码结构
:::

<!-- 信息框 -->
:::tip
这是一个提示
:::

:::warning
这是一个警告
:::

<!-- 代码块带文件路径 -->
```typescript:src/tools/ReadTool.ts
export class ReadTool {
  // ...
}
```
```

### 4.4 构建流程

1. **解析阶段**
   - 读取 Markdown 文件
   - 解析自定义语法（场景卡片、信息框等）
   - 提取元数据（标题、章节、标签等）

2. **转换阶段**
   - Markdown → HTML
   - 应用模板
   - 生成导航结构

3. **优化阶段**
   - CSS/JS 压缩
   - 图片优化
   - 添加缓存头

4. **输出阶段**
   - 生成 dist/ 目录
   - 复制静态资源
   - 生成 sitemap

### 4.5 开发模式

```bash
# 安装依赖
npm install

# 开发模式（监听变化自动构建）
npm run dev

# 构建生产版本
npm run build

# 启动本地服务器预览
npm run serve
```

---

## 5. 部署方案

### 5.1 Nginx 配置

```nginx
# /etc/nginx/conf.d/claude-from-scratch.conf

server {
    listen 80;
    server_name _;  # 接受所有域名/IP

    # 项目根路径
    location /claude_from_scratch/ {
        alias /home/claudeuser/claude-from-scratch/dist/;
        index index.html;
        try_files $uri $uri/ /claude_from_scratch/index.html;

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # HTML 不缓存（确保内容更新）
        location ~* \.html$ {
            expires -1;
            add_header Cache-Control "no-cache";
        }
    }

    # 错误页面
    error_page 404 /claude_from_scratch/404.html;
}
```

### 5.2 部署流程

```bash
# 1. 构建项目
cd /home/claudeuser/claude-from-scratch
npm run build

# 2. 检查 Nginx 配置
sudo nginx -t

# 3. 重载 Nginx
sudo systemctl reload nginx

# 4. 验证访问
curl http://YOUR_IP/claude_from_scratch/
```

### 5.3 自动部署（可选）

```bash
# deploy.sh
#!/bin/bash
set -e

echo "🚀 Deploying claude-from-scratch..."

# 构建
npm run build

# 备份旧版本
timestamp=$(date +%Y%m%d_%H%M%S)
cp -r dist "dist_backup_$timestamp" 2>/dev/null || true

# 测试 Nginx 配置
sudo nginx -t

# 重载
sudo systemctl reload nginx

echo "✅ Deployed to http://YOUR_IP/claude_from_scratch/"
```

---

## 6. 内容大纲

### Part 1: 基础篇

#### Ch1: 搭建骨架
**目标**: 创建可运行的 CLI 框架

**内容要点**:
- 项目初始化（package.json、tsconfig）
- CLI 参数解析（ Commander.js / yargs）
- 基础配置系统（环境变量 + 配置文件）
- 首次运行："Hello, I'm your AI assistant"

**场景**: "初始化项目"
- 用户第一次运行命令
- 创建配置文件目录
- 引导用户输入 API Key

**输出**: 一个能显示欢迎消息的 CLI 程序

---

#### Ch2: 连接大脑
**目标**: 接入 LLM API，实现对话

**内容要点**:
- LLM API 选择（OpenAI、Anthropic、DeepSeek 等）
- API 封装与错误处理
- 流式响应处理（SSE）
- 消息历史管理

**场景**: "问一个简单的技术问题"
- 用户输入自然语言问题
- 系统调用 API 获取回答
- 流式显示回答内容

**输出**: 能进行基本对话的 AI 助手

---

#### Ch3: 读取世界
**目标**: 实现文件系统操作

**内容要点**:
- 文件读取（ReadTool）
- 目录列表（LsTool）
- Glob 搜索（GlobTool）
- 文件信息获取（大小、修改时间等）

**场景**: "查看项目结构"
- 用户问"这个项目有哪些文件？"
- 系统列出目录结构
- 用户指定查看某个文件

**输出**: 能读取文件和目录的助手

---

#### Ch4: 执行命令
**目标**: 实现 Bash 命令执行

**内容要点**:
- Bash 执行实现（BashTool）
- 安全验证基础（危险命令检测）
- 超时控制
- 输出捕获与格式化

**场景**: "运行 npm test"
- 用户要求运行测试
- 系统检测命令安全性
- 执行并返回结果

**输出**: 能执行 Shell 命令的助手（有基础安全）

---

#### Ch5: 编辑代码
**目标**: 实现文件编辑能力

**内容要点**:
- 文件编辑实现（EditTool）
- Diff 生成与显示
- 编辑确认机制
- 批量编辑支持

**场景**: "修改一个配置文件"
- 用户要求修改配置
- 系统生成修改方案
- 显示 Diff 并确认
- 应用修改

**输出**: MVP 完成——能聊天、读写文件、执行命令、编辑代码的基础 AI 助手

---

### Part 2: 核心篇

#### Ch6: 工具系统
**目标**: 构建可扩展的工具框架

**内容要点**:
- Tool 接口设计
- 工具注册中心
- 类型安全工厂（buildTool）
- 工具生命周期（validate → permission → execute → render）
- 延迟加载机制

**场景**: "添加自定义 Lint 工具"
- 团队需要自定义 ESLint 检查
- 封装为 Tool 并注册
- AI 可以调用该工具

---

#### Ch7: 权限管理
**目标**: 构建完整的安全体系

**内容要点**:
- 安全分类（read-only vs destructive）
- 权限规则系统（alwaysAllow / alwaysAsk / alwaysDeny）
- Glob 模式匹配
- 自动模式与人工确认
- 安全分类器

**场景**: "自动允许只读操作"
- 配置规则：read-only 操作自动允许
- write 操作需要确认
- rm 操作默认阻止

---

#### Ch8: Agent 系统
**目标**: 实现多 Agent 并行与协调

**内容要点**:
- Agent 生命周期
- Fork 模式（并行执行）
- Resume 模式（后台任务）
- 上下文隔离
- 团队文件协调

**场景**: "同时分析多个文件"
- 用户要求分析 src/ 下所有组件
- 系统 Fork 多个 Agent 并行处理
- 汇总结果返回

---

#### Ch9: 配置与持久化
**目标**: 构建企业级配置系统

**内容要点**:
- 分层配置（Enterprise > Local > Project > User）
- 配置热重载
- 状态持久化
- 会话管理

**场景**: "为团队配置统一规则"
- 企业管理员发布全局配置
- 项目级配置覆盖
- 用户个人偏好设置

---

#### Ch10: 消息流与 UI
**目标**: 构建流畅的用户体验

**内容要点**:
- 流式消息渲染
- 工具调用展示
- 工具结果格式化
- 进度反馈
- 错误处理与重试

**场景**: "实时显示搜索进度"
- 执行 Glob 搜索
- 实时显示找到的文件
- 完成后显示摘要

---

### Part 3: 高级篇

#### Ch11: 性能与扩展
**目标**: 优化与扩展能力

**内容要点**:
- Context Window 管理
- 自动压缩策略
- 工具延迟加载
- 缓存策略
- 启动优化

---

#### Ch12: MCP 协议
**目标**: 接入外部工具生态

**内容要点**:
- MCP 协议介绍
- Server 发现与连接
- 工具暴露与调用
- 资源订阅

---

#### Ch13: 企业落地
**目标**: 生产环境部署与定制

**内容要点**:
- 私有化 LLM 接入（Llama、Qwen 等）
- 内部工具集成
- 审计与合规
- 团队推广策略
- 长期维护

---

## 7. 场景卡片规范

### 7.1 场景卡片结构

每个场景卡片包含以下要素：

1. **场景名称**: 简短描述性标题
2. **用户输入**: 真实的用户输入示例
3. **系统挑战**: 需要解决的技术难点
4. **涉及模块**: 该场景用到的核心模块
5. **关键代码**: 指向相关代码文件的链接

### 7.2 场景卡片示例

```markdown
## 💡 场景: 帮我重构这个函数

**用户输入：**
"帮我重构这段代码，提取重复逻辑到单独的函数"

**系统挑战：**
1. 需要读取指定文件内容
2. 理解代码结构和逻辑
3. 识别重复模式
4. 生成重构后的代码
5. 安全地应用修改

**涉及模块：**
- [ReadTool] - 读取文件
- [BashTool] - 可选：运行 lint 检查
- [EditTool] - 应用重构

**关键代码：**
- `src/tools/ReadTool.ts` - 文件读取实现
- `src/tools/EditTool.ts` - 文件编辑实现
- `src/utils/diff.ts` - Diff 生成

**预期交互流程：**
```
用户: "重构 utils.ts 中的重复代码"
AI: "我来读取文件分析..."
[调用 ReadTool: utils.ts]
AI: "发现 3 处重复逻辑，建议提取为 validateInput() 函数"
[显示 Diff]
AI: "是否应用此修改？"
用户: "确认"
[调用 EditTool 应用修改]
AI: "已完成重构，是否需要运行测试验证？"
```

**学习要点：**
- 多步骤工具调度的协调
- Diff 展示的重要性
- 用户确认机制
```

### 7.3 场景分布

| 章节 | 场景数量 | 场景示例 |
|------|---------|---------|
| Ch1 | 1 | 初始化项目配置 |
| Ch2 | 1 | 第一次对话 |
| Ch3 | 2 | 查看项目结构、查找特定文件 |
| Ch4 | 2 | 运行测试、安装依赖 |
| Ch5 | 2 | 修改配置文件、批量重命名 |
| Ch6 | 2 | 添加自定义工具、工具链组合 |
| Ch7 | 2 | 自动允许只读、阻止危险命令 |
| Ch8 | 2 | 并行分析文件、后台长时任务 |
| Ch9 | 1 | 团队配置管理 |
| Ch10 | 1 | 流式显示进度 |
| Ch11-13 | 各1 | 性能优化、MCP接入、企业部署 |

---

## 8. 企业适配章节

### Ch13 详细大纲

#### 13.1 私有化 LLM 接入

**支持的模型**
- Llama 3 (Meta)
- Qwen (阿里)
- DeepSeek
- ChatGLM
- 其他 OpenAI API 兼容的模型

**实现要点**
- API 接口适配
- Token 计算差异处理
- 流式响应兼容
- 错误码映射

#### 13.2 内部工具集成

**集成模式**
- 封装为 Tool 接入
- MCP Server 暴露
- HTTP API 调用
- 数据库直接访问

**示例场景**
- 接入内部日志系统
- 查询业务数据库
- 调用内部微服务
- 访问企业知识库

#### 13.3 审计与合规

**审计日志**
- 用户操作记录
- 工具调用记录
- 文件访问记录
- 命令执行记录

**敏感数据处理**
- 密钥检测与脱敏
- 代码内容过滤
- PII 识别

**合规特性**
- 数据不出境配置
- 访问控制（RBAC）
- 会话隔离

#### 13.4 团队推广策略

**渐进式 Rollout**
- 早期用户计划
- 反馈收集与迭代
- 逐步扩大范围

**培训与文档**
- 内部使用指南
- 最佳实践分享
- FAQ 维护

**度量与优化**
- 使用数据统计
- 效率提升评估
- ROI 计算

#### 13.5 长期维护

**版本管理**
- 发布流程
- 回滚策略
- 兼容性保证

**监控与告警**
- 性能监控
- 错误追踪
- 成本监控

---

## 9. 项目里程碑

| 阶段 | 内容 | 预计时间 |
|------|------|---------|
| **M1** | 项目搭建 + Ch1-3 | 2 天 |
| **M2** | Ch4-5 (MVP 完成) | 2 天 |
| **M3** | Ch6-7 (工具+权限) | 3 天 |
| **M4** | Ch8-10 (核心篇完成) | 3 天 |
| **M5** | Ch11-13 (高级篇完成) | 2 天 |
| **M6** | 润色 + 场景补充 + 部署 | 2 天 |

**总计**: 约 2 周完成完整项目

---

## 10. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 内容量过大 | 开发周期延长 | 先完成核心章节，附录后续补充 |
| 代码示例复杂 | 维护困难 | 保持示例精简，链接到完整仓库 |
| 部署环境问题 | 上线延迟 | 提前测试 Nginx 配置 |

---

## 确认清单

- [x] 项目名称: claude-from-scratch
- [x] 技术栈: TypeScript/Node.js
- [x] 章节数: 13 章
- [x] 设计风格: Cyber-Brutalist 工业风
- [x] 部署方式: 阿里云 + Nginx /claude_from_scratch
- [x] 内容形式: 纯文档，渐进式构建 + 场景穿插

---

**文档版本**: 1.0
**最后更新**: 2026-04-01
**作者**: Rafa
