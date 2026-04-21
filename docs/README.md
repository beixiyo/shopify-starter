# Flowtica Hydrogen Storefront

## 目标

将 Flowtica 官网从 **Shopify Liquid 主题** 迁移到 **Hydrogen（React + React Router）** 架构

## 为什么迁移

- Liquid 主题受限于模板引擎，前端能力弱
- 现有方案是 Liquid + Vite + React islands 的过渡架构，维护复杂
- Hydrogen 提供完整的 React SSR，自由度更高，性能更好

## 当前状态

- **现有官网**：`www.flowtica.ai`，Shopify Liquid 主题托管
- **Hydrogen 项目**：`frontend/shopify/`，已创建，已连接 Storefront API
- **部署方案**：**Shopify Oxygen**（官方托管，Basic 套餐即可，免费） —— 详见 [deploy-oxygen.md](./deploy-oxygen.md)
  - 备用路径：Cloudflare Workers（`pnpm deploy:cf`）/ 自部署 Express，见 [deploy-cloudflare.md](./deploy-cloudflare.md)
  - 历史上曾误判 Oxygen 需 Plus $2000/月，实际 Basic $39/月足够，Hydrogen channel 本身免费
- **Storefront API Token**：通过 Hydrogen channel（推荐）或 [Headless channel](https://apps.shopify.com/headless) 获取，均免费

## 技术栈

| 技术 | 版本 |
|------|------|
| Hydrogen | 2026.1.2 |
| React Router | 7.x |
| React | 19.x |
| TailwindCSS | 4.x |
| TypeScript | 5.x |
| Vite | 6.x |

## 域名

| 域名 | 用途 | 状态 |
|------|------|------|
| `www.flowtica.ai` | Online Store（Primary） | Connected |
| `flowtica.ai` | 重定向到 www | Connected |
| `flowtica.myshopify.com` | Shopify 默认域名 / 结账域名 | Connected |
| `account.flowtica.ai` | 客户账户 | Connected |

## 环境配置

Token 获取：安装 [Headless channel](https://apps.shopify.com/headless) → Create storefront → Storefront API 页面

```env
# 必须
SESSION_SECRET="随机字符串至少32位"
PUBLIC_STOREFRONT_API_TOKEN="Headless channel → Public access token"
PRIVATE_STOREFRONT_API_TOKEN="Headless channel → Private access token（shpat_xxx）"
PUBLIC_STORE_DOMAIN="flowtica.myshopify.com"
PUBLIC_CHECKOUT_DOMAIN="flowtica.myshopify.com"

# 可选
PUBLIC_STOREFRONT_ID=""                       # Analytics 追踪
PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID=""      # 客户账户登录
PUBLIC_CUSTOMER_ACCOUNT_API_URL=""            # 客户账户 API
SHOP_ID=""                                    # Analytics
```

## 文档索引

### 入门（按顺序读）

前 4 篇是 Hydrogen 心智模型的依赖链，初次接触项目按顺序读完

- [01-overview.md](./01-overview.md) — Hydrogen 项目概览与定位
- [02-project-structure.md](./02-project-structure.md) — 目录结构与官方约定
- [03-routing.md](./03-routing.md) — 路由系统（React Router 7 flat routes）
- [04-data-loading.md](./04-data-loading.md) — loader 数据加载模式（critical / deferred）

### 开发参考（按需查阅）

- [graphql.md](./graphql.md) — Storefront API GraphQL 查询写法
- [context-session.md](./context-session.md) — Hydrogen Context 依赖注入 + Session
- [components.md](./components.md) — Hydrogen 内置组件与自定义组件模式
- [cart-checkout.md](./cart-checkout.md) — 购物车与结账（CartForm / Action）
- [customer-account-login.md](./customer-account-login.md) — 客户账户登录接入（概念、后台配置、tunnel、生产回调）
- [dev-workflow.md](./dev-workflow.md) — 开发命令、调试、日常工作流

### 国际化与市场

- [i18n.md](./i18n.md) — 代码层 i18n（按域名切 locale、variant 匹配、翻译陷阱）
- [translation.md](./translation.md) — 运营侧翻译工作流（Translate & Adapt）
- [market-pricing.md](./market-pricing.md) — 按地区设置不同价格
- [test-orders.md](./test-orders.md) — 测试订单与支付验证

### 部署

- [deploy-oxygen.md](./deploy-oxygen.md) — **Oxygen 部署（首选）**，点击级操作说明
- [deploy-cloudflare.md](./deploy-cloudflare.md) — Cloudflare / 自部署（备用路径）

### 专题

- [migration-guide.md](./migration-guide.md) — Liquid → Hydrogen 逐步迁移教程，含各场景对比和代码示例
- [todo-smile-judgeme.md](./todo-smile-judgeme.md) — Smile.io 与 Judge.me 接入待办方案
