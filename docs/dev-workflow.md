# 开发工作流与部署

## 1. 开发命令

| 命令 | 作用 |
|------|------|
| `pnpm dev` | 启动开发服务器（Vite + MiniOxygen + codegen watch） |
| `pnpm build` | 构建生产产物 |
| `pnpm preview` | 本地预览生产构建 |
| `pnpm codegen` | 手动触发 GraphQL codegen + React Router typegen |
| `pnpm typecheck` | 类型检查（`react-router typegen && tsc --noEmit`） |

### Shopify CLI 命令

| 命令 | 作用 |
|------|------|
| `shopify hydrogen link` | 关联 Shopify store |
| `shopify hydrogen env pull` | 拉取 store 的环境变量到 `.env` |
| `shopify hydrogen env push` | 推送本地环境变量到 Oxygen |
| `shopify hydrogen deploy` | 部署到 Oxygen |
| `shopify hydrogen dev` | 等同于 `pnpm dev`（底层调用） |

---

## 2. 首次启动

```bash
cd hydrogen-storefront

# 1. 关联你的 Shopify store（会打开浏览器登录）
shopify hydrogen link

# 2. 拉取环境变量（API token、store domain 等）
shopify hydrogen env pull

# 3. 启动开发
pnpm dev
```

启动后你会看到：
- 本地服务器地址（如 `http://localhost:3000`）
- GraphQL codegen watch 运行中
- 修改代码 → Vite HMR → 页面即时更新

---

## 3. 环境变量

> 完整的变量说明、获取步骤和框架使用方式见 [迁移指南 § 连接商店](./migration-guide.md#2-连接商店--本地开发)

### 快速参考

```bash
# CLI 自动拉取（推荐）
shopify hydrogen link          # 关联 store
shopify hydrogen env pull      # 写入 .env

# 手动补充（CLI 不会生成）
echo "SESSION_SECRET=\"$(openssl rand -hex 32)\"" >> .env
```

### 环境区分

| 环境 | 配置位置 |
|------|---------|
| **本地开发** | `.env` 文件（被 `.gitignore` 忽略） |
| **Vercel 生产** | Vercel Dashboard → Project → Settings → Environment Variables |
| **Oxygen 生产** | Shopify Admin → Hydrogen → Environment Variables，或 `shopify hydrogen env push` |

---

## 4. TypeScript 配置

### `tsconfig.json` 关键配置

```json
{
  "compilerOptions": {
    "paths": { "~/*": ["./app/*"] },      // 路径别名
    "rootDirs": [".", "./.react-router/types"],  // 路由类型
    "types": [
      "@shopify/oxygen-workers-types",     // Oxygen Worker 全局类型（caches、Env 等）
      "react-router",                      // React Router 类型
      "@shopify/hydrogen/react-router-types",  // Hydrogen 扩展类型
      "vite/client"                        // import.meta.env 等
    ],
    "verbatimModuleSyntax": true,          // 强制 type-only import
    "strict": true
  }
}
```

### `env.d.ts` — 全局类型声明

```ts
/// <reference types="vite/client" />
/// <reference types="react-router" />
/// <reference types="@shopify/oxygen-workers-types" />
/// <reference types="@shopify/hydrogen/react-router-types" />

import '@total-typescript/ts-reset' // 增强内置类型（如 .filter(Boolean) 推断）
```

### 自动生成类型

| 类型来源 | 文件 | 生成命令 |
|----------|------|---------|
| GraphQL 查询返回 | `storefrontapi.generated.d.ts` | `pnpm codegen` |
| Customer Account 查询返回 | `customer-accountapi.generated.d.ts` | `pnpm codegen` |
| 路由 LoaderArgs/MetaFunction | `.react-router/types/` | `react-router typegen` |

`pnpm dev` 时自动 watch，修改查询后类型即时更新

---

## 5. Vite 配置详解

```ts
// vite.config.ts
export default defineConfig({
  plugins: [
    tailwindcss(), // Tailwind CSS 4（Vite 插件模式）
    hydrogen(), // Hydrogen SSR + codegen
    oxygen(), // MiniOxygen 本地开发服务器
    reactRouter(), // React Router Vite 插件（SSR、路由等）
    tsconfigPaths(), // 支持 ~ 路径别名
  ],
  build: {
    assetsInlineLimit: 0, // 禁止内联资源（CSP 兼容）
  },
  ssr: {
    optimizeDeps: {
      // CJS/ESM 兼容问题的依赖需要手动加入
      include: ['set-cookie-parser', 'cookie', 'react-router'],
    },
  },
  server: {
    allowedHosts: ['.tryhydrogen.dev'], // Hydrogen preview 域名
  },
})
```

### 插件顺序

`hydrogen()` 和 `oxygen()` 必须在 `reactRouter()` 之前，否则 SSR 和 codegen 可能异常

### SSR optimizeDeps

如果遇到类似 `ReferenceError: module is not defined` 的错误，将对应包加入 `ssr.optimizeDeps.include`

---

## 6. 部署

### 部署到 Vercel（推荐）

Hydrogen 本质是 Vite + React Router SSR 项目，可以部署到 Vercel

#### 6.1 安装依赖

```bash
pnpm add @vercel/react-router
```

#### 6.2 配置 react-router.config.ts

```ts
import type { Config } from '@react-router/dev/config'
import { vercelPreset } from '@vercel/react-router/vite'

export default {
  ssr: true,
  presets: [vercelPreset()],
} satisfies Config
```

#### 6.3 配置 server.ts

Vercel 使用 `process.env` 访问环境变量（而非 Oxygen 的 `env` 参数），需要适配 `server.ts`：

- `env.PUBLIC_STOREFRONT_API_TOKEN` → `process.env.PUBLIC_STOREFRONT_API_TOKEN`
- `ExecutionContext.waitUntil` → 从 `@vercel/functions` 导入 `waitUntil()`
- Oxygen 的 `caches` API 不可用，需移除或替换为其他缓存方案

#### 6.4 配置 vite.config.ts

- **移除** `oxygen()` 插件（仅本地开发需要，Vercel 不使用）
- `hydrogen()` 插件保留（提供 codegen 等开发工具）

#### 6.5 配置 Vercel

在项目根目录创建 `vercel.json`（可选，Vercel 通常能自动检测）：

```json
{
  "framework": "react-router"
}
```

#### 6.6 环境变量

在 **Vercel Dashboard → Project → Settings → Environment Variables** 中添加所有必需变量（参见 [第 3 节](#3-环境变量)）

> **注意**：`SESSION_SECRET` 在 Production / Preview / Development 三个环境都要设置

#### 6.7 部署

```bash
# 方式一：Git push 自动部署（推荐）
# 连接 GitHub 仓库后，push 到 main 即触发部署

# 方式二：手动部署
vercel deploy --prod
```

#### 6.8 域名绑定

1. Vercel Dashboard → Project → Settings → Domains
2. 添加 `www.flowtica.ai`
3. DNS 提供商添加 CNAME 记录：`www` → `cname.vercel-dns.com`
4. 根域名 `flowtica.ai` 添加 A 记录指向 Vercel IP，或设置重定向到 `www`

#### 6.9 客户账户 OAuth 回调

如果启用了客户账户登录，需要在 Shopify Admin → Settings → Customer accounts 中添加 Vercel 域名到 **Allowed redirect URLs**：

```
https://www.flowtica.ai/account/authorize
```

#### 6.10 注意事项

| 事项 | 说明 |
|------|------|
| **缓存** | Oxygen 提供内置 `caches` API，Vercel 没有。可使用 Vercel CDN 的 `Cache-Control` headers 做边缘缓存，或接入 Upstash Redis |
| **codegen** | Vercel 构建时不会自动执行 codegen，需要在 build 命令前手动执行：`shopify hydrogen codegen && npx react-router build` |
| **Streaming** | Vercel Functions 支持 streaming（Fluid Compute），React Router 的 streaming 正常工作 |
| **官方支持** | Shopify 官方只支持 Oxygen 部署，Vercel 部署属于社区方案，Hydrogen 升级时可能需要额外适配 |

---

### 部署到 Oxygen（不推荐）

> **价格昂贵**：Oxygen 需要 Shopify Plus 套餐（$2000+/月），不适合中小项目

```bash
shopify hydrogen deploy
```

Oxygen 是 Shopify 的边缘计算平台（基于 Cloudflare Workers），与 Shopify 深度集成（认证、缓存、零配置），但价格门槛极高。如果预算允许，它是集成度最好的方案

---

## 7. 本地开发 vs 生产环境

| 特性 | 本地（MiniOxygen） | 生产（Vercel） |
|------|-------------------|----------------|
| 运行时 | MiniOxygen（模拟 Worker） | Vercel Serverless / Edge Functions |
| 缓存 | 内存缓存 | Vercel CDN Cache-Control / Upstash Redis |
| 环境变量 | `.env` 文件 | Vercel Dashboard → Environment Variables |
| HTTPS | 无（localhost HTTP） | 自动 HTTPS |
| 域名 | `localhost:3000` | `www.flowtica.ai` |
| codegen | watch 模式 | 构建时一次性生成 |

---

## 8. 多 Store 本地开发

如果有两个 Shopify store：

| Store | 域名 | 本地子域名 | 状态 |
|-------|------|-----------|------|
| EN（主力） | `flowtica.myshopify.com` | `localhost:3000` | 商品/页面齐全 |
| JP（日本） | `hu0dn1-5x.myshopify.com` | `jp.localhost:3000` | 空库（上线前运营填充） |

本地只有一份 `.env`，两个子域名查同一 store。

### 8.1 切换到 EN store（测试完整功能）

```bash
cd frontend/shopify
pnpm shopify hydrogen link   # 交互式选 EN store（flowtica.myshopify.com）
pnpm shopify hydrogen env:pull
pnpm dev
```

切换后 `localhost:3000` 和 `jp.localhost:3000` 均查 EN 数据，语言/货币仍按子域名区分。

### 8.2 切换回 JP store

```bash
pnpm shopify hydrogen link   # 选 JP store（hu0dn1-5x.myshopify.com）
pnpm shopify hydrogen env:pull
pnpm dev
```

### 8.3 同步单个商品从 EN → JP（本地测试用）

JP store 为空时产品页会 404，不想切换整个 env 可以只同步需要的商品：

1. [EN store admin → Products](https://flowtica.myshopify.com/admin/products) → 搜索目标商品 → 勾选 → 右上角 **Export** → *Selected: N products* → *CSV for Excel* → 下载
2. [JP store admin → Products](https://hu0dn1-5x.myshopify.com/admin/products) → 右上角 **Import** → 上传 CSV → **Upload and preview** → **Import products**

完成后无需改 `.env` 或重启 server，`jp.localhost:3000/products/<handle>` 即可访问。

---

## 9. 开发技巧

### Mock Shop

如果还没有关联真实的 Shopify store，Hydrogen 会使用 mock data。页面顶部会显示 `MockShopNotice`。关联 store 后自动消失

### GraphQL 调试

- 浏览器 DevTools → Network → 搜索 `graphql` 请求
- Shopify Admin → Settings → Apps → API Explorer
- 安装 VS Code GraphQL 插件，配合 `.graphqlrc.ts` 获得自动补全

### 性能调优

- `loadCriticalData` 中尽量用 `Promise.all` 并行查询
- 非首屏数据放 `loadDeferredData`
- 合理使用缓存策略（`CacheLong` / `CacheShort`）
- `shouldRevalidate` 避免不必要的数据重新加载
- 图片使用 `<Image>` 组件自动优化
