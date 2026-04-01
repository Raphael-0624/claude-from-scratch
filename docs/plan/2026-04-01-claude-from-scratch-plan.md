# Claude From Scratch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 13-chapter tutorial website (claude-from-scratch) teaching developers to build a Claude Code-like AI coding assistant from scratch using TypeScript/Node.js.

**Architecture:** Static site generator with Markdown-to-HTML build pipeline, vanilla CSS Cyber-Brutalist design, client-side search, deployed via Nginx on Aliyun server at `/claude_from_scratch`.

**Tech Stack:** Node.js, TypeScript, EJS templates, Markdown-it, vanilla CSS, Prism.js (syntax highlight), Lunr.js (search), Nginx

---

## Project Structure

```
claude-from-scratch/
├── package.json                 # Project manifest & scripts
├── tsconfig.json               # TypeScript config
├── README.md                   # Project readme
├── nginx.conf                  # Nginx deployment config
├── scripts/                    # Build scripts
│   ├── build.ts               # Main build script
│   └── dev.ts                 # Dev server with watch
├── src/                        # Source files
│   ├── content/               # Markdown content
│   │   ├── index.md          # Homepage
│   │   ├── getting-started.md
│   │   ├── part1/
│   │   │   ├── index.md
│   │   │   ├── ch1-cli-skeleton.md
│   │   │   ├── ch2-llm-connection.md
│   │   │   ├── ch3-file-operations.md
│   │   │   ├── ch4-bash-execution.md
│   │   │   └── ch5-code-editing.md
│   │   ├── part2/
│   │   │   ├── index.md
│   │   │   ├── ch6-tool-system.md
│   │   │   ├── ch7-permissions.md
│   │   │   ├── ch8-agent-system.md
│   │   │   ├── ch9-configuration.md
│   │   │   └── ch10-message-stream.md
│   │   ├── part3/
│   │   │   ├── index.md
│   │   │   ├── ch11-performance.md
│   │   │   ├── ch12-mcp-protocol.md
│   │   │   └── ch13-enterprise.md
│   │   └── scenarios/
│   │       ├── index.md
│   │       ├── refactor-function.md
│   │       ├── multi-file-analysis.md
│   │       ├── git-workflow.md
│   │       └── custom-tool-integration.md
│   ├── templates/             # HTML templates
│   │   ├── base.ejs          # Base layout
│   │   ├── chapter.ejs       # Chapter page
│   │   ├── partials/
│   │   │   ├── head.ejs
│   │   │   ├── nav.ejs
│   │   │   ├── sidebar.ejs
│   │   │   ├── footer.ejs
│   │   │   └── search.ejs
│   │   └── error.ejs
│   └── data/                  # Generated data
│       └── navigation.json    # Navigation structure
├── static/                    # Static assets
│   ├── css/
│   │   ├── main.css          # Main styles
│   │   ├── variables.css     # CSS variables
│   │   ├── components.css    # Component styles
│   │   ├── syntax.css        # Syntax highlighting
│   │   └── responsive.css    # Responsive styles
│   ├── js/
│   │   ├── main.js           # Main scripts
│   │   ├── search.js         # Search functionality
│   │   ├── nav.js            # Navigation
│   │   └── progress.js       # Reading progress
│   └── images/               # Images & diagrams
├── dist/                      # Build output (gitignored)
└── types/                     # Type definitions
    └── index.ts
```

---

## Phase 1: Project Foundation

### Task 1: Initialize Project Structure

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `README.md`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "claude-from-scratch",
  "version": "1.0.0",
  "description": "从零构建 Claude Code 完整指南",
  "scripts": {
    "dev": "tsx scripts/dev.ts",
    "build": "tsx scripts/build.ts",
    "serve": "python3 -m http.server 8080 -d dist",
    "clean": "rm -rf dist"
  },
  "devDependencies": {
    "@types/markdown-it": "^14.0.0",
    "@types/node": "^20.0.0",
    "ejs": "^3.1.9",
    "markdown-it": "^14.0.0",
    "markdown-it-anchor": "^9.0.0",
    "markdown-it-container": "^4.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  },
  "dependencies": {
    "chokidar": "^3.6.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": ".",
    "resolveJsonModule": true
  },
  "include": ["scripts/**/*", "types/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create .gitignore**

```gitignore
node_modules/
dist/
*.log
.DS_Store
.env
.env.local
dist_backup_*/
```

- [ ] **Step 4: Create README.md**

```markdown
# Claude From Scratch

从零构建 Claude Code 完整指南

## 项目简介

这是一个 13 章的渐进式教程，教你如何从零开始构建一个功能完整的 Claude Code 替代方案。

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 预览
npm run serve
```

## 部署

```bash
# 构建并部署
npm run build
sudo cp nginx.conf /etc/nginx/conf.d/claude-from-scratch.conf
sudo nginx -t
sudo systemctl reload nginx
```

访问: http://YOUR_IP/claude_from_scratch/
```

- [ ] **Step 5: Install dependencies**

```bash
cd /home/claudeuser/claude-from-scratch
npm install
```

Expected: Dependencies installed to node_modules/

- [ ] **Step 6: Commit**

```bash
git init
git add .
git commit -m "feat: initialize project structure"
```

---

### Task 2: Create Type Definitions

**Files:**
- Create: `types/index.ts`

- [ ] **Step 1: Write type definitions**

```typescript
// types/index.ts

export interface Chapter {
  id: string;
  title: string;
  subtitle: string;
  part: string;
  partTitle: string;
  order: number;
  file: string;
  path: string;
}

export interface Part {
  id: string;
  title: string;
  order: number;
  chapters: Chapter[];
}

export interface Navigation {
  parts: Part[];
  chapters: Chapter[];
}

export interface PageData {
  title: string;
  description: string;
  content: string;
  current?: Chapter;
  prev?: Chapter;
  next?: Chapter;
  navigation: Navigation;
}

export interface MarkdownMeta {
  title: string;
  description?: string;
  part?: string;
  order?: number;
  [key: string]: unknown;
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add type definitions"
```

---

## Phase 2: Build System

### Task 3: Create Build Script

**Files:**
- Create: `scripts/build.ts`

- [ ] **Step 1: Write build script**

```typescript
// scripts/build.ts
import fs from 'fs/promises';
import path from 'path';
import MarkdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import markdownItContainer from 'markdown-it-container';
import ejs from 'ejs';
import type { Chapter, Part, Navigation, PageData } from '../types/index.js';

const SRC_DIR = './src';
const DIST_DIR = './dist';
const CONTENT_DIR = './src/content';

// Initialize markdown parser
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
});

md.use(markdownItAnchor, {
  permalink: false,
  slugify: (s: string) => s.toLowerCase().replace(/\s+/g, '-')
});

// Custom containers
md.use(markdownItContainer, 'tip', {
  render: (tokens: any[], idx: number) => {
    const token = tokens[idx];
    if (token.nesting === 1) {
      return '<div class="info-box tip">\n';
    }
    return '</div>\n';
  }
});

md.use(markdownItContainer, 'warning', {
  render: (tokens: any[], idx: number) => {
    const token = tokens[idx];
    if (token.nesting === 1) {
      return '<div class="info-box warning">\n';
    }
    return '</div>\n';
  }
});

md.use(markdownItContainer, 'scenario', {
  render: (tokens: any[], idx: number) => {
    const token = tokens[idx];
    if (token.nesting === 1) {
      const info = token.info.trim().slice('scenario'.length).trim();
      const title = info.match(/title="([^"]+)"/)?.[1] || '场景';
      return `<div class="scenario-card">\n<h4>💡 场景: ${title}</h4>\n`;
    }
    return '</div>\n';
  }
});

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function parseMarkdown(filePath: string) {
  const content = await fs.readFile(filePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    return {
      meta: { title: path.basename(filePath, '.md') },
      content: md.render(content)
    };
  }

  const metaContent = match[1];
  const bodyContent = match[2];

  // Simple YAML-like parsing
  const meta: Record<string, any> = {};
  for (const line of metaContent.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
      meta[key] = value;
    }
  }

  return {
    meta,
    content: md.render(bodyContent)
  };
}

async function buildNavigation(): Promise<Navigation> {
  const parts: Part[] = [];
  const chapters: Chapter[] = [];

  const partDirs = ['part1', 'part2', 'part3'];
  const partTitles: Record<string, string> = {
    part1: '基础篇',
    part2: '核心篇',
    part3: '高级篇'
  };

  for (let i = 0; i < partDirs.length; i++) {
    const partDir = partDirs[i];
    const partPath = path.join(CONTENT_DIR, partDir);

    try {
      const files = await fs.readdir(partPath);
      const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'index.md');

      const partChapters: Chapter[] = [];

      for (const file of mdFiles.sort()) {
        const filePath = path.join(partPath, file);
        const { meta } = await parseMarkdown(filePath);

        const chapter: Chapter = {
          id: path.basename(file, '.md'),
          title: meta.title || path.basename(file, '.md'),
          subtitle: meta.description || '',
          part: partDir,
          partTitle: partTitles[partDir],
          order: parseInt(meta.order) || 0,
          file,
          path: `${partDir}/${path.basename(file, '.md')}.html`
        };

        partChapters.push(chapter);
        chapters.push(chapter);
      }

      partChapters.sort((a, b) => a.order - b.order);

      parts.push({
        id: partDir,
        title: partTitles[partDir],
        order: i + 1,
        chapters: partChapters
      });
    } catch (e) {
      // Directory doesn't exist yet
    }
  }

  return { parts, chapters };
}

async function buildPage(
  contentPath: string,
  outputPath: string,
  template: string,
  navigation: Navigation,
  extraData: Partial<PageData> = {}
) {
  const { meta, content } = await parseMarkdown(contentPath);

  const pageData: PageData = {
    title: meta.title || 'Untitled',
    description: meta.description || '',
    content,
    navigation,
    ...extraData
  };

  const templatePath = path.join(SRC_DIR, 'templates', template);
  const templateContent = await fs.readFile(templatePath, 'utf-8');
  const html = ejs.render(templateContent, pageData);

  await ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, html);
}

async function copyStatic() {
  const staticDir = './static';
  const distStaticDir = path.join(DIST_DIR, 'static');

  try {
    await fs.access(staticDir);
    await ensureDir(distStaticDir);

    const copyRecursive = async (src: string, dest: string) => {
      const entries = await fs.readdir(src, { withFileTypes: true });

      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          await ensureDir(destPath);
          await copyRecursive(srcPath, destPath);
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      }
    };

    await copyRecursive(staticDir, distStaticDir);
  } catch (e) {
    console.log('No static directory to copy');
  }
}

async function build() {
  console.log('🔨 Building claude-from-scratch...\n');

  // Clean dist
  await fs.rm(DIST_DIR, { recursive: true, force: true });
  await ensureDir(DIST_DIR);

  // Build navigation
  console.log('📑 Building navigation...');
  const navigation = await buildNavigation();
  await ensureDir('./src/data');
  await fs.writeFile('./src/data/navigation.json', JSON.stringify(navigation, null, 2));

  // Build index page
  console.log('🏠 Building index...');
  await buildPage(
    './src/content/index.md',
    path.join(DIST_DIR, 'index.html'),
    'base.ejs',
    navigation
  );

  // Build chapters
  console.log('📚 Building chapters...');
  for (let i = 0; i < navigation.chapters.length; i++) {
    const chapter = navigation.chapters[i];
    const inputPath = path.join(CONTENT_DIR, chapter.part, `${chapter.id}.md`);
    const outputPath = path.join(DIST_DIR, chapter.path);

    const prev = i > 0 ? navigation.chapters[i - 1] : undefined;
    const next = i < navigation.chapters.length - 1 ? navigation.chapters[i + 1] : undefined;

    await buildPage(
      inputPath,
      outputPath,
      'chapter.ejs',
      navigation,
      { current: chapter, prev, next }
    );
  }

  // Copy static files
  console.log('📦 Copying static files...');
  await copyStatic();

  console.log('\n✅ Build complete!');
  console.log(`📁 Output: ${DIST_DIR}/`);
}

build().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Create dev script**

```typescript
// scripts/dev.ts
import { spawn } from 'child_process';
import chokidar from 'chokidar';

console.log('🚀 Starting dev server...\n');

// Initial build
const build = spawn('tsx', ['scripts/build.ts'], { stdio: 'inherit' });

build.on('close', (code) => {
  if (code !== 0) {
    console.error('Initial build failed');
    process.exit(1);
  }

  // Start HTTP server
  const server = spawn('python3', ['-m', 'http.server', '8080', '-d', 'dist'], {
    stdio: 'inherit'
  });

  console.log('\n🌐 Server running at http://localhost:8080\n');

  // Watch for changes
  const watcher = chokidar.watch(['src/**/*', 'static/**/*'], {
    ignored: /node_modules/,
    persistent: true
  });

  let isBuilding = false;

  watcher.on('change', async (path) => {
    if (isBuilding) return;

    console.log(`\n📝 Changed: ${path}`);
    console.log('🔨 Rebuilding...\n');

    isBuilding = true;

    const rebuild = spawn('tsx', ['scripts/build.ts'], { stdio: 'inherit' });

    rebuild.on('close', () => {
      isBuilding = false;
      console.log('\n✅ Rebuild complete\n');
    });
  });

  // Cleanup on exit
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down...');
    server.kill();
    watcher.close();
    process.exit(0);
  });
});
```

- [ ] **Step 3: Test build**

```bash
npm run build
```

Expected: Build completes without errors, creates dist/ directory

- [ ] **Step 4: Commit**

```bash
git add scripts/
git commit -m "feat: add build system"
```

---

## Phase 3: Templates & CSS

### Task 4: Create Base Template

**Files:**
- Create: `src/templates/base.ejs`

- [ ] **Step 1: Write base template**

```ejs
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= title %> | Claude From Scratch</title>
    <meta name="description" content="<%= description %>">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;700;800&display=swap" rel="stylesheet">

    <!-- Styles -->
    <link rel="stylesheet" href="/claude_from_scratch/static/css/variables.css">
    <link rel="stylesheet" href="/claude_from_scratch/static/css/main.css">
    <link rel="stylesheet" href="/claude_from_scratch/static/css/components.css">
    <link rel="stylesheet" href="/claude_from_scratch/static/css/syntax.css">
    <link rel="stylesheet" href="/claude_from_scratch/static/css/responsive.css">
</head>
<body>
    <!-- Progress Bar -->
    <div class="progress-bar" id="progressBar"></div>

    <!-- Navigation -->
    <%- include('partials/nav') %>

    <!-- Main Content -->
    <main class="main-content">
        <div class="container">
            <%- content %>
        </div>
    </main>

    <!-- Footer -->
    <%- include('partials/footer') %>

    <!-- Scripts -->
    <script src="/claude_from_scratch/static/js/main.js"></script>
    <script src="/claude_from_scratch/static/js/progress.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create chapter template**

```ejs
<!-- src/templates/chapter.ejs -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= title %> | <%= current?.partTitle || 'Claude From Scratch' %></title>
    <meta name="description" content="<%= description %>">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;700;800&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="/claude_from_scratch/static/css/variables.css">
    <link rel="stylesheet" href="/claude_from_scratch/static/css/main.css">
    <link rel="stylesheet" href="/claude_from_scratch/static/css/components.css">
    <link rel="stylesheet" href="/claude_from_scratch/static/css/syntax.css">
    <link rel="stylesheet" href="/claude_from_scratch/static/css/responsive.css">
</head>
<body class="has-sidebar">
    <!-- Progress Bar -->
    <div class="progress-bar" id="progressBar"></div>

    <!-- Navigation -->
    <%- include('partials/nav') %>

    <!-- Sidebar -->
    <%- include('partials/sidebar') %>

    <!-- Main Content -->
    <main class="main-content with-sidebar">
        <div class="container">
            <!-- Breadcrumb -->
            <nav class="breadcrumb">
                <a href="/claude_from_scratch/">首页</a>
                <span class="separator">/</span>
                <% if (current) { %>
                <a href="/claude_from_scratch/<%= current.part %>/index.html"><%= current.partTitle %></a>
                <span class="separator">/</span>
                <span class="current"><%= title %></span>
                <% } %>
            </nav>

            <!-- Chapter Header -->
            <header class="chapter-header">
                <% if (current) { %>
                <div class="chapter-number"><%= String(current.order).padStart(2, '0') %></div>
                <% } %>
                <h1><%= title %></h1>
                <% if (description) { %>
                <p class="chapter-description"><%= description %></p>
                <% } %>
            </header>

            <!-- Chapter Content -->
            <article class="chapter-content">
                <%- content %>
            </article>

            <!-- Chapter Navigation -->
            <nav class="chapter-nav">
                <% if (prev) { %>
                <a href="/claude_from_scratch/<%= prev.path %>" class="prev">
                    <span class="label">← 上一章</span>
                    <span class="title"><%= prev.title %></span>
                </a>
                <% } else { %>
                <div></div>
                <% } %>

                <% if (next) { %>
                <a href="/claude_from_scratch/<%= next.path %>" class="next">
                    <span class="label">下一章 →</span>
                    <span class="title"><%= next.title %></span>
                </a>
                <% } else { %>
                <div></div>
                <% } %>
            </nav>
        </div>
    </main>

    <!-- Footer -->
    <%- include('partials/footer') %>

    <!-- Scripts -->
    <script src="/claude_from_scratch/static/js/main.js"></script>
    <script src="/claude_from_scratch/static/js/progress.js"></script>
    <script src="/claude_from_scratch/static/js/nav.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create partials**

```ejs
<!-- src/templates/partials/nav.ejs -->
<nav class="main-nav">
    <div class="nav-container">
        <a href="/claude_from_scratch/" class="logo">
            <span class="logo-icon">◈</span>
            <span class="logo-text">CFS</span>
        </a>

        <ul class="nav-links">
            <li><a href="/claude_from_scratch/">首页</a></li>
            <li><a href="/claude_from_scratch/getting-started.html">开始</a></li>
            <li><a href="/claude_from_scratch/part1/index.html">基础篇</a></li>
            <li><a href="/claude_from_scratch/part2/index.html">核心篇</a></li>
            <li><a href="/claude_from_scratch/part3/index.html">高级篇</a></li>
            <li><a href="/claude_from_scratch/scenarios/index.html">场景</a></li>
        </ul>

        <div class="nav-actions">
            <button class="search-toggle" id="searchToggle">🔍</button>
        </div>
    </div>
</nav>
```

```ejs
<!-- src/templates/partials/sidebar.ejs -->
<aside class="sidebar" id="sidebar">
    <div class="sidebar-content">
        <% navigation.parts.forEach(part => { %>
        <div class="sidebar-section">
            <h3 class="sidebar-title"><%= part.title %></h3>
            <ul class="sidebar-list">
                <% part.chapters.forEach(ch => { %>
                <li class="<%= current && current.id === ch.id ? 'active' : '' %>">
                    <a href="/claude_from_scratch/<%= ch.path %>">
                        <span class="chapter-num"><%= String(ch.order).padStart(2, '0') %></span>
                        <span class="chapter-title"><%= ch.title %></span>
                    </a>
                </li>
                <% }) %>
            </ul>
        </div>
        <% }) %>
    </div>
</aside>
```

```ejs
<!-- src/templates/partials/footer.ejs -->
<footer class="main-footer">
    <div class="container">
        <div class="footer-logo">◈ Claude From Scratch</div>
        <p class="footer-text">从零构建 Claude Code 完整指南</p>
        <p class="footer-meta">由 Rafa 创建 · 开源教程</p>
    </div>
</footer>
```

- [ ] **Step 4: Commit**

```bash
git add src/templates/
git commit -m "feat: add EJS templates"
```

---

### Task 5: Create CSS Framework

**Files:**
- Create: `static/css/variables.css`
- Create: `static/css/main.css`
- Create: `static/css/components.css`
- Create: `static/css/syntax.css`
- Create: `static/css/responsive.css`

- [ ] **Step 1: Write variables.css**

```css
/* static/css/variables.css */
:root {
  /* Background Colors */
  --bg-primary: #0a0a0b;
  --bg-secondary: #111113;
  --bg-tertiary: #1a1a1d;
  --bg-card: #141416;
  --bg-code: #0d0d0f;

  /* Text Colors */
  --text-primary: #f5f5f5;
  --text-secondary: #8a8a8a;
  --text-muted: #5a5a5a;

  /* Accent Colors */
  --accent-primary: #ff6b35;
  --accent-secondary: #f7c548;
  --accent-cyan: #00d4aa;
  --accent-danger: #ff2d55;

  /* Borders */
  --border-color: #2a2a2e;
  --border-accent: #ff6b35;

  /* Typography */
  --font-mono: 'Space Mono', monospace;
  --font-display: 'Syne', sans-serif;

  /* Spacing */
  --container-max: 1400px;
  --sidebar-width: 280px;
  --nav-height: 60px;

  /* Shadows */
  --shadow-glow: rgba(255, 107, 53, 0.15);
}

/* Dark mode is default */
html {
  color-scheme: dark;
}
```

- [ ] **Step 2: Write main.css**

```css
/* static/css/main.css */

/* Reset */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
  background: var(--bg-primary);
  min-height: 100vh;
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

h1 { font-size: clamp(2rem, 5vw, 3.5rem); }
h2 { font-size: clamp(1.5rem, 4vw, 2.5rem); }
h3 { font-size: clamp(1.2rem, 3vw, 1.8rem); }

a {
  color: var(--accent-primary);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

/* Progress Bar */
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
  z-index: 10000;
  width: 0%;
  transition: width 0.1s;
}

/* Navigation */
.main-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--nav-height);
  background: rgba(10, 10, 11, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-color);
  z-index: 1000;
}

.nav-container {
  max-width: var(--container-max);
  margin: 0 auto;
  padding: 0 2rem;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 1.2rem;
  color: var(--text-primary);
}

.logo-icon {
  color: var(--accent-primary);
  font-size: 1.4rem;
}

.logo-text {
  color: var(--text-primary);
}

.nav-links {
  display: flex;
  list-style: none;
  gap: 0.5rem;
}

.nav-links a {
  color: var(--text-secondary);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.5rem 1rem;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.nav-links a:hover {
  color: var(--accent-primary);
  border-color: var(--accent-primary);
  text-decoration: none;
}

/* Main Content */
.main-content {
  padding-top: var(--nav-height);
  min-height: 100vh;
}

.main-content.with-sidebar {
  margin-left: var(--sidebar-width);
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 3rem 2rem;
}

/* Sidebar */
.sidebar {
  position: fixed;
  top: var(--nav-height);
  left: 0;
  width: var(--sidebar-width);
  height: calc(100vh - var(--nav-height));
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  z-index: 100;
}

.sidebar-content {
  padding: 1.5rem;
}

.sidebar-section {
  margin-bottom: 2rem;
}

.sidebar-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.sidebar-list {
  list-style: none;
}

.sidebar-list li {
  margin-bottom: 0.25rem;
}

.sidebar-list a {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
  border-left: 3px solid transparent;
  transition: all 0.2s;
}

.sidebar-list a:hover,
.sidebar-list li.active a {
  color: var(--text-primary);
  background: var(--bg-tertiary);
  border-left-color: var(--accent-primary);
  text-decoration: none;
}

.sidebar-list .chapter-num {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--accent-primary);
  min-width: 1.5rem;
}

/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.breadcrumb a {
  color: var(--text-secondary);
}

.breadcrumb .current {
  color: var(--text-primary);
}

.breadcrumb .separator {
  color: var(--text-muted);
}

/* Chapter Header */
.chapter-header {
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid var(--border-color);
}

.chapter-number {
  font-family: var(--font-display);
  font-size: 5rem;
  font-weight: 800;
  color: var(--accent-primary);
  line-height: 1;
  margin-bottom: 1rem;
}

.chapter-header h1 {
  margin-bottom: 1rem;
}

.chapter-description {
  font-size: 1.1rem;
  color: var(--text-secondary);
}

/* Chapter Content */
.chapter-content {
  margin-bottom: 4rem;
}

.chapter-content h2 {
  margin-top: 3rem;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.chapter-content h3 {
  margin-top: 2.5rem;
  margin-bottom: 1rem;
  color: var(--accent-secondary);
}

.chapter-content p {
  margin-bottom: 1.5rem;
  color: var(--text-secondary);
}

.chapter-content ul,
.chapter-content ol {
  margin-bottom: 1.5rem;
  padding-left: 2rem;
}

.chapter-content li {
  margin-bottom: 0.5rem;
  color: var(--text-secondary);
}

.chapter-content code {
  background: var(--bg-tertiary);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  font-size: 0.9em;
  color: var(--accent-primary);
}

/* Chapter Navigation */
.chapter-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  padding-top: 3rem;
  border-top: 2px solid var(--border-color);
}

.chapter-nav a {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.5rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.chapter-nav a:hover {
  border-color: var(--accent-primary);
  text-decoration: none;
}

.chapter-nav .next {
  text-align: right;
  grid-column: 2;
}

.chapter-nav .label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.chapter-nav .title {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--text-primary);
}

/* Footer */
.main-footer {
  margin-left: var(--sidebar-width);
  padding: 4rem 2rem;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  text-align: center;
}

.footer-logo {
  font-family: var(--font-display);
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--accent-primary);
  margin-bottom: 1rem;
}

.footer-text {
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.footer-meta {
  font-size: 0.85rem;
  color: var(--text-muted);
}
```

- [ ] **Step 3: Write components.css**

```css
/* static/css/components.css */

/* Code Blocks */
.code-block {
  background: var(--bg-code);
  border: 1px solid var(--border-color);
  margin: 1.5rem 0;
  overflow: hidden;
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
}

.code-lang {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--accent-primary);
  font-weight: 700;
}

.code-file {
  font-size: 0.75rem;
  color: var(--text-muted);
}

pre {
  padding: 1.5rem;
  overflow-x: auto;
  font-size: 0.85rem;
  line-height: 1.6;
}

code {
  font-family: var(--font-mono);
}

/* Info Boxes */
.info-box {
  background: var(--bg-tertiary);
  border-left: 4px solid var(--accent-primary);
  padding: 1.5rem;
  margin: 2rem 0;
}

.info-box h4 {
  color: var(--accent-primary);
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-box p {
  margin-bottom: 0;
}

.info-box.tip {
  border-left-color: var(--accent-cyan);
}

.info-box.tip h4 {
  color: var(--accent-cyan);
}

.info-box.warning {
  border-left-color: var(--accent-secondary);
}

.info-box.warning h4 {
  color: var(--accent-secondary);
}

/* Scenario Cards */
.scenario-card {
  background: var(--bg-card);
  border-left: 4px solid var(--accent-secondary);
  padding: 2rem;
  margin: 2rem 0;
}

.scenario-card h4 {
  font-family: var(--font-display);
  font-size: 1.1rem;
  color: var(--accent-secondary);
  margin-bottom: 1.5rem;
}

/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 2rem 0;
  font-size: 0.9rem;
}

th {
  background: var(--bg-tertiary);
  color: var(--accent-primary);
  text-align: left;
  padding: 1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.75rem;
  border-bottom: 2px solid var(--accent-primary);
}

td {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
}

tr:hover td {
  background: var(--bg-tertiary);
}

/* Cards */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  padding: 2rem;
  margin-bottom: 1.5rem;
  position: relative;
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: var(--accent-primary);
  transform: scaleY(0);
  transition: transform 0.3s;
}

.card:hover {
  border-color: var(--border-accent);
}

.card:hover::before {
  transform: scaleY(1);
}

.card h3 {
  margin-bottom: 1rem;
}

.card p {
  color: var(--text-secondary);
  margin-bottom: 0;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--accent-primary);
  color: var(--bg-primary);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background: var(--accent-secondary);
  text-decoration: none;
}

/* Search */
.search-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 2000;
  display: none;
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
}

.search-overlay.active {
  display: flex;
}

.search-container {
  width: 100%;
  max-width: 600px;
  padding: 0 2rem;
}

.search-input {
  width: 100%;
  padding: 1rem 1.5rem;
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 1.1rem;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.search-results {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-top: none;
  max-height: 400px;
  overflow-y: auto;
}

.search-result {
  display: block;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.search-result:hover {
  background: var(--bg-tertiary);
  text-decoration: none;
}

.search-result-title {
  color: var(--text-primary);
  font-weight: 700;
  margin-bottom: 0.25rem;
}
```

- [ ] **Step 4: Write syntax.css**

```css
/* static/css/syntax.css */

/* Prism.js-like syntax highlighting */
code[class*="language-"],
pre[class*="language-"] {
  color: var(--text-primary);
  text-shadow: none;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 1.6;
  direction: ltr;
  text-align: left;
  white-space: pre;
  word-spacing: normal;
  word-break: normal;
  tab-size: 2;
  hyphens: none;
}

/* Token colors */
.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
  color: #5a5a5a;
  font-style: italic;
}

.token.punctuation {
  color: var(--text-secondary);
}

.token.property,
.token.tag,
.token.boolean,
.token.number,
.token.constant,
.token.symbol,
.token.deleted {
  color: #ae81ff;
}

.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
  color: var(--accent-secondary);
}

.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string {
  color: var(--text-secondary);
}

.token.atrule,
.token.attr-value,
.token.keyword {
  color: #ff6b35;
}

.token.function,
.token.class-name {
  color: #00d4aa;
}

.token.regex,
.token.important,
.token.variable {
  color: #f7c548;
}

/* Line numbers */
pre.line-numbers {
  position: relative;
  padding-left: 3.5rem;
}

.line-numbers-rows {
  position: absolute;
  top: 1.5rem;
  left: 1rem;
  width: 2rem;
  border-right: 1px solid var(--border-color);
  text-align: right;
}

.line-numbers-rows > span {
  display: block;
  color: var(--text-muted);
  font-size: 0.8rem;
  line-height: 1.6;
}
```

- [ ] **Step 5: Write responsive.css**

```css
/* static/css/responsive.css */

/* Tablet */
@media (max-width: 1024px) {
  .main-content.with-sidebar {
    margin-left: 0;
  }

  .sidebar {
    transform: translateX(-100%);
    transition: transform 0.3s;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .main-footer {
    margin-left: 0;
  }

  .nav-links {
    display: none;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .container {
    padding: 2rem 1.5rem;
  }

  .nav-container {
    padding: 0 1rem;
  }

  .chapter-number {
    font-size: 3rem;
  }

  .chapter-nav {
    grid-template-columns: 1fr;
  }

  .chapter-nav .next {
    grid-column: 1;
    text-align: left;
  }

  table {
    font-size: 0.8rem;
  }

  th, td {
    padding: 0.75rem 0.5rem;
  }
}

/* Print */
@media print {
  .main-nav,
  .sidebar,
  .progress-bar {
    display: none;
  }

  .main-content.with-sidebar {
    margin-left: 0;
  }

  body {
    font-size: 12px;
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add static/css/
git commit -m "feat: add CSS framework"
```

---

### Task 6: Create JavaScript

**Files:**
- Create: `static/js/main.js`
- Create: `static/js/progress.js`
- Create: `static/js/nav.js`

- [ ] **Step 1: Write main.js**

```javascript
// static/js/main.js

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', () => {
  const searchToggle = document.getElementById('searchToggle');

  if (searchToggle) {
    searchToggle.addEventListener('click', () => {
      // Search functionality placeholder
      console.log('Search toggle clicked');
    });
  }

  // Add copy buttons to code blocks
  document.querySelectorAll('pre').forEach(pre => {
    const button = document.createElement('button');
    button.className = 'code-copy';
    button.textContent = 'Copy';
    button.addEventListener('click', () => {
      const code = pre.querySelector('code')?.textContent || pre.textContent;
      navigator.clipboard.writeText(code).then(() => {
        button.textContent = 'Copied!';
        setTimeout(() => button.textContent = 'Copy', 2000);
      });
    });
    pre.style.position = 'relative';
    pre.appendChild(button);
  });
});
```

- [ ] **Step 2: Write progress.js**

```javascript
// static/js/progress.js

function updateProgressBar() {
  const scrollTop = document.documentElement.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;

  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.width = progress + '%';
  }
}

window.addEventListener('scroll', updateProgressBar);
window.addEventListener('load', updateProgressBar);
```

- [ ] **Step 3: Write nav.js**

```javascript
// static/js/nav.js

// Highlight current chapter in sidebar
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const currentPath = window.location.pathname;
  const links = sidebar.querySelectorAll('a');

  links.forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.parentElement.classList.add('active');
      // Scroll into view
      link.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
});
```

- [ ] **Step 4: Add CSS for copy button**

```css
/* Add to components.css */
.code-copy {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

pre:hover .code-copy {
  opacity: 1;
}

.code-copy:hover {
  background: var(--accent-primary);
  color: var(--bg-primary);
}
```

- [ ] **Step 5: Commit**

```bash
git add static/js/
git add static/css/components.css
git commit -m "feat: add JavaScript functionality"
```

---

## Phase 4: Content

### Task 7: Create Homepage

**Files:**
- Create: `src/content/index.md`

- [ ] **Step 1: Write homepage content**

```markdown
---
title: "Claude From Scratch"
description: "从零构建 Claude Code 完整指南 - 13 章渐进式教程"
---

<div class="hero">
    <div class="hero-badge">开源教程 / 2026</div>
    <h1>Claude From <span>Scratch</span></h1>
    <p class="hero-subtitle">
        从零开始构建你的 AI 编程助手。13 章渐进式教程，从可运行的 MVP 到企业级功能，
        深入理解 Claude Code 的架构设计与实现原理。
    </p>
    <div class="hero-actions">
        <a href="/claude_from_scratch/getting-started.html" class="btn btn-primary">开始学习</a>
        <a href="/claude_from_scratch/part1/ch1-cli-skeleton.html" class="btn btn-secondary">第一章</a>
    </div>
    <div class="hero-stats">
        <div class="stat">
            <div class="stat-number">13</div>
            <div class="stat-label">章节</div>
        </div>
        <div class="stat">
            <div class="stat-number">3</div>
            <div class="stat-label">部分</div>
        </div>
        <div class="stat">
            <div class="stat-number">60+</div>
            <div class="stat-label">代码示例</div>
        </div>
    </div>
</div>

## 这是什么？

Claude From Scratch 是一个**实战教程项目**，教你从零开始构建一个功能完整的 Claude Code 替代方案。

不同于直接阅读源码或使用现成工具，本教程带你经历完整的**构建过程**——从第一个可运行的 CLI 程序开始，逐步添加功能，最终得到一个接近生产级质量的 AI 编程助手。

## 适合谁？

- **个人开发者**：想深入理解 AI 编程助手的工作原理，学习 TypeScript 系统架构设计
- **企业团队**：需要在内部部署私有 AI 助手，集成自研工具，关注安全合规
- **学习者**：对 LLM 应用开发感兴趣，想掌握现代 CLI 工具开发技术栈

## 学习路径

<div class="parts-grid">
    <div class="part-card">
        <div class="part-number">01</div>
        <h3>基础篇</h3>
        <p>5 章内容，从 CLI 骨架到文件操作、命令执行，最终完成 MVP。</p>
        <ul>
            <li>搭建 CLI 框架</li>
            <li>连接 LLM API</li>
            <li>文件读写与 Bash 执行</li>
            <li>代码编辑与 Diff</li>
        </ul>
        <a href="/claude_from_scratch/part1/index.html">进入基础篇 →</a>
    </div>
    <div class="part-card">
        <div class="part-number">02</div>
        <h3>核心篇</h3>
        <p>5 章内容，构建 Claude Code 的核心基础设施。</p>
        <ul>
            <li>可扩展的工具系统</li>
            <li>多层权限管理</li>
            <li>Agent 并行与协调</li>
            <li>企业级配置系统</li>
        </ul>
        <a href="/claude_from_scratch/part2/index.html">进入核心篇 →</a>
    </div>
    <div class="part-card">
        <div class="part-number">03</div>
        <h3>高级篇</h3>
        <p>3 章内容，性能优化与生产环境部署。</p>
        <ul>
            <li>Context 压缩与缓存</li>
            <li>MCP 协议集成</li>
            <li>私有化部署指南</li>
        </ul>
        <a href="/claude_from_scratch/part3/index.html">进入高级篇 →</a>
    </div>
</div>

## 技术栈

- **TypeScript** - 类型安全的主语言
- **Node.js** - 运行时环境
- **CLI 框架** - Commander.js / Ink (React for CLI)
- **LLM API** - OpenAI / Anthropic / DeepSeek 等

## 开始学习

准备好开始了吗？点击下面的按钮进入第一章，或者阅读[开始指南](/claude_from_scratch/getting-started.html)了解环境准备。

<div class="cta-section">
    <a href="/claude_from_scratch/part1/ch1-cli-skeleton.html" class="btn btn-large">第一章：搭建骨架 →</a>
</div>
```

- [ ] **Step 2: Add hero styles to main.css**

```css
/* Add to main.css */
.hero {
  text-align: center;
  padding: 4rem 0;
}

.hero-badge {
  display: inline-block;
  background: var(--bg-tertiary);
  border: 1px solid var(--accent-primary);
  color: var(--accent-primary);
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 2rem;
}

.hero h1 {
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  margin-bottom: 1.5rem;
}

.hero h1 span {
  color: var(--accent-primary);
}

.hero-subtitle {
  font-size: 1.2rem;
  color: var(--text-secondary);
  max-width: 700px;
  margin: 0 auto 2rem;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 4rem;
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 4rem;
}

.stat {
  text-align: center;
}

.stat-number {
  font-family: var(--font-display);
  font-size: 3rem;
  font-weight: 800;
  color: var(--accent-primary);
  line-height: 1;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 0.5rem;
}

.parts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  margin: 3rem 0;
}

.part-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  padding: 2rem;
  position: relative;
}

.part-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: var(--accent-primary);
}

.part-number {
  font-family: var(--font-display);
  font-size: 3rem;
  font-weight: 800;
  color: var(--accent-primary);
  line-height: 1;
  margin-bottom: 1rem;
}

.part-card h3 {
  margin-bottom: 1rem;
}

.part-card p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

.part-card ul {
  list-style: none;
  padding: 0;
  margin-bottom: 1.5rem;
}

.part-card li {
  padding: 0.25rem 0;
  padding-left: 1.5rem;
  position: relative;
  color: var(--text-secondary);
}

.part-card li::before {
  content: '→';
  position: absolute;
  left: 0;
  color: var(--accent-primary);
}

.cta-section {
  text-align: center;
  padding: 3rem 0;
}

.btn-large {
  padding: 1rem 2rem;
  font-size: 1rem;
}

@media (max-width: 1024px) {
  .parts-grid {
    grid-template-columns: 1fr;
  }

  .hero-stats {
    gap: 2rem;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/content/index.md
git add static/css/main.css
git commit -m "feat: add homepage content and styles"
```

---

## Phase 5: Nginx Deployment

### Task 8: Create Nginx Configuration

**Files:**
- Create: `nginx.conf`

- [ ] **Step 1: Write nginx configuration**

```nginx
# nginx.conf for claude-from-scratch
# Place at /etc/nginx/conf.d/claude-from-scratch.conf

server {
    listen 80;
    server_name _;

    # Claude From Scratch - Tutorial Website
    location /claude_from_scratch/ {
        alias /home/claudeuser/claude-from-scratch/dist/;
        index index.html;
        try_files $uri $uri/ =404;

        # Static assets caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            add_header X-Content-Type-Options "nosniff";
        }

        # HTML files - no cache for content updates
        location ~* \.html$ {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
        }

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }

    # Optional: Redirect /claude_from_scratch (without trailing slash)
    location = /claude_from_scratch {
        return 301 /claude_from_scratch/;
    }
}
```

- [ ] **Step 2: Create deploy script**

```bash
# deploy.sh
#!/bin/bash
set -e

echo "🚀 Deploying Claude From Scratch..."

# Build
echo "📦 Building..."
npm run build

# Check nginx config
echo "🔍 Checking Nginx configuration..."
sudo nginx -t

# Reload nginx
echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

echo ""
echo "✅ Deployed successfully!"
echo "🌐 Access at: http://YOUR_IP/claude_from_scratch/"
```

```bash
chmod +x deploy.sh
```

- [ ] **Step 3: Commit**

```bash
git add nginx.conf deploy.sh
git commit -m "feat: add nginx configuration and deploy script"
```

---

## Phase 6: Part 1 Content (MVP Chapters)

### Task 9: Create Part 1 Overview

**Files:**
- Create: `src/content/part1/index.md`

- [ ] **Step 1: Write Part 1 overview**

```markdown
---
title: "Part 1: 基础篇"
description: "5 章内容，从 CLI 骨架到文件操作，完成 MVP"
---

# Part 1: 基础篇

基础篇包含 5 章内容，目标是构建一个**可运行的 MVP**——一个能聊天、能读写文件、能执行命令、能编辑代码的基础 AI 助手。

## 章节列表

| 章节 | 标题 | 目标 |
|------|------|------|
| Ch1 | 搭建骨架 | 创建 CLI 框架和配置系统 |
| Ch2 | 连接大脑 | 接入 LLM API，实现对话 |
| Ch3 | 读取世界 | 文件系统操作 |
| Ch4 | 执行命令 | Bash 执行与安全基础 |
| Ch5 | 编辑代码 | 文件编辑与 Diff |

## 学完基础篇你将拥有

- 一个能运行的 TypeScript CLI 程序
- 可以调用 OpenAI/Anthropic API 进行对话
- 可以读取文件、列出目录、搜索文件
- 可以执行 Bash 命令（有基础安全保护）
- 可以编辑文件并显示 Diff

## 开始第一章

<a href="/claude_from_scratch/part1/ch1-cli-skeleton.html" class="btn">第一章：搭建骨架 →</a>
```

- [ ] **Step 2: Commit**

```bash
git add src/content/part1/index.md
git commit -m "feat: add part 1 overview"
```

---

### Task 10: Create Chapter 1

**Files:**
- Create: `src/content/part1/ch1-cli-skeleton.md`

- [ ] **Step 1: Write Chapter 1 content**

```markdown
---
title: "Ch1: 搭建骨架"
description: "创建 CLI 框架、配置系统，完成第一次运行"
part: "基础篇"
order: 1
---

# Ch1: 搭建骨架

本章我们将创建项目的骨架：初始化 Node.js 项目、设置 TypeScript、创建 CLI 入口、实现基础配置系统，最终得到一个能显示欢迎消息的 CLI 程序。

## 目标

- 初始化 Node.js + TypeScript 项目
- 创建 CLI 入口文件
- 实现基础配置系统
- 第一次运行程序

## 项目初始化

创建项目目录并初始化：

```bash
mkdir my-ai-coder
cd my-ai-coder
npm init -y
```

安装 TypeScript 和基础依赖：

```bash
npm install typescript tsx @types/node --save-dev
npm install commander chalk
```

创建 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

## 创建 CLI 入口

创建 `src/index.ts`：

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';

const program = new Command();

program
  .name('my-ai-coder')
  .description('AI 编程助手')
  .version('1.0.0');

program
  .command('chat')
  .description('开始对话')
  .action(() => {
    console.log(chalk.cyan('🤖 你好！我是你的 AI 编程助手。'));
    console.log(chalk.gray('提示: 输入 exit 退出'));
  });

program.parse();
```

更新 `package.json` 添加 bin 入口：

```json
{
  "bin": {
    "my-ai-coder": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts"
  }
}
```

## 运行测试

```bash
npm run dev chat
```

预期输出：

```
🤖 你好！我是你的 AI 编程助手。
提示: 输入 exit 退出
```

:::scenario{title="初始化项目配置"}
**用户场景**: 第一次运行程序

**系统需要**:
- 检测配置文件是否存在
- 引导用户输入 API Key
- 保存配置到本地
:::

## 配置系统

创建 `src/config.ts`：

```typescript
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.my-ai-coder');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface Config {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
}

export async function loadConfig(): Promise<Config> {
  try {
    const content = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}
```

## 配置初始化流程

修改 `src/index.ts`：

```typescript
import { loadConfig, saveConfig } from './config.js';
import readline from 'readline';

async function initConfig() {
  const config = await loadConfig();

  if (!config.apiKey) {
    console.log(chalk.yellow('首次使用，请配置 API Key'));

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const apiKey = await new Promise<string>((resolve) => {
      rl.question('请输入 OpenAI API Key: ', (answer) => {
        resolve(answer.trim());
        rl.close();
      });
    });

    await saveConfig({ apiKey, model: 'gpt-4' });
    console.log(chalk.green('✓ 配置已保存'));
  }
}

// 在 chat command 中调用
program
  .command('chat')
  .description('开始对话')
  .action(async () => {
    await initConfig();
    console.log(chalk.cyan('🤖 你好！我是你的 AI 编程助手。'));
  });
```

## 本章小结

本章我们完成了：
- ✓ Node.js + TypeScript 项目初始化
- ✓ CLI 框架搭建（Commander.js）
- ✓ 基础配置系统（文件读写）
- ✓ 首次运行配置引导

**下一步**: [Ch2: 连接大脑](/claude_from_scratch/part1/ch2-llm-connection.html) - 接入 LLM API，实现真正的对话功能。
```

- [ ] **Step 2: Commit**

```bash
git add src/content/part1/ch1-cli-skeleton.md
git commit -m "feat: add chapter 1 - cli skeleton"
```

---

### Task 11: Create Remaining MVP Chapters (Ch2-5)

**Files:**
- Create: `src/content/part1/ch2-llm-connection.md`
- Create: `src/content/part1/ch3-file-operations.md`
- Create: `src/content/part1/ch4-bash-execution.md`
- Create: `src/content/part1/ch5-code-editing.md`

- [ ] **Step 1: Write Chapter 2 (LLM Connection)**

```markdown
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
```

- [ ] **Step 2: Write Chapter 3 (File Operations)**

```markdown
---
title: "Ch3: 读取世界"
description: "实现文件系统操作，让 AI 能读取项目文件"
part: "基础篇"
order: 3
---

# Ch3: 读取世界

本章我们将实现文件系统操作工具，让 AI 能够读取文件、列出目录、搜索文件内容。

## 目标

- 实现文件读取
- 实现目录列表
- 实现 Glob 搜索
- 集成到对话中

## 文件读取工具

创建 `src/tools/ReadTool.ts`：

```typescript
import fs from 'fs/promises';
import path from 'path';

export interface ReadInput {
  file_path: string;
  offset?: number;
  limit?: number;
}

export interface ReadOutput {
  content: string;
  totalLines: number;
}

export class ReadTool {
  name = 'Read';
  description = '读取文件内容';

  async execute(input: ReadInput): Promise<ReadOutput> {
    const content = await fs.readFile(input.file_path, 'utf-8');
    const lines = content.split('\n');

    let result = content;
    if (input.offset !== undefined || input.limit !== undefined) {
      const start = input.offset || 0;
      const end = input.limit ? start + input.limit : lines.length;
      result = lines.slice(start, end).join('\n');
    }

    return {
      content: result,
      totalLines: lines.length
    };
  }
}
```

## 目录列表工具

创建 `src/tools/LSTool.ts`：

```typescript
import fs from 'fs/promises';
import path from 'path';

export interface LSInput {
  directory: string;
}

export interface LSEntry {
  name: string;
  type: 'file' | 'directory';
  size?: number;
}

export class LSTool {
  name = 'LS';
  description = '列出目录内容';

  async execute(input: LSInput): Promise<LSEntry[]> {
    const entries = await fs.readdir(input.directory, { withFileTypes: true });

    return Promise.all(
      entries.map(async (entry) => {
        const result: LSEntry = {
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file'
        };

        if (entry.isFile()) {
          const stat = await fs.stat(path.join(input.directory, entry.name));
          result.size = stat.size;
        }

        return result;
      })
    );
  }
}
```

## Glob 搜索工具

```typescript
// src/tools/GlobTool.ts
import { glob } from 'glob';

export interface GlobInput {
  pattern: string;
}

export class GlobTool {
  name = 'Glob';
  description = '搜索匹配模式的文件';

  async execute(input: GlobInput): Promise<string[]> {
    return glob(input.pattern, { absolute: true });
  }
}
```

:::scenario{title="查看项目结构"}
**用户说**: "这个项目有哪些文件？"

**系统响应**:
1. 调用 LSTool 列出根目录
2. 显示目录结构
3. 询问是否需要查看特定文件
:::

## 工具系统集成

创建 `src/tools/index.ts`：

```typescript
import { ReadTool } from './ReadTool.js';
import { LSTool } from './LSTool.js';
import { GlobTool } from './GlobTool.js';

export const tools = {
  Read: new ReadTool(),
  LS: new LSTool(),
  Glob: new GlobTool()
};

export type ToolName = keyof typeof tools;
```

## 让 AI 使用工具

修改 `src/chat.ts`：

```typescript
import { tools, ToolName } from './tools/index.js';

const TOOL_PROMPT = `你可以使用以下工具：
- Read(file_path: string): 读取文件内容
- LS(directory: string): 列出目录内容
- Glob(pattern: string): 搜索文件

如需使用工具，请回复 JSON 格式：
{"tool": "ToolName", "input": {...}}`;

export class ChatSession {
  constructor(private provider: LLMProvider) {
    this.messages.push({
      role: 'system',
      content: TOOL_PROMPT
    });
  }

  private async handleToolCall(toolName: string, input: any): Promise<string> {
    const tool = tools[toolName as ToolName];
    if (!tool) return `未知工具: ${toolName}`;

    try {
      const result = await tool.execute(input);
      return JSON.stringify(result, null, 2);
    } catch (err) {
      return `执行失败: ${err}`;
    }
  }
}
```

## 本章小结

- ✓ ReadTool - 文件读取
- ✓ LSTool - 目录列表
- ✓ GlobTool - 文件搜索
- ✓ 工具系统集成到对话

**下一步**: [Ch4: 执行命令](/claude_from_scratch/part1/ch4-bash-execution.html) - 实现 Bash 命令执行。
```

- [ ] **Step 3: Write Chapter 4 (Bash Execution)**

```markdown
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
```

- [ ] **Step 4: Write Chapter 5 (Code Editing)**

```markdown
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
```

- [ ] **Step 5: Commit all chapters**

```bash
git add src/content/part1/
git commit -m "feat: add part 1 chapters 2-5 (MVP complete)"
```

---

## Phase 7: Deployment

### Task 12: Build and Deploy

- [ ] **Step 1: Build the project**

```bash
npm run build
```

Expected: Build succeeds, creates dist/ with all HTML files

- [ ] **Step 2: Copy nginx config**

```bash
sudo cp nginx.conf /etc/nginx/conf.d/claude-from-scratch.conf
sudo nginx -t
```

Expected: `syntax is ok` and `test is successful`

- [ ] **Step 3: Reload nginx**

```bash
sudo systemctl reload nginx
```

- [ ] **Step 4: Test deployment**

```bash
curl -s http://localhost/claude_from_scratch/ | head -20
```

Expected: Returns HTML content with "Claude From Scratch" in title

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete MVP deployment"
```

---

## Summary

This implementation plan creates:

1. **Build System**: TypeScript-based static site generator with Markdown-to-HTML conversion
2. **Cyber-Brutalist Design**: Industrial dark theme with orange accents, Space Mono + Syne fonts
3. **5 MVP Chapters**: Complete tutorial from CLI skeleton to working AI coding assistant
4. **Nginx Deployment**: Production-ready config for Aliyun server at /claude_from_scratch

**Next Steps** (after MVP):
- Add Part 2 (Chapters 6-10) - Tool system, permissions, agents, configuration, UI
- Add Part 3 (Chapters 11-13) - Performance, MCP, enterprise deployment
- Add search functionality with Lunr.js
- Add scenario laboratory pages
