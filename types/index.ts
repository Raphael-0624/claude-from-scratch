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
