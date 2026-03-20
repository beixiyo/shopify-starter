# 路由系统

Hydrogen 使用 **React Router 7 的 flat routes**（文件系统路由）。文件名直接决定 URL 路径

## 1. 路由定义入口

```ts
// app/routes.ts
export default hydrogenRoutes([
  ...(await flatRoutes()), // 自动扫描 app/routes/ 目录
  // 手动路由也可以加在这里
]) satisfies RouteConfig
```

`hydrogenRoutes()` 是 Hydrogen 的包裹函数，会额外注入内部路由（如 customer account OAuth 回调）

---

## 2. 命名规则速查表

### 基础符号

| 符号 | 含义 | 示例文件名 | URL |
|------|------|-----------|-----|
| `.` | URL 分隔符 `/` | `products.all.tsx` | `/products/all` |
| `$param` | 动态参数 | `products.$handle.tsx` | `/products/t-shirt` |
| `($param)` | **可选**动态参数 | `($locale)._index.tsx` | `/` 或 `/en-US` |
| `_index` | 路径的默认页（Index 路由） | `account._index.tsx` | `/account`（区分于布局） |
| `name_` | **脱离**父布局 | `account_.login.tsx` | `/account/login`（不在 account 布局内） |
| `_name` | **无路径**布局（Pathless layout） | `_auth.tsx` | 无 URL，仅作为布局包裹子路由 |
| `[file.ext]` | 转义特殊字符 | `[robots.txt].tsx` | `/robots.txt` |
| `$` | 通配符（Catch-all） | `$.tsx` | 匹配所有未匹配的路径 |

### 项目中的实际路由

| 文件名 | URL | 说明 |
|--------|-----|------|
| `($locale)._index.tsx` | `/` 或 `/en-US` | 首页 |
| `($locale).products.$handle.tsx` | `/products/cool-shirt` | 产品详情 |
| `($locale).collections.$handle.tsx` | `/collections/summer` | 集合列表 |
| `($locale).collections._index.tsx` | `/collections` | 集合列表首页 |
| `($locale).collections.all.tsx` | `/collections/all` | 所有产品 |
| `($locale).cart.tsx` | `/cart` | 购物车（含 page 和 action） |
| `($locale).cart.$lines.tsx` | `/cart/xxx` | 购物车直链（预填商品） |
| `($locale).account.tsx` | `/account` | 账户**布局**（含 `<Outlet />`） |
| `($locale).account._index.tsx` | `/account` | 账户首页（在布局内） |
| `($locale).account.orders._index.tsx` | `/account/orders` | 订单列表 |
| `($locale).account.orders.$id.tsx` | `/account/orders/123` | 订单详情 |
| `($locale).account.profile.tsx` | `/account/profile` | 个人资料 |
| `($locale).account.addresses.tsx` | `/account/addresses` | 地址管理 |
| `($locale).account_.login.tsx` | `/account/login` | 登录页（**脱离** account 布局） |
| `($locale).account_.logout.tsx` | `/account/logout` | 登出（脱离 account 布局） |
| `($locale).account_.authorize.tsx` | `/account/authorize` | OAuth 回调 |
| `($locale).blogs._index.tsx` | `/blogs` | 博客列表 |
| `($locale).blogs.$blogHandle._index.tsx` | `/blogs/news` | 博客详情 |
| `($locale).blogs.$blogHandle.$articleHandle.tsx` | `/blogs/news/my-post` | 文章详情 |
| `($locale).pages.$handle.tsx` | `/pages/about` | CMS 页面 |
| `($locale).policies._index.tsx` | `/policies` | 政策列表 |
| `($locale).policies.$handle.tsx` | `/policies/privacy` | 政策详情 |
| `($locale).search.tsx` | `/search` | 搜索页 |
| `($locale).discount.$code.tsx` | `/discount/SUMMER20` | 折扣码重定向 |
| `($locale).[sitemap.xml].tsx` | `/sitemap.xml` | Sitemap |
| `($locale).sitemap.$type.$page[.xml].tsx` | `/sitemap/products/1.xml` | 分页 Sitemap |
| `($locale).api.$version.[graphql.json].tsx` | `/api/2024-01/graphql.json` | API 代理 |
| `[robots.txt].tsx` | `/robots.txt` | Robots.txt |
| `($locale).tsx` | — | locale 验证布局 |
| `($locale).$.tsx` | `/任意未匹配路径` | 404 兜底 |

---

## 3. 布局嵌套

### 基本布局

`($locale).account.tsx` 是一个**布局路由**（layout route），它：
1. 有自己的 `loader`（加载用户信息）
2. 渲染 `<Outlet />`（子路由在这里渲染）
3. 子路由共享这个布局

```
URL: /account/orders

渲染层级：
root.tsx (Layout + App)
  └── ($locale).account.tsx (AccountLayout)  ← 布局路由
        └── ($locale).account.orders._index.tsx  ← 子路由内容
```

### 脱离布局（`_` 后缀）

`($locale).account_.login.tsx` 文件名中 `account_` 的下划线后缀意味着：
- URL 仍然是 `/account/login`
- 但**不会**被 `($locale).account.tsx` 布局包裹
- 登录页不需要账户布局（因为用户还没登录）

```
URL: /account/login

渲染层级：
root.tsx (Layout + App)
  └── ($locale).account_.login.tsx  ← 直接在 root 下，跳过 account 布局
```

### `($locale).tsx` — locale 校验布局

这是一个特殊的布局路由，所有 `($locale).` 开头的路由都会先经过它：

```ts
// 验证 URL 中的 locale 参数是否合法
// 不合法的 locale（如 /xx-XX/products/...）→ 404
export async function loader({ params, context }) {
  if (params.locale && params.locale !== `${language}-${country}`) {
    throw new Response(null, { status: 404 })
  }
  return null
}
```

它没有任何 UI，纯粹做校验

---

## 4. i18n 路由

Hydrogen 通过 URL 前缀实现国际化：

```
/products/t-shirt           → 默认 locale（EN-US）
/en-US/products/t-shirt     → 英文（美国）
/zh-CN/products/t-shirt     → 中文（中国）
/ja-JP/products/t-shirt     → 日文（日本）
```

`($locale)` 是可选参数，解析逻辑在 `app/lib/i18n.ts`：

```ts
function getLocaleFromRequest(request: Request): I18nLocale {
  const firstPathPart = new URL(request.url).pathname.split('/')[1]
  // 匹配 XX-YY 格式（如 en-US、zh-CN）
  if (/^[A-Z]{2}-[A-Z]{2}$/i.test(firstPathPart)) {
    const [language, country] = firstPathPart.split('-')
    return { language, country, pathPrefix: `/${firstPathPart}` }
  }
  return { language: 'EN', country: 'US', pathPrefix: '' }
}
```

解析出的 locale 会：
1. 注入到 Hydrogen Context 的 `storefront.i18n`
2. 自动传递给所有 GraphQL 查询的 `@inContext` 指令
3. 让 Storefront API 返回对应语言/货币的数据

---

## 5. 路由文件的标准导出

每个路由文件可以导出以下内容（全部可选）：

| 导出 | 类型 | 作用 |
|------|------|------|
| `loader` | `async function` | 服务端数据加载（GET 请求） |
| `action` | `async function` | 服务端表单处理（POST/PUT/DELETE） |
| `default` | React 组件 | 页面 UI |
| `meta` | 函数 | `<title>` 和 `<meta>` 标签 |
| `links` | 函数 | `<link>` 标签（CSS、预加载等） |
| `headers` | 函数 | HTTP 响应头 |
| `shouldRevalidate` | 函数 | 控制数据重新加载时机 |
| `ErrorBoundary` | React 组件 | 路由级错误边界 |

---

## 6. 添加新路由

### 示例：添加 `/about` 页面

```tsx
// app/routes/($locale).about.tsx

import type { Route } from './+types/about'

export const meta: Route.MetaFunction = () => {
  return [{ title: 'About Us' }]
}

export async function loader({ context }: Route.LoaderArgs) {
  const { shop } = await context.storefront.query(SHOP_QUERY)
  return { shop }
}

export default function AboutPage() {
  const { shop } = useLoaderData<typeof loader>()
  return (
    <div>
      <h1>
        About
        {shop.name}
      </h1>
    </div>
  )
}

const SHOP_QUERY = `#graphql
  query Shop($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    shop { name description }
  }
` as const
```

创建文件后，路由自动生效（Vite watch），无需手动注册

---

## 7. 下一步

了解了路由系统后，进入 [04-data-loading.md](./04-data-loading.md) 学习数据加载的核心模式
