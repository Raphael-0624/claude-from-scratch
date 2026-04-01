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
