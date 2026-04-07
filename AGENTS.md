# Shopify (Hydrogen) 开发规范

本文档说明 Shopify 前端项目的技术栈、项目结构和开发规范

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Shopify Hydrogen + React Router v7 |
| 构建 | Vite + TypeScript（ES2022, strict） |
| 样式 | TailwindCSS（mobile-first） |
| 动画 | motion/react |
| 数据 | Shopify Storefront API + GraphQL Codegen |
| 部署 | Shopify Oxygen（默认）/ Express（`EXPRESS_MODE=1`） |
| 包管理 | pnpm workspace |

## 路径别名

```
~/*  →  app/*
@/*  →  app/*
```

统一使用 `~/` 前缀：`import { Header } from '~/components/layout'`

## 项目结构

```
app/
├── assets/          # 静态资源（images/、svgs/、svg/）
├── components/
│   ├── layout/      # 布局组件（Header、Footer、PageLayout、Aside）
│   ├── home/        # 首页区块组件
│   ├── shared/      # 跨页面复用组件
│   ├── product/     # 产品相关组件
│   ├── cart/        # 购物车
│   ├── search/      # 搜索
│   ├── scribe/      # Scribe 产品页组件
│   └── [page]/      # 其他页面级组件
├── routes/          # 路由（pages/$handle.tsx 通过 pageMap 手动映射）
├── lib/             # 核心工具（i18n、context、session、fragments）
├── locales/         # 翻译文件
├── graphql/         # GraphQL 查询
├── config/          # 配置（产品模板等）
├── styles/css/      # 样式入口
├── root.tsx         # 根布局
├── entry.client.tsx # 客户端入口
└── entry.server.tsx # 服务端入口（Oxygen / Express）
```

## SVG 与静态资源

SVG 通过 **Vite 插件 `vite-plugin-svgr`** 接入，在 `vite.config.ts` 中注册 `svgr()`。类型由 `env.d.ts` 中的 `vite-plugin-svgr/client` 提供。

**作为 React 组件（推荐）**：在导入路径末尾加 `?react`，可用 `~/` 或 `@/` 指向 `app/`：

```tsx
import AppleIcon from '~/assets/svgs/apple.svg?react'

function Badge() {
  return <AppleIcon className="h-8 w-8 text-text" aria-hidden />
}
```

**作为 URL**（例如 `<img src>`）：不加 `?react`，走 Vite 默认资源导入

## 路由规范

**禁止使用 Remix 包或 `react-router-dom`**：

```tsx
// ✅ 正确
import { useLoaderData, Link } from 'react-router'

// ❌ 错误
import { ... } from '@remix-run/react'
import { ... } from 'react-router-dom'
```

### 页面路由（手动映射）

自定义页面通过 `app/routes/pages/$handle.tsx` 中的 `pageMap` 手动映射，**不是文件路由**：

```tsx
const pageMap: Record<string, ComponentType> = {
  'aboutus': CompanyPage,
  'download': DownloadPage,
  'flowtica-scribe': ScribePage,
}
```

新增页面时在 `pageMap` 中注册组件即可，无需创建新的路由文件。

### 其他路由文件约定

| 文件名 | 说明 |
|--------|------|
| `home.tsx` | 首页 |
| `pages/$handle.tsx` | 自定义页面（通过 pageMap 映射） |
| `_locale.tsx` | 布局边界 / locale 校验 |
| `catch-all.tsx` | 404 兜底 |

### 路由数据加载

```tsx
export async function loader(args: Route.LoaderArgs) {
  const criticalData = await loadCriticalData(args)
  const deferredData = loadDeferredData(args)  // 不 await，流式传输
  return { ...criticalData, ...deferredData }
}

export default function Page() {
  const data = useLoaderData<typeof loader>()
  return (
    <Suspense fallback={<Skeleton />}>
      <Await resolve={data.deferredData}>{(resolved) => ...}</Await>
    </Suspense>
  )
}
```

## 组件规范

### 导出与命名

- PascalCase 文件名与组件名
- **具名导出**，不用 `export default`（路由组件除外）
- `memo()` 包裹 + 设置 `displayName`
- 通过 `index.ts` 统一导出

```tsx
import { memo } from 'react'

export const MyComponent = memo(({ title }: MyComponentProps) => {
  return <div>{title}</div>
})

MyComponent.displayName = 'MyComponent'

type MyComponentProps = {
  title: string
}
```

### 动画

使用 `motion/react`，常见模式：

```tsx
import { motion } from 'motion/react'

const EASE = [0.25, 0.1, 0.25, 1] as const

<motion.div
  initial={ { opacity: 0, y: 30 } }
  animate={ { opacity: 1, y: 0 } }
  transition={ { duration: 0.7, delay: 0.2, ease: EASE } }
>
```

### 响应式

Tailwind mobile-first：无前缀 = 移动端，`md:` = 桌面端（≥768px）

```tsx
// 移动端 text-sm，桌面端 text-lg
<p className="text-sm md:text-lg" />
```

## 布局规范

### 统一内容宽度

所有页面内容区域必须统一使用 `max-w-7xl mx-auto` 居中：

```tsx
// ✅ 正确：section 全宽背景 + 内部 max-w-7xl 约束内容
<section className="bg-[#F7F5F2]">
  <div className="max-w-7xl mx-auto px-5 md:px-8">
    {/* 内容 */}
  </div>
</section>

// ❌ 禁止：max-w 放在 section 上导致背景被裁切
<section className="max-w-7xl mx-auto bg-[#F7F5F2]">
```

### Hero 首屏

- 必须 `min-h-svh` 铺满视口
- **禁止 `marginTop: -HEADER_HEIGHT` hack**（Header 是 fixed 定位，不在文档流中）
- 需要避开 Header 遮挡时，用空 div 占位：

```tsx
<section className="min-h-svh">
  {/* header 占位 */}
  <div className="shrink-0" style={ { height: HEADER_MAIN_OFFSET } } />
  {/* 内容 */}
</section>
```

### 翻译文本渲染

- **禁止 `dangerouslySetInnerHTML`**（翻译文件不应包含 HTML 标签）
- 换行用 `\n` + `whitespace-pre-line`：

```tsx
// ✅ 正确
<h2 className="whitespace-pre-line">{t('title')}</h2>

// ❌ 禁止
<h2 dangerouslySetInnerHTML={ { __html: t('title') } } />
```

### 布局常量

定义在 `~/components/layout/constants.ts`，布局相关数值统一引用：

```ts
HEADER_HEIGHT = 64 // Header 高度
HEADER_TOP_OFFSET = 16 // Header 顶部偏移
HEADER_MAIN_OFFSET = 80 // Header 总占位（64 + 16）
```

使用 `HEADER_THEME` 控制 Header 透明/实心主题切换：

```tsx
<section { ...HEADER_THEME.transparent }>  // Hero 区域
<section { ...HEADER_THEME.solid }>        // 普通区域
```

## i18n 国际化

### 支持的 Locale

- `EN-US`（默认，无路径前缀）
- `JA-JP`（路径前缀 `/JA-JP/`）

### 使用方式

```tsx
import { useTranslation, useLocalePath } from '~/lib/i18n'

const t = useTranslation('home')   // namespace
const tc = useTranslation('common')
const lp = useLocalePath()

<h1>{t('heroTitle')}</h1>
<Link to={lp('/products/flowtica-scribe')}>{tc('buyNow')}</Link>
```

翻译文件在 `app/locales/` 目录下。

## Workspace 共享包

可通过 workspace 包名直接导入：

```tsx
import { ScrollReveal } from 'comps'
import { IS_MOBILE_DEVICE } from 'config'
import { cn } from 'utils'
```

包定义见仓库根目录 `packages/*`。

## 设计 Token

继承仓库根目录 `tailwind.config.js` 的 Token 系统：

- 颜色通过 CSS 变量定义（`packages/styles/variable.ts` → 自动生成）
- 支持 light / dark 主题自动切换
- **优先使用 Token**：`bg-background2`、`text-text`、`border-border`
- **避免硬编码颜色**（Hero 等营销页面使用品牌色除外）

## 字体大小

继承仓库根目录 `tailwind.config.js` 的 `theme.extend.fontSize`。**常规**字号用配置内语义类；**禁止**用 Tailwind 默认阶梯（如 `text-2xl`、`text-base`）替代配置。极少数营销装饰、设备示意等非阶梯尺寸，**仅在对应组件内**用 `text-[…px]` 等局部任意值即可，不必为此扩张全局 `fontSize`。

语义化类名前缀（具体数值见配置）：

| 类名前缀 | 用途 |
|----------|------|
| `text-heading-hero` | 首屏 / Hero 超大标题 |
| `text-heading-xl` | Section 标题 — 大 |
| `text-heading-lg` | Section 标题 — 标准（多数 h2） |
| `text-heading-md` | Section 标题 — 小、卡片上主标题 |
| `text-heading-sm` | 子标题 / 卡片标题（h3） |
| `text-body-lg` / `text-body-md` / `text-body-sm` / `text-body-xs` | 正文阶梯（含更小一档 `body-xs`） |
| `text-caption` | 标签、徽章、脚注 |

### 响应式用法

移动端和桌面端使用不同档位，通过 `md:` 断点切换：

```tsx
// 移动端 heading-lg，桌面端 heading-xl
<h2 className="text-heading-lg md:text-heading-xl">{t('title')}</h2>

// 移动端 body-sm，桌面端 body-md
<p className="text-body-sm md:text-body-md">{t('desc')}</p>
```

### 注意事项

- `heading-hero` 仅用于 Hero 首屏大标题，普通 Section 标题最大用 `heading-xl`
- 正文默认使用 `text-body-md`，辅助说明、次要段落可用 `text-body-sm` / `text-body-xs`
- `text-caption` 用于标签、徽章、脚注等，不要当正文主段落使用
- 下载徽章等组件在**父级已设语义字号**时，内层可用 `text-[..em]` 做比例缩放（与父级 `font-size` 联动）；**正文与标题**仍优先用语义类，不要用任意 `px`/`rem` 替代 `body-*` / `heading-*`

## 字体族

字体族通过 `tailwind.css` 中 `@theme` 定义，用 Tailwind `font-*` 类名应用：

| 类名 | 变量 | 字体 | 用途 |
|------|------|------|------|
| `font-heading` | `--font-heading` | Marcellus, serif | 所有标题（h1–h3、Section title） |
| `font-sans` | `--font-sans` | Inter, sans-serif | 正文、说明、UI 文字（默认） |

```tsx
// ✅ 标题必须加 font-heading
<h2 className="font-heading text-heading-lg md:text-heading-xl">{t('title')}</h2>

// ✅ 正文无需声明（body 默认 font-sans）
<p className="text-body-md">{t('desc')}</p>
```

> `font-heading` 不会自动应用于 `<h1>`–`<h6>`，必须显式添加类名。

## 常用命令

```bash
pnpm --filter shopify dev        # 启动开发服务器
pnpm --filter shopify build      # 构建（Oxygen）
pnpm --filter shopify typecheck  # 类型检查
pnpm --filter shopify codegen    # GraphQL + 路由类型生成
pnpm --filter shopify lint       # ESLint
```

## 环境变量

必需变量见 `.env.example`，通过 `shopify hydrogen env pull` 拉取。核心：

- `SESSION_SECRET` — 会话密钥
- `PUBLIC_STOREFRONT_API_TOKEN` — Storefront API 公钥
- `PUBLIC_STORE_DOMAIN` — 商店域名
