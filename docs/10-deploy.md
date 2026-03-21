# 部署方案

三种部署方式，共享同一套应用代码（路由、组件、GraphQL），仅服务器入口和构建配置不同

## 方案对比

| | Worker 模拟 | Express Recipe | Cloudflare Workers |
|---|---|---|---|
| **入口文件** | `workers-server.mjs` | `server.express.mjs` | `dist/server/index.js` |
| **构建命令** | `pnpm build` | `pnpm build:express` | `pnpm deploy:cf` |
| **启动命令** | `pnpm start:node` | `pnpm start:express` | Cloudflare 托管 |
| **构建产物** | `dist/` | `build/` | `dist/` |
| **构建配置** | `vite.config.ts` + `hydrogenPreset()` | `vite.config.ts` + `EXPRESS_MODE=1` | 同 Worker 模拟 |
| **运行时** | Node.js + Express | Node.js + Express | Cloudflare Workers |
| **架构** | Express → `worker.fetch()` → Response | Express → `createRequestHandler()` → Response | 原生 Workers |
| **Polyfill** | `InMemoryCache` + fetch duplex | 无 | 无 |
| **适用场景** | 自有服务器、Docker | 自有服务器、Docker | 边缘部署、零运维 |

```bash
# Worker 模拟
pnpm build && pnpm start:node

# Express Recipe
pnpm build:express && pnpm start:express

# Cloudflare Workers
pnpm deploy:cf
```

## 用法

### 1. Worker 模拟（workers-server.mjs）

构建产物与 Cloudflare Workers 共用，通过 Express 模拟 Workers 的 `fetch()` 接口

**文件**：
- `workers-server.mjs` — 服务器入口
- `vite.config.ts` — 构建配置
- `server.ts` — Workers fetch handler（被构建打包进 `dist/server/index.js`）

### 2. Express Recipe（server.express.mjs）

基于官方 [Express Cookbook](https://shopify.dev/docs/storefronts/headless/hydrogen/cookbook/express) 方案，使用 `@react-router/express` 的 `createRequestHandler` 直接渲染路由，无需 Worker 模拟层

构建使用官方 `react-router build` 命令，通过 `EXPRESS_MODE=1` 让 `react-router.config.ts` 跳过 `hydrogenPreset()`，`vite.config.ts` 跳过 `oxygen()` 插件并添加 Node.js 兼容别名

**文件**：
- `server.express.mjs` — 服务器入口（内联了 Session、i18n、Cart Fragment）
- `vite.config.ts` — 构建配置（`EXPRESS_MODE=1` 时跳过 `oxygen()`，别名 `react-dom/server` → browser 版本）
- `react-router.config.ts` — `EXPRESS_MODE=1` 时跳过 `hydrogenPreset()`

**SSR 说明**：Express 模式通过 vite alias 自动将 `entry.server.tsx` 替换为 `entry.server.express.tsx`，后者使用 Node.js 原生的 `renderToPipeableStream` + `PassThrough`，避免 `renderToReadableStream` 在 Node.js 上的 abort 竞态问题。Workers / Cloudflare 仍使用 `entry.server.tsx`（`renderToReadableStream`）

### 3. Cloudflare Workers

直接部署到 Cloudflare 边缘网络。使用 `wrangler deploy` 将构建产物部署为 Workers，静态资源通过 `[assets]` 配置自动托管

**文件**：
- `server.ts` — Workers fetch handler
- `vite.config.ts` — 构建配置
- `wrangler.toml` — Workers 配置（`main` 指向 `dist/server/index.js`，`[assets]` 指向 `dist/client`）

## 开发

三种方案共享同一个开发命令：

```bash
pnpm dev # Hydrogen CLI + mini-oxygen + HMR + codegen
```

## 环境变量

所有方案都需要 `.env` 中的以下变量：

| 变量 | 用途 |
|------|------|
| `SESSION_SECRET` | Cookie 签名密钥 |
| `PUBLIC_STOREFRONT_API_TOKEN` | Storefront API 公开 token |
| `PRIVATE_STOREFRONT_API_TOKEN` | Storefront API 私密 token |
| `PUBLIC_STORE_DOMAIN` | 商店域名 |
| `PUBLIC_STOREFRONT_ID` | 商店 ID |
| `PORT` | 服务端口（默认 3000，仅自部署） |
