# 组件体系

## 1. Hydrogen 内置组件

Hydrogen 提供了一组针对电商场景优化的 React 组件：

### `<Image>` — 优化图片

```tsx
import { Image } from '@shopify/hydrogen'

<Image
  data={ product.featuredImage } // Storefront API 返回的 image 对象
  sizes="(min-width: 768px) 50vw, 100vw"
  alt={ product.title }
/>
```

- 自动生成 `srcset`（多尺寸）
- 自动设置 `width` / `height`（避免 CLS）
- 支持 Shopify CDN URL 参数优化

### `<Money>` — 格式化价格

```tsx
import { Money } from '@shopify/hydrogen'

<Money data={ product.priceRange.minVariantPrice } />
// 输出：$29.99 或 ¥2,999 等（根据 currencyCode 自动格式化）
```

### `<Pagination>` — 游标分页

```tsx
import { Pagination } from '@shopify/hydrogen'

<Pagination connection={ collection.products }>
  {({ nodes, isLoading, PreviousLink, NextLink }) => (
    <div>
      <PreviousLink>
        {isLoading ? 'Loading...' : '← Load previous'}
      </PreviousLink>
      <div className="products-grid">
        {nodes.map((product, index) => (
          <ProductItem key={ product.id } product={ product } loading={ index < 8 ? 'eager' : undefined } />
        ))}
      </div>
      <NextLink>
        {isLoading ? 'Loading...' : 'Load more →'}
      </NextLink>
    </div>
  )}
</Pagination>
```

- 自动解析 URL 中的 `cursor` 和 `direction` 参数
- `PreviousLink` / `NextLink` 自动生成分页 URL
- 支持 "Load more" 和传统分页两种模式

### `<CartForm>` — 购物车操作

```tsx
import { CartForm } from '@shopify/hydrogen'

<CartForm route="/cart" inputs={ { lines } } action={ CartForm.ACTIONS.LinesAdd }>
  {fetcher => (
    <button type="submit" disabled={ fetcher.state !== 'idle' }>
      Add to Cart
    </button>
  )}
</CartForm>
```

详见 [cart-checkout.md](./cart-checkout.md)

### `<Analytics.Provider>` — 分析追踪

```tsx
// app/root.tsx
<Analytics.Provider cart={ data.cart } shop={ data.shop } consent={ data.consent }>
  <PageLayout>
    <Outlet />
  </PageLayout>
</Analytics.Provider>
```

### `<Analytics.ProductView>` / `<Analytics.CollectionView>` — 页面级追踪

```tsx
// 产品页
<Analytics.ProductView data={{
  products: [{
    id: product.id,
    title: product.title,
    price: selectedVariant?.price.amount || '0',
    vendor: product.vendor,
    variantId: selectedVariant?.id || '',
    variantTitle: selectedVariant?.title || '',
    quantity: 1,
  }],
}} />

// 集合页
<Analytics.CollectionView data={{
  collection: { id: collection.id, handle: collection.handle },
}} />
```

---

## 2. Hydrogen Hooks

### `useOptimisticVariant`

在产品页乐观选择变体（切换选项时 UI 立即更新）：

```tsx
import { getAdjacentAndFirstAvailableVariants, useOptimisticVariant } from '@shopify/hydrogen'

const selectedVariant = useOptimisticVariant(
  product.selectedOrFirstAvailableVariant,
  getAdjacentAndFirstAvailableVariants(product),
)
```

### `useSelectedOptionInUrlParam`

将选中的变体选项同步到 URL search params（不触发导航）：

```tsx
import { useSelectedOptionInUrlParam } from '@shopify/hydrogen'

useSelectedOptionInUrlParam(selectedVariant.selectedOptions)
// URL: /products/t-shirt?Color=Red&Size=M
```

### `getProductOptions`

将 Storefront API 返回的产品选项转换为前端可用的结构：

```tsx
import { getProductOptions } from '@shopify/hydrogen'

const productOptions = getProductOptions({
  ...product,
  selectedOrFirstAvailableVariant: selectedVariant,
})
// 返回 MappedProductOptions[]，包含 available、selected、exists 等状态
```

### `useOptimisticCart`

乐观更新购物车状态：

```tsx
import { useOptimisticCart } from '@shopify/hydrogen'

const cart = useOptimisticCart(originalCart)
// 在 action 响应前就能看到最新的购物车
```

### `useNonce`

获取 CSP nonce：

```tsx
import { useNonce } from '@shopify/hydrogen'

const nonce = useNonce()
// 用于 <script nonce={nonce}> 和 <ScrollRestoration nonce={nonce} />
```

### `useAnalytics`

访问 Analytics context：

```tsx
import { useAnalytics } from '@shopify/hydrogen'

const { publish, shop, cart, prevCart } = useAnalytics()
// publish('cart_viewed', { cart, prevCart, shop, url: window.location.href })
```

---

## 3. 项目中的自定义组件

### `PageLayout` — 页面骨架

```
┌─────────────────────────────────┐
│  CartAside (侧边抽屉)           │
│  SearchAside (搜索抽屉)          │
│  MobileMenuAside (移动菜单)      │
├─────────────────────────────────┤
│  Header (导航栏)                 │
├─────────────────────────────────┤
│  <main>{children}</main>        │  ← 路由内容在这里
├─────────────────────────────────┤
│  Footer (页脚)                   │
└─────────────────────────────────┘
```

所有 Aside（购物车、搜索、菜单）通过 `Aside.Provider` 管理开关状态

### `Aside` — 侧边抽屉系统

使用 React Context 管理多个抽屉的开关：

```tsx
const { open } = useAside()
open('cart') // 打开购物车抽屉
open('search') // 打开搜索抽屉
open('mobile') // 打开移动菜单

const { close } = useAside()
close() // 关闭当前抽屉
```

### `Header` — 导航栏

- 从 Storefront API 加载菜单数据（`menu(handle: "main-menu")`）
- 内部链接自动剥离 myshopify.com 域名，转为相对路径
- 使用 `<NavLink>` 实现 active 状态
- Deferred 加载：登录状态和购物车数量使用 `<Suspense>` + `<Await>`

### `ProductForm` — 产品选项选择器

处理复杂的变体选择逻辑：

```
┌─ Size ──────────────────────┐
│  [S]  [M]  [L]  [XL]       │  ← 可选、不可选、已选状态
├─ Color ─────────────────────┤
│  🔴  🔵  ⚫  ⬜              │  ← 支持 color swatch
├─────────────────────────────┤
│  [Add to Cart]              │  ← AddToCartButton
└─────────────────────────────┘
```

关键特性：
- **Combined listing**（组合商品）：不同变体可能指向不同产品 URL，用 `<Link>` 而非 `<button>`
- **SEO 考虑**：同产品内的变体切换用 `<button>` + JS 导航（避免搜索引擎索引重复链接）
- **Swatch 支持**：颜色选项可显示色块或图片

### `PaginatedResourceSection` — 通用分页容器

封装 `<Pagination>` 的通用版本：

```tsx
<PaginatedResourceSection<ProductItemFragment>
  connection={ collection.products }
  resourcesClassName="products-grid"
>
  {({ node: product, index }) => (
    <ProductItem key={ product.id } product={ product } />
  )}
</PaginatedResourceSection>
```

---

## 4. React Router 的关键组件

### `<Outlet />`

嵌套路由的渲染出口，等价于 Vue 的 `<router-view>`：

```tsx
// 在布局组件中
export default function AccountLayout() {
  return (
    <div>
      <AccountMenu />
      <Outlet context={ { customer } } />
      {' '}
      {/* 子路由内容在这里渲染 */}
    </div>
  )
}
```

### `<NavLink>`

带 active 状态的导航链接：

```tsx
<NavLink
  to="/collections"
  prefetch="intent" // 鼠标悬停时预加载
  style={ ({ isActive }) => ({ fontWeight: isActive ? 'bold' : undefined }) }
>
  Collections
</NavLink>
```

### `<Await>` + `<Suspense>`

消费 deferred 数据：

```tsx
<Suspense fallback={ <div>Loading...</div> }>
  <Await resolve={ promiseData }>
    {data => <MyComponent data={ data } />}
  </Await>
</Suspense>
```

### `<Form>` / `useFetcher`

- `<Form>` — 导航级表单（提交后 URL 变化）
- `useFetcher` — 非导航级表单（提交后 URL 不变，如加购）

`CartForm` 内部使用的就是 `useFetcher`

---

## 5. 下一步

进入 [dev-workflow.md](./dev-workflow.md) 了解开发工作流和部署
