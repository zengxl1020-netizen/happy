# 快乐劳动 Happy Labor

一款面向家长与孩子的移动端 PWA 应用：记录孩子的家务劳动与每日学习（英语单词 / 成语），通过积分、成长树、等级称号、徽章墙与连续打卡火焰，让孩子在仪式感满满的反馈中爱上劳动与学习。

## 功能概览

- **多孩子管理**：多个孩子的数据完全隔离，随时切换
- **劳动记录**：内置 5 大类 35 个任务模板，支持自定义任务；自动记录完成时间、发布人与积分
- **积分规则**：每日积分上限（允许破例并标记）、连续达标奖励（连续 N 天每天 ≥ M 分，奖励 X 分，同一段连续周期不重复发放）
- **每日学习**：100 个基础英语单词 + 100 个小学成语，每天一个、顺序解锁，学完需通过四选一测验（答错抖动重试）；每项可由家长独立开关，共享每日积分上限
- **激励体系**：成长树 5 阶段、5 级称号、13 枚自动解锁徽章、连续打卡火焰
- **满足感反馈**：彩带庆祝、+N 积分飘字、升级/连击大奖全屏庆典、AI 生成音效
- **家长中心（设置页）**：4 位数字 PIN 家长锁、任务与积分管理、积分规则编辑、学习计划开关、发布人管理、添加到主屏幕引导、数据备份导出/导入（JSON）

## 技术栈

React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui · Dexie（IndexedDB 本地存储，带 updatedAt/deleted 软删除字段，便于未来迁移其他存储）· Zustand · react-router · recharts · canvas-confetti · vite-plugin-pwa

## 快速开始

```bash
npm install
npm run dev      # 本地开发
npm run build    # 生产构建
npm run smoke    # 数据层冒烟测试（17 项断言）
```

> **关于图片/音频资源**：仓库中的 png / mp3 资源以 base64 文本形式保存在 `assets-b64/` 目录，`npm run dev` 与 `npm run build` 前会自动执行 `scripts/decode-assets.mjs` 将其还原到真实路径（已解码的文件会跳过）。如手动克隆后资源缺失，可运行 `node scripts/decode-assets.mjs`。

## 目录结构

```
src/
  pages/        首页 / 统计 / 学习 / 设置
  components/   业务组件与 shadcn/ui 组件
  db/           Dexie 数据库、种子模板、Repository 数据访问层
  stores/       Zustand 状态
  lib/          徽章 / 等级 / 庆祝动效 / 日期工具
  data/         100 英语单词 + 100 成语词库
  assets/       插画与头像（解码生成）
scripts/        冒烟测试与资源解码脚本
assets-b64/     二进制资源的 base64 文本
```

数据仅存于浏览器本地（IndexedDB），无后端、无登录；清除浏览器数据会丢失记录，请定期在设置页导出备份。
