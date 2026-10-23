# DeLab

面向设计师的网页设计走查工具。Chrome 浏览器插件，一键点击页面元素即可查看 CSS 样式与盒模型。

## 版本

v0.2 — CSS 检查器 + 盒模型可视化

### v0.2 新增

- 悬停时四色盒模型覆盖层（content / padding / border / margin），对标 DevTools 配色
- 覆盖层四向 margin / padding 数值标注
- 面板内固定尺寸 Box Model 线框图（可折叠，数值可点击复制）

### v0.1 已有

- 点击插件图标 / 右键菜单激活检查模式
- 悬停 tooltip（标签名 + 尺寸）
- 样式分组展示（文字、间距、尺寸、边框圆角、背景、阴影、布局）
- 色值预览、默认值过滤、复制功能
- 浅色 / 深色主题切换
- Esc 退出检查模式

## 本地加载步骤

1. 打开 Chrome，地址栏输入 `chrome://extensions`
2. 打开右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目的 `dist/` 目录
5. 插件安装完成，工具栏出现 DeLab 图标

## 使用方式

- **图标激活**：点击工具栏 DeLab 图标进入检查模式
- **右键激活**：页面任意位置右键 → 「DeLab 检查元素」
- **检查元素**：鼠标悬停显示四色盒模型覆盖层 + 尺寸 tooltip，点击锁定
- **查看样式**：锁定后浮窗展示 Box Model 线框图 + CSS 样式分组列表
- **退出**：按 Esc 或点击面板关闭按钮

## 构建

```bash
npm install
npm run build    # 生产构建
npm run dev      # 开发模式（监听文件变化）
```

## 技术栈

- Chrome Extension Manifest V3
- TypeScript + Webpack
- 原生 DOM 操作（无框架依赖）
- Shadow DOM 样式隔离
