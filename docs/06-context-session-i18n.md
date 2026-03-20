# Context、Session 与国际化

## 1. Hydrogen Context — 依赖注入中心

`app/lib/context.ts` 是整个项目的核心，所有 API client 在这里创建：

```tsx
export async function createHydrogenRouterContext(request, env, executionContext) {
  const waitUntil = executionContext.waitUntil.bind(executionContext)
  const [cache, session] = await Promise.all([
    caches.open('hydrogen'), // HTTP 缓存
    AppSession.init(request, [env.SESSION_SECRET]), // Cookie session
  ])

  return createHydrogenContext({
    env,
    request,
    cache,
    waitUntil,
    session,
    i18n: getLocaleFromRequest(request), // 从 URL 解析 locale
    cart: { queryFragment: CART_QUERY_FRAGMENT }, // Cart API 配置
  }, additionalContext) // 扩展点：CMS、3P SDK 等
}
```

### 在 loader 中使用

```tsx
export async function loader({ context }: Route.LoaderArgs) {
  // 所有可用的 context 属性
  context.storefront // Storefront API client
  context.customerAccount // Customer Account API client
  context.cart // Cart API client
  context.session // Session（Cookie-based）
  context.env // 环境变量
  context.storefront.i18n // 当前 locale { language, country, pathPrefix }
}
```

### 扩展 Context

如果需要集成第三方服务，在 `additionalContext` 中添加：

```tsx
const additionalContext = {
  // 举例：集成 Sanity CMS
  // cms: await createSanityClient(env),
  // 举例：集成评论系统
  // reviews: await createReviewsClient(env),
} as const

// 类型自动扩展
type AdditionalContextType = typeof additionalContext
declare global {
  interface HydrogenAdditionalContext extends AdditionalContextType {}
}
```

添加后，可在任何 loader 中通过 `context.cms` 或 `context.reviews` 访问

---

## 2. Session

`app/lib/session.ts` 实现了基于 Cookie 的 session 存储：

```tsx
export class AppSession implements HydrogenSession {
  public isPending = false  // 标记 session 是否有未提交的变更

  static async init(request: Request, secrets: string[]) {
    const storage = createCookieSessionStorage({
      cookie: {
        name: 'session',
        httpOnly: true,    // JS 不可访问
        path: '/',
        sameSite: 'lax',   // CSRF 保护
        secrets,           // 加密密钥（SESSION_SECRET 环境变量）
      },
    })
    const session = await storage.getSession(request.headers.get('Cookie'))
    return new this(storage, session)
  }

  get(key) { ... }         // 读取
  set(key, value) { ... }  // 写入（标记 isPending = true）
  unset(key) { ... }       // 删除（标记 isPending = true）
  commit() { ... }         // 序列化 → Set-Cookie header
  destroy() { ... }        // 销毁整个 session
}
```

### Session 何时提交？

在 `server.ts` 中，请求结束时检查 `isPending`：

```tsx
if (hydrogenContext.session.isPending) {
  response.headers.set('Set-Cookie', await hydrogenContext.session.commit())
}
```

只有 session 被修改过（`set` 或 `unset`）才会写入 Cookie，避免不必要的 header

### 在 loader/action 中使用 session

```tsx
export async function action({ context, request }: Route.ActionArgs) {
  const { session } = context

  // 写入
  session.set('lastVisited', '/products/cool-shirt')

  // 读取
  const lastVisited = session.get('lastVisited')

  // flash 消息（读取一次后自动删除）
  session.flash('notification', 'Item added to cart!')
}
```

---

## 3. 国际化（i18n）

### 3.1 URL 结构

Hydrogen 通过 URL 前缀区分 locale：

```
/products/t-shirt           → 默认（EN-US）
/en-US/products/t-shirt     → English (United States)
/zh-CN/products/t-shirt     → 中文（中国）
/ja-JP/products/t-shirt     → 日本語（日本）
/fr-FR/products/t-shirt     → Français (France)
```

### 3.2 解析逻辑

`app/lib/i18n.ts`：

```tsx
export interface I18nLocale extends I18nBase {
  pathPrefix: string // '' 或 '/en-US'
}

export function getLocaleFromRequest(request: Request): I18nLocale {
  const url = new URL(request.url)
  const firstPathPart = url.pathname.split('/')[1]?.toUpperCase() ?? ''

  let pathPrefix = ''
  let [language, country] = ['EN', 'US'] // 默认值

  // 匹配 XX-YY 格式
  if (/^[A-Z]{2}-[A-Z]{2}$/i.test(firstPathPart)) {
    pathPrefix = `/${firstPathPart}`
    ;[language, country] = firstPathPart.split('-')
  }

  return { language, country, pathPrefix }
}
```

### 3.3 如何生效？

解析出的 locale 在三个地方发挥作用：

**1. GraphQL 查询自动注入 `@inContext`**

```graphql
query Product($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
  product(handle: "t-shirt") {
    title          # 返回对应语言的标题
    priceRange {
      minVariantPrice {
        amount       # 返回对应国家的货币和价格
        currencyCode
      }
    }
  }
}
```

`$country` 和 `$language` 由 `context.storefront.i18n` 自动传入，你不需要手动传递

**2. locale 路由校验**

```tsx
// app/routes/($locale).tsx
export async function loader({ params, context }) {
  const { language, country } = context.storefront.i18n
  // 如果 URL 中的 locale 与 storefront 的不匹配 → 404
  if (params.locale
    && params.locale.toLowerCase() !== `${language}-${country}`.toLowerCase()) {
    throw new Response(null, { status: 404 })
  }
  return null
}
```

**3. 链接前缀**

生成内部链接时需要加上 locale 前缀：

```tsx
// 产品变体 URL 需要考虑 locale 前缀
function getVariantUrl({ handle, pathname, selectedOptions }) {
  const match = /(\/[a-zA-Z]{2}-[a-zA-Z]{2}\/)/.exec(pathname)
  const isLocale = match && match.length > 0
  const path = isLocale
    ? `${match[0]}products/${handle}`
    : `/products/${handle}`
  return path
}
```

### 3.4 扩展 i18n

当前的 i18n 实现是最简模式（URL 前缀）。你可以改造为：

- **Cookie-based**：从 Cookie 读取用户偏好
- **Header-based**：从 `Accept-Language` 推断
- **Subdomain-based**：`us.myshop.com` / `jp.myshop.com`
- **混合模式**：URL 前缀 + Cookie 记住偏好

只需修改 `getLocaleFromRequest()` 函数即可

---

## 4. Cookie Consent（隐私合规）

`root.tsx` 的 loader 返回 consent 配置：

```tsx
consent: {
  checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
  storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
  withPrivacyBanner: false,       // 是否显示隐私横幅
  country: storefront.i18n.country,
  language: storefront.i18n.language,
}
```

Hydrogen 的 `<Analytics.Provider>` 会根据 consent 配置自动处理 cookie 合规

---

## 5. Content Security Policy（CSP）

`entry.server.tsx` 中创建 CSP：

```tsx
const { nonce, header, NonceProvider } = createContentSecurityPolicy({
  shop: {
    checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
    storeDomain: context.env.PUBLIC_STORE_DOMAIN,
  },
})
```

- `nonce` — 随机字符串，注入到 `<script nonce="xxx">`
- `header` — CSP header 字符串
- `NonceProvider` — React Context，让 Hydrogen 组件都能访问 nonce

如果你引入第三方脚本（Analytics、Chat 等），需要在 CSP 中添加对应域名

---

## 6. 下一步

进入 [07-cart-checkout.md](./07-cart-checkout.md) 了解购物车和结账的实现
