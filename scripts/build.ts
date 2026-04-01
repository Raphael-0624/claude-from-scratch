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
