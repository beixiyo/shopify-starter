# Hydrogen 概览

**创建项目**
```bash
pnpm create @shopify/hydrogen@latest
```

## 1. Hydrogen 是什么？

**Hydrogen = React Router 7（Remix）+ Shopify Storefront API + Vite + SSR**

它是 Shopify 官方的 Headless 前端框架。本质上就是一个标准的 React 全栈项目，但内置了 Shopify 电商能力（购物车、结账、用户账户、i18n、Analytics 等）

### 技术栈一览

| 层 | 技术 | 作用 |
|---|------|------|
| 框架 | React Router 7（原 Remix） | SSR、路由、数据加载、表单处理 |
| UI | React 18 | 组件渲染 |
| 构建 | Vite 6 | 开发服务器、HMR、打包 |
| 样式 | Tailwind CSS 4 | 原子化 CSS |
| 数据 | Shopify Storefront API（GraphQL） | 商品、集合、购物车、用户等 |
| 类型 | TypeScript + GraphQL Codegen | 端到端类型安全 |
| 运行时 | Oxygen（Cloudflare Workers） | 边缘 SSR 部署 |
| 本地模拟 | MiniOxygen | 本地模拟 Oxygen 运行时 |

---

## 2. 与 Liquid 主题的根本区别

| 维度 | Liquid 主题 | Hydrogen |
|------|------------|----------|
| **渲染方式** | Shopify 服务端渲染 Liquid 模板 | 你控制 SSR（React Router） |
| **数据获取** | Liquid 对象自动注入（`{{ product.title }}`） | 你在 `loader` 里写 GraphQL 查询 |
| **组件化** | Section + Snippet（.liquid 文件） | React 组件（.tsx 文件） |
| **路由** | Shopify 固定 URL 规则 | 文件系统路由（你完全控制） |
| **样式** | CSS / Liquid CSS | Tailwind / CSS Modules / 任意方案 |
| **交互** | Vanilla JS / Web Components | React 组件 + Hooks |
| **部署** | `theme push` 到 Shopify | 部署到 Oxygen 或任意 Node 托管 |
| **商户编辑** | Theme Editor 原生完整支持 | 需额外集成 CMS（或不提供） |
| **性能控制** | 受 Shopify CDN 约束 | 完全控制（缓存策略、streaming SSR） |
| **开发体验** | Liquid LSP 弱、无热更新 | Vite HMR、TypeScript、完整 React 生态 |

### 核心思维转变

**Liquid**：Shopify 帮你做好一切，你在模板里"填空"
**Hydrogen**：Shopify 给你数据 API，你自己"搭建"整个前端

---

## 3. 概念映射表

帮助你将 Liquid 主题的心智模型迁移到 Hydrogen：

| Liquid 概念 | Hydrogen 对应 | 说明 |
|-------------|--------------|------|
| `layout/theme.liquid` | `app/root.tsx` | 全局 HTML 骨架 + 布局组件 |
| `templates/product.json` | `app/routes/($locale).products.$handle.tsx` | 页面路由文件 |
| `sections/*.liquid` | `app/components/*.tsx` | 可复用 UI 区块 |
| `snippets/*.liquid` | `app/components/*.tsx`（更小粒度） | 原子组件 |
| `assets/` | `app/assets/` + `public/` | 静态资源 |
| `config/settings_schema.json` | 无直接对应 | 自建配置系统或接入 CMS |
| `config/settings_data.json` | 无直接对应 | 数据来自 Storefront API 或 CMS |
| `{{ product.title }}` | `useLoaderData()` 获取 | loader 中 GraphQL 查询 |
| `{% section 'header' %}` | `<Header />` | JSX 组件引用 |
| `{{ 'style.css' \| asset_url }}` | `import styles from './style.css?url'` | Vite 模块导入 |
| `{% render 'icon-cart' %}` | `<CartIcon />` | React 组件 |
| `{{ product \| json }}` | `useLoaderData<typeof loader>()` | 类型安全的数据访问 |
| Ajax API（`/cart/add.js`） | `CartForm` + route action | 表单提交 + 服务端处理 |
| Theme Editor | Sanity / Contentful / 自建 | 需额外集成 |
| `locales/*.json` | `app/lib/i18n.ts` + `@inContext` | URL 前缀 + GraphQL 指令 |
| Liquid 过滤器（`\| money`） | `<Money>` 组件 | React 组件封装 |
| `{% paginate %}` | `<Pagination>` 组件 | Hydrogen 内置 |

---

## 4. 什么时候选择 Hydrogen？

### 适合 Hydrogen 的场景

- 需要**高度定制**的 UI，Liquid 模板限制太多
- 团队熟悉 **React 生态**，不想学 Liquid
- 需要**极致性能**控制（streaming SSR、边缘缓存）
- 需要集成复杂的**第三方服务**（CMS、Reviews、AB Test）
- **不依赖商户** 在 Theme Editor 中自助编辑

### 不适合 Hydrogen 的场景

- 需要商户频繁通过 Theme Editor **拖拽编辑**页面
- 需要在 Shopify **Theme Store** 上架主题
- 团队没有 React / SSR 经验，学习成本太高
- 简单店铺，Liquid 主题已经够用

---

## 5. 下一步

理解了 Hydrogen 的定位后，进入 [02-project-structure.md](./02-project-structure.md) 了解项目的每一个文件和官方约定
