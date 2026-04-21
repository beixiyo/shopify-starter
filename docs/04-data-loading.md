# 数据加载模式

这是 Hydrogen 最核心的开发模式。每个路由文件都遵循相同的 pattern：**在 `loader` 中查询数据，在组件中消费数据**

## 1. 核心模式：Critical vs Deferred

每个路由文件的 `loader` 将数据分为两类：

```tsx
export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args) // ❶ 不 await → 不阻塞
  const criticalData = await loadCriticalData(args) // ❷ await → 阻塞 TTFB
  return { ...deferredData, ...criticalData }
}
```

### Critical Data（关键数据）

- **await** 阻塞渲染，直到数据返回才发送 HTML
- 用于**首屏可见内容**（产品标题、图片、价格等）
- 如果查询失败，应该抛出错误（`throw new Response(null, {status: 404})`）

```tsx
async function loadCriticalData({ context, params }: Route.LoaderArgs) {
  const { storefront } = context
  const { product } = await storefront.query(PRODUCT_QUERY, {
    variables: { handle: params.handle },
  })
  if (!product)
    throw new Response(null, { status: 404 })
  return { product }
}
```

### Deferred Data（延迟数据）

- **不 await**，返回 Promise
- 用于**折叠线以下的内容**（推荐产品、评论、页脚等）
- 不阻塞 TTFB，通过 streaming SSR 后续注入
- **必须 catch 错误**，不能抛出（否则整个页面 500）

```tsx
function loadDeferredData({ context }: Route.LoaderArgs) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error: Error) => {
      console.error(error)
      return null // 失败返回 null，页面仍正常渲染
    })
  return { recommendedProducts } // 返回 Promise
}
```

### 前端消费 Deferred 数据

```tsx
import { Suspense } from 'react'
import { Await } from 'react-router'

export default function Page() {
  const { product, recommendedProducts } = useLoaderData<typeof loader>()

  return (
    <div>
      {/* Critical：直接渲染 */}
      <h1>{product.title}</h1>
      <ProductPrice price={ product.price } />

      {/* Deferred：Suspense + Await */}
      <Suspense fallback={ <div>Loading recommendations...</div> }>
        <Await resolve={ recommendedProducts }>
          {products => (
            <div>
              {products?.nodes.map(p => <ProductCard key={ p.id } product={ p } />)}
            </div>
          )}
        </Await>
      </Suspense>
    </div>
  )
}
```

---

## 2. `root.tsx` 的全局 loader

根布局的 loader 加载**所有页面都需要的数据**：

```tsx
// app/root.tsx loader
export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args)
  const criticalData = await loadCriticalData(args)
  const { storefront, env } = args.context

  return {
    ...deferredData,
    ...criticalData,
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    shop: getShopAnalytics({ storefront, publicStorefrontId: env.PUBLIC_STOREFRONT_ID }),
    consent: { /* cookie consent 配置 */ },
  }
}

// Critical：header 导航菜单（影响首屏）
async function loadCriticalData({ context }) {
  const [header] = await Promise.all([
    context.storefront.query(HEADER_QUERY, {
      cache: context.storefront.CacheLong(), // ← 缓存策略
      variables: { headerMenuHandle: 'main-menu' },
    }),
  ])
  return { header }
}

// Deferred：footer、cart、登录状态（不影响首屏）
function loadDeferredData({ context }) {
  const footer = context.storefront
    .query(FOOTER_QUERY, { cache: context.storefront.CacheLong() })
    .catch(() => null)
  return {
    cart: context.cart.get(),
    isLoggedIn: context.customerAccount.isLoggedIn(),
    footer,
  }
}
```

### `shouldRevalidate` 性能优化

```tsx
// root.tsx 默认不重新验证，避免每次导航都重新加载全局数据
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
}) => {
  if (formMethod && formMethod !== 'GET')
    return true // 表单提交后刷新
  if (currentUrl.toString() === nextUrl.toString())
    return true // 手动刷新
  return false // 页面导航不重新加载 root 数据
}
```

---

## 3. Action（表单处理）

`action` 处理 POST/PUT/DELETE 请求，最典型的场景是**购物车操作**：

```tsx
// app/routes/($locale).cart.tsx
export async function action({ request, context }: Route.ActionArgs) {
  const { cart } = context
  const formData = await request.formData()
  const { action, inputs } = CartForm.getFormInput(formData)

  let result: CartQueryDataReturn

  switch (action) {
    case CartForm.ACTIONS.LinesAdd:
      result = await cart.addLines(inputs.lines)
      break
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines)
      break
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds)
      break
    // ... 更多 action
  }

  return data({ cart: result.cart, errors: result.errors }, { status: 200 })
}
```

Action 的触发方式：
- `<Form method="POST">` — React Router 的表单组件
- `<CartForm>` — Hydrogen 封装的购物车表单（内部使用 `useFetcher`）
- `useFetcher().submit()` — 程序化提交

---

## 4. 缓存策略

Storefront API client 内置了缓存方法：

```tsx
const data = await context.storefront.query(MY_QUERY, {
  cache: context.storefront.CacheLong(), // 长缓存（1 小时）
  // 或
  cache: context.storefront.CacheShort(), // 短缓存（1 秒）
  // 或
  cache: context.storefront.CacheNone(), // 不缓存
  // 或自定义
  cache: {
    maxAge: 60, // 秒
    staleWhileRevalidate: 300,
  },
})
```

**使用建议**：

| 数据类型 | 缓存策略 | 原因 |
|----------|---------|------|
| Header / Footer 菜单 | `CacheLong()` | 很少变化 |
| 产品详情 | 默认（短缓存） | 价格/库存可能变化 |
| 购物车 | `CacheNone()` | 每次都需要最新状态 |
| 搜索结果 | 默认 | 实时性要求中等 |
| Sitemap | `CacheLong()` | 很少变化 |

---

## 5. 并行加载

在 `loadCriticalData` 中用 `Promise.all` 并行加载多个查询：

```tsx
async function loadCriticalData({ context, params }) {
  const { storefront } = context

  const [{ product }, { collection }] = await Promise.all([
    storefront.query(PRODUCT_QUERY, { variables: { handle: params.handle } }),
    storefront.query(RELATED_COLLECTION_QUERY),
    // 多个查询并行执行，总耗时 = 最慢的那个
  ])

  return { product, collection }
}
```

---

## 6. 类型安全

`Route.LoaderArgs` 和 `useLoaderData<typeof loader>()` 提供端到端类型安全：

```tsx
import type { Route } from './+types/products.$handle'

// ❶ LoaderArgs 自动推断 params 类型
export async function loader({ params }: Route.LoaderArgs) {
  params.handle // ✅ string（自动从文件名推断）
  params.locale // ✅ string | undefined（可选参数）
}

// ❷ MetaFunction 可以访问 loader 返回数据
export const meta: Route.MetaFunction = ({ data }) => {
  return [{ title: data?.product.title }] // ✅ 类型安全
}

// ❸ 组件中 useLoaderData 自动推断
export default function Product() {
  const { product } = useLoaderData<typeof loader>()
  product.title // ✅ string
}
```

类型来源：
- `Route.LoaderArgs` → `.react-router/types/` 自动生成
- GraphQL 返回类型 → `storefrontapi.generated.d.ts` 自动生成
- 两者配合实现从 **GraphQL schema → loader → 组件** 的完整类型链

---

## 7. 下一步

了解了数据加载后，进入 [graphql.md](./graphql.md) 深入 GraphQL 查询写法
