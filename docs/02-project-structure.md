# 项目结构与官方约定

## 1. 目录结构

```
hydrogen-storefront/
├── server.ts                          # ⭐ Worker 入口（fetch handler）
├── vite.config.ts                     # ⭐ Vite 配置（Hydrogen + Oxygen + React Router 插件）
├── react-router.config.ts             # ⭐ React Router 配置（Hydrogen preset）
├── .graphqlrc.ts                      # GraphQL codegen 配置
├── .env                               # 本地环境变量（MiniOxygen 使用）
├── env.d.ts                           # 全局类型声明（三方类型引用）
├── tsconfig.json                      # TypeScript 配置（paths: ~/* → ./app/*）
├── storefrontapi.generated.d.ts       # 🔄 自动生成：Storefront API 返回类型
├── customer-accountapi.generated.d.ts # 🔄 自动生成：Customer Account API 返回类型
│
├── app/
│   ├── root.tsx                       # ⭐ 根布局（HTML shell + 全局 loader）
│   ├── routes.ts                      # ⭐ 路由定义入口
│   ├── entry.client.tsx               # 客户端入口（hydration）
│   ├── entry.server.tsx               # 服务端入口（SSR renderToReadableStream）
│   │
│   ├── routes/                        # 页面路由（文件名 = URL）
│   │   ├── ($locale)._index.tsx       # 首页
│   │   ├── ($locale).products.$handle.tsx
│   │   ├── ($locale).collections.$handle.tsx
│   │   ├── ($locale).cart.tsx
│   │   ├── ($locale).account.tsx      # 账户布局（含 Outlet）
│   │   ├── ($locale).account._index.tsx
│   │   ├── ($locale).account_.login.tsx
│   │   ├── ($locale).search.tsx
│   │   ├── [robots.txt].tsx
│   │   └── ...
│   │
│   ├── components/                    # UI 组件
│   │   ├── PageLayout.tsx             # 页面骨架（Header + main + Footer + Aside）
│   │   ├── Header.tsx                 # 导航栏
│   │   ├── Footer.tsx                 # 页脚
│   │   ├── Aside.tsx                  # 侧边抽屉（购物车、搜索、移动菜单）
│   │   ├── ProductForm.tsx            # 产品选项 + 加购按钮
│   │   ├── AddToCartButton.tsx        # 加购按钮（CartForm 封装）
│   │   ├── CartMain.tsx               # 购物车主体
│   │   ├── CartLineItem.tsx           # 购物车行项
│   │   ├── CartSummary.tsx            # 购物车汇总
│   │   ├── ProductImage.tsx           # 产品图片（Hydrogen Image 封装）
│   │   ├── ProductPrice.tsx           # 产品价格
│   │   ├── ProductItem.tsx            # 产品卡片（列表用）
│   │   ├── SearchForm.tsx             # 搜索表单
│   │   ├── SearchFormPredictive.tsx   # 预测搜索表单
│   │   ├── SearchResults.tsx          # 搜索结果
│   │   ├── SearchResultsPredictive.tsx # 预测搜索结果
│   │   ├── PaginatedResourceSection.tsx # 分页容器
│   │   └── MockShopNotice.tsx         # 未关联店铺提示
│   │
│   ├── graphql/                       # GraphQL 查询（按 API 分目录）
│   │   └── customer-account/          # Customer Account API
│   │       ├── CustomerDetailsQuery.ts
│   │       ├── CustomerOrderQuery.ts
│   │       ├── CustomerOrdersQuery.ts
│   │       ├── CustomerAddressMutations.ts
│   │       └── CustomerUpdateMutation.ts
│   │
│   ├── lib/                           # 核心工具
│   │   ├── context.ts                 # ⭐ Hydrogen 上下文工厂
│   │   ├── session.ts                 # Session 实现（Cookie-based）
│   │   ├── i18n.ts                    # 国际化（URL → locale）
│   │   ├── fragments.ts              # 共享 GraphQL fragments（Cart、Menu、Shop）
│   │   ├── variants.ts               # 产品变体 URL 工具
│   │   ├── redirect.ts               # 本地化 handle 重定向
│   │   ├── search.ts                 # 搜索类型定义 + 工具函数
│   │   └── orderFilters.ts           # 订单过滤查询构建
│   │
│   ├── styles/
│   │   ├── tailwind.css               # Tailwind 入口（@import "tailwindcss"）
│   │   ├── reset.css                  # CSS Reset
│   │   └── app.css                    # 全局自定义样式
│   │
│   └── assets/
│       └── favicon.svg
│
├── public/                            # 静态资源（直接服务，不经过 Vite 处理）
│
└── .react-router/                     # 🔄 自动生成：路由类型定义
    └── types/
        └── app/routes/+types/...      # 每个路由文件的 LoaderArgs、MetaFunction 等类型
```

---

## 2. 官方强制约定（⭐ 标记文件）

这些文件有**固定的名称、位置或导出格式**，不可随意修改：

### `server.ts` — Worker 入口

```ts
// 必须 export default 一个包含 fetch 方法的对象
export default {
  async fetch(request: Request, env: Env, executionContext: ExecutionContext) {
    // 1. 创建 Hydrogen 上下文
    // 2. 创建请求处理器（React Router）
    // 3. 处理 404 重定向
    // 4. 返回 Response
  }
}
```

**职责**：
- 初始化 Hydrogen 上下文（storefront client、session、cart 等）
- 将 React Router 作为请求处理器
- 处理 session cookie 写入
- 404 时检查 Shopify 的 URL 重定向表

### `vite.config.ts` — Vite 配置

```ts
// 必须包含这四个插件，顺序有讲究
plugins: [
  tailwindcss(), // Tailwind CSS
  hydrogen(), // Hydrogen SSR + codegen
  oxygen(), // MiniOxygen 本地开发服务器
  reactRouter(), // React Router Vite 插件
  tsconfigPaths(), // ~ 路径别名
]
```

**注意**：`hydrogen()` 和 `oxygen()` 必须在 `reactRouter()` 之前

### `react-router.config.ts` — React Router 配置

```ts
export default {
  presets: [hydrogenPreset()], // 必须使用 Hydrogen preset
} satisfies Config
```

`hydrogenPreset()` 会自动配置 SSR、服务端构建目标等选项

### `app/root.tsx` — 根布局

必须导出：
- `Layout` — HTML shell（`<html>`、`<head>`、`<body>`）
- `default` — App 组件（`<Analytics.Provider>` + `<PageLayout>` + `<Outlet />`）
- `loader` — 加载全局数据（shop info、header menu、footer、cart、login 状态）
- `links` — preconnect CDN、favicon 等
- `ErrorBoundary` — 全局错误边界

### `app/routes.ts` — 路由入口

```ts
export default hydrogenRoutes([
  ...(await flatRoutes()), // 文件系统路由
  // 也可以手动添加路由
]) satisfies RouteConfig
```

`hydrogenRoutes()` 包裹是为了注入 Hydrogen 内部路由（如 customer account 回调）

### `app/lib/context.ts` — Hydrogen 上下文

```ts
export async function createHydrogenRouterContext(request, env, executionContext) {
  // 初始化 session、cache、i18n
  // 调用 createHydrogenContext() 创建 storefront/cart/customerAccount client
  // 返回完整上下文对象
}
```

这是整个项目的**依赖注入中心**，所有 API client 在这里创建

---

## 3. 自动生成文件（🔄 标记）

**不要手动编辑**这些文件：

| 文件 | 生成方式 | 内容 |
|------|---------|------|
| `storefrontapi.generated.d.ts` | `pnpm codegen` | Storefront API GraphQL 查询的返回类型 |
| `customer-accountapi.generated.d.ts` | `pnpm codegen` | Customer Account API 查询的返回类型 |
| `.react-router/types/` | `react-router typegen` | 每个路由文件的 `Route.LoaderArgs`、`Route.MetaFunction` 等 |

`pnpm dev` 时 codegen 会自动 watch，修改 GraphQL 查询后类型自动更新

---

## 4. 请求生命周期

从浏览器发出请求到返回 HTML 的完整流程：

```
1. 浏览器发出请求
   ↓
2. server.ts → fetch()
   ↓
3. createHydrogenRouterContext()
   ├── 打开缓存实例（caches.open('hydrogen')）
   ├── 初始化 Session（从 Cookie 读取）
   ├── 解析 i18n（从 URL 提取 locale）
   ├── 创建 Storefront API client
   ├── 创建 Customer Account client
   └── 创建 Cart client
   ↓
4. createRequestHandler() — React Router 接管
   ↓
5. 匹配路由文件（如 ($locale).products.$handle.tsx）
   ↓
6. 执行 loader()
   ├── loadCriticalData() — await 关键数据（阻塞 TTFB）
   └── loadDeferredData() — 非关键数据（Promise，不阻塞）
   ↓
7. 渲染组件 → SSR → ReadableStream
   ↓
8. entry.server.tsx
   ├── 创建 CSP（Content Security Policy）
   ├── renderToReadableStream()
   └── bot 检测（isbot → 等待 allReady）
   ↓
9. 返回 Response
   ├── 写入 Session Cookie（如果有变更）
   └── 404 时检查 Shopify URL 重定向
```

### 关键概念：SSR Streaming

Hydrogen 使用 `renderToReadableStream`，这意味着：
- **Critical 数据**（await）阻塞首字节，但保证首屏可见内容完整
- **Deferred 数据**（Promise）通过流式传输后续注入，前端用 `<Suspense>` + `<Await>` 消费
- Bot（搜索引擎）会等待所有内容就绪后才返回（`body.allReady`）

---

## 5. entry 文件详解

### `entry.client.tsx` — 客户端入口

```tsx
// 在浏览器端执行 hydration
hydrateRoot(
  document,
  <StrictMode>
    <NonceProvider value={ existingNonce }>
      <HydratedRouter />
    </NonceProvider>
  </StrictMode>
)
```

**特殊处理**：跳过 Google 缓存页面（`webcache.googleusercontent.com`），避免在 Google 缓存上执行 hydration

### `entry.server.tsx` — 服务端入口

- 创建 **CSP**（Content Security Policy）nonce
- 用 `renderToReadableStream` 流式渲染
- Bot 检测：搜索引擎爬虫等待所有内容就绪
- 设置 CSP header

---

## 6. 下一步

了解了项目结构后，进入 [03-routing.md](./03-routing.md) 深入理解路由系统
