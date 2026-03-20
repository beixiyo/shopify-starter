# Liquid → Hydrogen 迁移实战指南

## 目录

1. [环境准备：不需要新建店铺](#1-环境准备不需要新建店铺)
2. [连接商店 & 本地开发](#2-连接商店--本地开发)
3. [场景一：页面布局（Layout）](#3-场景一页面布局layout)
4. [场景二：数据获取与渲染](#4-场景二数据获取与渲染)
5. [场景三：产品页完整流程](#5-场景三产品页完整流程)
6. [场景四：集合页 + 分页](#6-场景四集合页--分页)
7. [场景五：购物车](#7-场景五购物车)
8. [场景六：自定义页面（如 Download、Company）](#8-场景六自定义页面如-downloadcompany)
9. [场景七：SEO & Meta](#9-场景七seo--meta)
10. [场景八：样式迁移（Tailwind）](#10-场景八样式迁移tailwind)
11. [场景九：i18n 多语言](#11-场景九i18n-多语言)
12. [打包、预发布、部署](#12-打包预发布部署)
13. [Liquid vs Hydrogen 概念映射表](#13-liquid-vs-hydrogen-概念映射表)
14. [迁移顺序建议](#14-迁移顺序建议)

---

## 1. 环境准备：不需要新建店铺

**直接用现有的 Flowtica Shopify 店铺**，不需要新建。原因：

- Hydrogen 通过 **Storefront API** 读取商品/集合/页面数据，和 Liquid 主题读的是同一个店铺数据库
- Liquid 主题和 Hydrogen 可以 **同时存在**，互不影响——Liquid 继续服务线上流量，Hydrogen 在独立的 Oxygen URL 上开发预览
- 只有当你决定 **正式切换域名指向** 时，流量才会从 Liquid 切到 Hydrogen

```
现有店铺 (flowtica.myshopify.com)
├── Liquid Theme → 继续服务 www.flowtica.com（不受影响）
└── Hydrogen App → 独立的 Oxygen 预览 URL（开发用）
                    ↑ 最终上线时才把域名指过来
```

### 创建 Hydrogen 项目

```bash
pnpm create @shopify/hydrogen@latest
```

---

## 2. 连接商店 & 本地开发

### Step 1：获取 Storefront API Token

> **注意**：`shopify hydrogen link` 需要 Shopify Plus 套餐（$2000/月），我们不用它
> 通过安装免费的 **Headless channel** 手动获取 token

1. 打开 [Headless - Shopify App Store](https://apps.shopify.com/headless)，点 **"Install"** 安装到你的店铺
2. 安装后在 Shopify Admin 侧边栏会出现 **"Headless"** channel
3. 点进去 → **"Create storefront"** → 输入名称（如 `Hydrogen Dev`）
4. 创建成功后进入 **"Storefront API"** 页面，即可看到：
  - **Public access token** — 用于客户端（浏览器）调用
  - **Private access token** — 用于服务端（loader）调用，**不要泄露**

### Step 2：配置环境变量

Hydrogen 框架通过 `HydrogenEnv` 接口定义了固定的环境变量名（**不可改名**），在 `.env` 中配置：

```py
# ============ 必须 ============
SESSION_SECRET="随机字符串至少32位"
PUBLIC_STOREFRONT_API_TOKEN="你的 Public access token"
PRIVATE_STOREFRONT_API_TOKEN="你的 Private access token（shpat_xxx）"
PUBLIC_STORE_DOMAIN="flowtica.myshopify.com"

# ============ 可选 ============
PUBLIC_STOREFRONT_ID=""                       # Analytics 追踪（Headless channel 页面可找到）
PUBLIC_CHECKOUT_DOMAIN=""                     # 自定义结账域名（没有则不填）
PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID=""      # 客户账户登录功能
PUBLIC_CUSTOMER_ACCOUNT_API_URL=""            # 客户账户 API 地址
SHOP_ID=""                                    # 店铺 ID（Analytics）
```

#### 环境变量说明


| 变量                                      | 必须    | 说明                                | 来源                                |
| --------------------------------------- | ----- | --------------------------------- | --------------------------------- |
| `SESSION_SECRET`                        | **是** | 加密 cookie session 的密钥             | 自己生成随机字符串                         |
| `PUBLIC_STOREFRONT_API_TOKEN`           | **是** | 客户端 Storefront API 调用（可暴露给浏览器）    | Headless channel → Storefront API |
| `PRIVATE_STOREFRONT_API_TOKEN`          | **是** | 服务端 Storefront API 调用（权限更大、速率更宽松） | Headless channel → Storefront API |
| `PUBLIC_STORE_DOMAIN`                   | **是** | 店铺域名，格式 `xxx.myshopify.com`       | 你的 Shopify 后台                     |
| `PUBLIC_STOREFRONT_ID`                  | 否     | Shopify Analytics 事件追踪            | Headless channel 页面               |
| `PUBLIC_CHECKOUT_DOMAIN`                | 否     | 自定义结账域名（默认用 Shopify 结账）           | Shopify Admin → Domains           |
| `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID` | 否     | 客户账户 API 认证                       | 需要登录功能时配置                         |
| `PUBLIC_CUSTOMER_ACCOUNT_API_URL`       | 否     | 客户账户 API 端点                       | 同上                                |
| `SHOP_ID`                               | 否     | 店铺数字 ID                           | Analytics 用                       |


#### 框架如何使用这些变量

```ts
// Hydrogen 内部的 createStorefrontClient 自动读取：
const { storefront } = createStorefrontClient({
  publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN, // 客户端用
  privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN, // 服务端用（优先）
  storeDomain: env.PUBLIC_STORE_DOMAIN,
  storefrontId: env.PUBLIC_STOREFRONT_ID,
})

// 在路由 loader 中通过 context.storefront 使用：
export async function loader({ context }: Route.LoaderArgs) {
  const { products } = await context.storefront.query(PRODUCTS_QUERY)
  // storefront.query 会自动选择 Private token（服务端）
}
```

> **Public vs Private token**：Hydrogen 是 SSR 框架，数据在服务端 loader 获取，
> 自动使用 Private token（更快、权限更大）。Public token 用于客户端直接调用的场景

### Step 3：启动开发

```bash
pnpm dev
```

打开 `http://localhost:3000`，你应该能看到商店真实数据（商品、集合等）

### 开发命令速查


| 命令               | 用途                              |
| ---------------- | ------------------------------- |
| `pnpm dev`       | 开发服务器（HMR + GraphQL codegen 监听） |
| `pnpm build`     | 生产构建                            |
| `pnpm preview`   | 本地预览生产构建                        |
| `pnpm typecheck` | TypeScript 类型检查                 |
| `pnpm codegen`   | 手动重新生成 GraphQL 类型               |


---

## 3. 场景一：页面布局（Layout）

### Liquid 中的布局

```
layout/theme.liquid
├── <head> ... {% render 'vite-tag' %} ...
├── {% sections 'header-group' %}     ← header.liquid
├── <main> {{ content_for_layout }} </main>   ← 各 template
└── {% sections 'footer-group' %}     ← footer.liquid
```

### Hydrogen 中的布局

**文件**：`app/root.tsx`

```tsx
// root.tsx 的 loader 负责全局数据
export async function loader(args: Route.LoaderArgs) {
  // 关键数据：阻塞渲染
  const header = await context.storefront.query(HEADER_QUERY, {
    cache: context.storefront.CacheLong(),
    variables: { headerMenuHandle: 'main-menu' },
  })

  // 非关键数据：流式加载，不阻塞首屏
  const footer = context.storefront.query(FOOTER_QUERY, {
    cache: context.storefront.CacheLong(),
    variables: { footerMenuHandle: 'footer' },
  })

  return { header, footer, cart: context.cart.get(), ... }
}

// Layout 组件渲染骨架
export function Layout({ children }: { children: React.ReactNode }) {
  const nonce = useNonce()
  const data = useRouteLoaderData<typeof loader>('root')

  return (
    <html>
      <head><Meta /><Links /></head>
      <body>
        {data
          ? <Analytics.Provider cart={data.cart} shop={data.header.shop}>
              <PageLayout {...data}>{children}</PageLayout>
            </Analytics.Provider>
          : children
        }
        <Scripts nonce={nonce} />
      </body>
    </html>
  )
}
```

**文件**：`app/components/PageLayout.tsx`

```tsx
// 对应 Liquid 的 header-group + main + footer-group
export function PageLayout({
  cart,
  children,
  footer,
  header,
  isLoggedIn,
}) {
  return (
    <>
      {/* 侧边栏：购物车抽屉、移动菜单、搜索 */}
      <CartAside cart={ cart } />
      <SearchAside />
      <MobileMenuAside header={ header } />

      {/* 主体布局 */}
      <Header header={ header } cart={ cart } />
      <main>{children}</main>
      {' '}
      {/* ← 各路由内容 */}
      <Footer footer={ footer } />
    </>
  )
}
```

### 概念对应


| Liquid                          | Hydrogen                          |
| ------------------------------- | --------------------------------- |
| `layout/theme.liquid`           | `app/root.tsx` + `PageLayout.tsx` |
| `{% sections 'header-group' %}` | `<Header />` 组件                   |
| `{{ content_for_layout }}`      | `<Outlet />` (React Router)       |
| `{% sections 'footer-group' %}` | `<Footer />` 组件                   |
| Section Groups (`.json`)        | 无对应概念，直接在组件中组合                    |


### 实战：修改全局布局

假设你要给 Flowtica 加一个全局的 announcement bar：

```tsx
// app/components/PageLayout.tsx
export function PageLayout({ ... }) {
  return (
    <>
      {/* 新增：公告栏 */}
      <AnnouncementBar text="Free shipping on orders over $50" />

      <Header header={header} cart={cart} />
      <main>{children}</main>
      <Footer footer={footer} />
    </>
  )
}
```

**对比 Liquid**：你不再需要在 `header-group.json` 中配置 section 顺序，也没有 Theme Customizer 拖拽功能——布局完全由代码控制

---

## 4. 场景二：数据获取与渲染

这是 Liquid → Hydrogen 最核心的变化

### Liquid 中获取数据

Liquid 通过 **全局对象** 自动注入数据，你不需要 "查询"：

```liquid
<!-- product.liquid：product 对象自动可用 -->
<h1>{{ product.title }}</h1>
<p>{{ product.description }}</p>
{% for variant in product.variants %}
  {{ variant.title }} - {{ variant.price | money }}
{% endfor %}
```

### Hydrogen 中获取数据

数据需要通过 **GraphQL 查询 Storefront API**，在路由的 `loader` 中执行：

```tsx
// app/routes/($locale).products.$handle.tsx

// 1️⃣ loader: 服务端执行，获取数据
export async function loader({ params, context, request }: Route.LoaderArgs) {
  const { handle } = params
  const { storefront } = context

  // GraphQL 查询
  const { product } = await storefront.query(PRODUCT_QUERY, {
    variables: {
      handle,
      selectedOptions: getSelectedProductOptions(request), // 从 URL 读取当前变体
    },
  })

  if (!product)
    throw new Response('Product Not Found', { status: 404 })

  return { product }
}

// 2️⃣ 组件: 使用 loader 返回的数据
export default function Product() {
  const { product } = useLoaderData<typeof loader>()

  return (
    <div>
      <h1>{product.title}</h1>
      <ProductImage image={ product.selectedOrFirstAvailableVariant?.image } />
      <ProductForm product={ product } />
    </div>
  )
}

// 3️⃣ GraphQL 查询定义
const PRODUCT_QUERY = `#graphql
  query Product(
    $handle: String!
    $selectedOptions: [SelectedOptionInput!]!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      description
      handle
      selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions) {
        id
        title
        price { amount currencyCode }
        image { url altText width height }
      }
      variants(first: 10) {
        nodes { id title price { amount currencyCode } }
      }
      images(first: 10) {
        nodes { url altText width height }
      }
    }
  }
` as const
```

### 关键差异总结


| Liquid                         | Hydrogen                                        |
| ------------------------------ | ----------------------------------------------- |
| 数据自动注入（`product`、`collection`） | 手动 GraphQL 查询，在 `loader` 中执行                    |
| 模板引擎渲染 `{{ }}`                 | React 组件 `{value}`                              |
| 同步渲染                           | 支持流式加载（critical + deferred）                     |
| 数据范围受限于 Liquid 对象              | 可查询 Storefront API 任意字段                         |
| 无缓存控制                          | 精细缓存：`CacheLong()`、`CacheShort()`、`CacheNone()` |


### 流式加载模式（重要！）

```tsx
export async function loader({ context }: Route.LoaderArgs) {
  // ✅ 关键数据：await，阻塞渲染
  const product = await context.storefront.query(PRODUCT_QUERY)

  // ✅ 非关键数据：不 await，流式加载
  const recommendations = context.storefront.query(RECOMMENDED_QUERY)

  return { product, recommendations }
}

export default function Product() {
  const { product, recommendations } = useLoaderData<typeof loader>()

  return (
    <div>
      {/* 立即渲染 */}
      <h1>{product.title}</h1>

      {/* 流式加载：数据到达前显示 Loading... */}
      <Suspense fallback={ <div>Loading recommendations...</div> }>
        <Await resolve={ recommendations }>
          {data => <RecommendedProducts products={ data.products } />}
        </Await>
      </Suspense>
    </div>
  )
}
```

---

## 5. 场景三：产品页完整流程

这是你最复杂的页面之一。Flowtica 的 Liquid 产品页涉及：

- `templates/product.json` → 定义 section 顺序
- `sections/main-product.liquid` → 主体
- `snippets/product-media-gallery.liquid` → 图片轮播
- `snippets/product-variant-picker.liquid` → 变体选择
- `snippets/buy-buttons.liquid` → 加购按钮
- 多个补充 section：`product-feature`、`product-grows`、`product-sticky-bar` 等

### Hydrogen 中的产品页

**路由文件**：`app/routes/($locale).products.$handle.tsx`

已有骨架代码，你需要逐步丰富：

```tsx
// 完整的产品页示例
export default function Product() {
  const { product } = useLoaderData<typeof loader>()
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  )

  return (
    <div className="product-page">
      {/* 图片区域 — 对应 product-media-gallery.liquid */}
      <ProductGallery images={ product.images.nodes } />

      {/* 产品信息 — 对应 main-product.liquid 右侧 */}
      <div className="product-info">
        <h1>{product.title}</h1>
        <ProductPrice
          price={ selectedVariant?.price }
          compareAtPrice={ selectedVariant?.compareAtPrice }
        />

        {/* 变体选择 — 对应 variant-picker.liquid */}
        <ProductForm
          product={ product }
          selectedVariant={ selectedVariant }
          variants={ getAdjacentAndFirstAvailableVariants(product) }
        />

        {/* 产品描述 */}
        <div dangerouslySetInnerHTML={ { __html: product.descriptionHtml } } />
      </div>

      {/* 补充 sections — 对应 product-feature, product-grows 等 */}
      <ProductFeatures metafields={ product.metafields } />
      <RelatedProducts handle={ product.handle } />
    </div>
  )
}
```

### 变体选择器的工作方式

Liquid 中变体通过 JS 操作 DOM 切换；Hydrogen 中 **变体 = URL 参数**：

```
/products/flowtica-scribe?Size=Large&Color=Black
```

```tsx
// ProductForm 组件内部
function ProductForm({ product, selectedVariant, variants }) {
  return (
    <div>
      {/* 每个选项（如 Size、Color）渲染一组按钮 */}
      {product.options.map(option => (
        <div key={ option.name }>
          <h4>{option.name}</h4>
          {option.optionValues.map(value => (
            <Link
              key={ value.name }
              to={ getLinkToVariant(value) } // ← 切换变体 = 切换 URL
              preventScrollReset
              replace
            >
              {value.name}
            </Link>
          ))}
        </div>
      ))}

      {/* 加购按钮 — 对应 buy-buttons.liquid */}
      <AddToCartButton
        lines={ [{ merchandiseId: selectedVariant.id, quantity: 1 }] }
        disabled={ !selectedVariant.availableForSale }
      >
        {selectedVariant.availableForSale ? 'Add to Cart' : 'Sold Out'}
      </AddToCartButton>
    </div>
  )
}
```

---

## 6. 场景四：集合页 + 分页

### Liquid 分页

```liquid
{% paginate collection.products by 12 %}
  {% for product in collection.products %}
    {% render 'card-product', product: product %}
  {% endfor %}
  {{ paginate | default_pagination }}
{% endpaginate %}
```

### Hydrogen 分页（游标分页）

```tsx
// app/routes/($locale).collections.$handle.tsx

export async function loader({ params, context, request }: Route.LoaderArgs) {
  const paginationVariables = getPaginationVariables(request, { pageBy: 8 })

  const { collection } = await context.storefront.query(COLLECTION_QUERY, {
    variables: { handle: params.handle, ...paginationVariables },
  })

  return { collection }
}

export default function Collection() {
  const { collection } = useLoaderData<typeof loader>()

  return (
    <div>
      <h1>{collection.title}</h1>

      {/* Pagination 组件处理"加载更多"或"上一页/下一页" */}
      <Pagination connection={ collection.products }>
        {({ nodes, PreviousLink, NextLink, isLoading }) => (
          <>
            <PreviousLink>← Previous</PreviousLink>

            <div className="products-grid">
              {nodes.map(product => (
                <ProductCard key={ product.id } product={ product } />
              ))}
            </div>

            <NextLink>Load more ↓</NextLink>
          </>
        )}
      </Pagination>
    </div>
  )
}

const COLLECTION_QUERY = `#graphql
  query Collection(
    $handle: String!
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) {
    collection(handle: $handle) {
      id
      title
      handle
      products(first: $first, last: $last, before: $startCursor, after: $endCursor) {
        nodes {
          id
          title
          handle
          featuredImage { url altText width height }
          priceRange {
            minVariantPrice { amount currencyCode }
          }
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          startCursor
          endCursor
        }
      }
    }
  }
` as const
```

### 关键差异


| Liquid              | Hydrogen                          |
| ------------------- | --------------------------------- |
| 基于页码 `?page=2`      | 基于游标 `?cursor=xxx&direction=next` |
| `{% paginate %}` 标签 | `<Pagination>` 组件                 |
| 服务端渲染整页             | 可做 "Load More" 无刷新加载              |


---

## 7. 场景五：购物车

### Liquid 购物车

Flowtica 用了 `cart-drawer`（侧边栏）+ `main-cart`（页面），通过 Shopify AJAX API (`/cart/add.js`) 操作

### Hydrogen 购物车

Hydrogen 的 Cart 是通过 **Storefront API** 管理的，使用 `CartForm` 组件：

```tsx
// 加购按钮
import { CartForm } from '@shopify/hydrogen'

function AddToCartButton({ lines, disabled, children }) {
  return (
    <CartForm
      route="/cart" // ← action 路由
      action={ CartForm.ACTIONS.LinesAdd }
      inputs={ { lines } }
    >
      <button type="submit" disabled={ disabled }>
        {children}
      </button>
    </CartForm>
  )
}
```

```tsx
// app/routes/($locale).cart.tsx — action 处理所有购物车操作

export async function action({ context }: Route.ActionArgs) {
  const { cart } = context
  const formData = await context.request.formData()
  const { action, inputs } = CartForm.getFormInput(formData)

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
    case CartForm.ACTIONS.DiscountCodesUpdate:
      result = await cart.updateDiscountCodes(inputs.discountCodes)
      break
    // ...更多操作
  }

  return data(result)
}
```

### 购物车抽屉

```tsx
// app/components/CartAside.tsx — 对应 cart-drawer.liquid
function CartAside({ cart }) {
  return (
    <Aside type="cart" heading="Shopping Cart">
      <Suspense fallback={ <p>Loading cart...</p> }>
        <Await resolve={ cart }>
          {resolvedCart => <CartMain cart={ resolvedCart } layout="aside" />}
        </Await>
      </Suspense>
    </Aside>
  )
}
```

---

## 8. 场景六：自定义页面（如 Download、Company）

### Liquid 中的自定义页面

Flowtica 有多个自定义页面模板：

- `templates/page.download.json` → 使用 `download-hero`、`download-features` 等 section
- `templates/page.company.json` → 使用 `company-banner`、`company-value` 等 section

这些页面的数据来自 **Section Schema settings**（Theme Customizer 配置）

### Hydrogen 中实现自定义页面

**方式一：硬编码（简单直接）**

```tsx
// app/routes/($locale).pages.download.tsx — 直接匹配 /pages/download

export async function loader({ context }: Route.LoaderArgs) {
  // 从 Metaobjects 获取动态内容（可选）
  const { metaobject } = await context.storefront.query(DOWNLOAD_PAGE_QUERY)
  return { page: metaobject }
}

export default function DownloadPage() {
  return (
    <div>
      <DownloadHero />
      <DownloadFeatures />
      <DownloadHowItWorks />
      <BrandFeatures />
    </div>
  )
}
```

**方式二：通用页面 + Metaobjects（灵活）**

```tsx
// app/routes/($locale).pages.$handle.tsx — 通用页面路由

export async function loader({ params, context }: Route.LoaderArgs) {
  const { page } = await context.storefront.query(PAGE_QUERY, {
    variables: { handle: params.handle },
  })

  if (!page)
    throw new Response('Not Found', { status: 404 })
  return { page }
}

export default function Page() {
  const { page } = useLoaderData<typeof loader>()

  return (
    <div>
      <h1>{page.title}</h1>
      {/* 渲染富文本内容 */}
      <div dangerouslySetInnerHTML={ { __html: page.body } } />
    </div>
  )
}

const PAGE_QUERY = `#graphql
  query Page($handle: String!, $language: LanguageCode, $country: CountryCode)
    @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      id
      title
      body
      seo { title description }
    }
  }
` as const
```

### Download 页面迁移策略

你的 Download 页面的 App Store / Android 链接目前由 `frontend/config/download.ts` 管理。在 Hydrogen 中：

```tsx
// app/config/download.ts — 直接复用现有逻辑
export const APPLE_APP_ID = 'xxx'
export const ANDROID_FALLBACK_URL = 'https://www.pgyer.com/flowtica'
// ... 其他常量和函数直接迁移
```

### Section Schema Settings 的替代方案

Liquid 的 Section Settings 在 Hydrogen 中没有直接对应。替代方案：


| Liquid Section Settings | Hydrogen 替代                                    |
| ----------------------- | ---------------------------------------------- |
| 文本/图片/颜色等简单设置           | **Metafields** — 在 Shopify Admin 中编辑，通过 API 查询 |
| 可排序的 Block 列表           | **Metaobjects** — 自定义数据结构，支持列表                 |
| 复杂的页面构建器                | **第三方 CMS**（Sanity、Contentful）或 **Weaverse**   |
| 硬编码即可的内容                | 直接写在组件里（对于很少变动的内容最简单）                          |


---

## 9. 场景七：SEO & Meta

### Liquid SEO

```liquid
<!-- Shopify 自动处理大部分 SEO -->
<title>{{ page_title }}</title>
<meta name="description" content="{{ page_description }}">
{{ content_for_header }}  <!-- 自动注入结构化数据等 -->
```

### Hydrogen SEO

```tsx
import { getSeoMeta } from '@shopify/hydrogen'

// 在路由中导出 meta 函数
export const meta: Route.MetaFunction = ({ data }) => {
  return getSeoMeta(
    {
      title: data?.product?.seo?.title ?? data?.product?.title,
      description: data?.product?.seo?.description ?? data?.product?.description,
      url: `https://flowtica.com/products/${data?.product?.handle}`,
    },
    // 产品页额外的 JSON-LD
    {
      'og:type': 'product',
      'og:image': data?.product?.featuredImage?.url,
    },
  )
}
```

**Sitemap & Robots**：模板已包含 `[sitemap.xml].tsx` 和 `[robots.txt].tsx`，开箱即用

---

## 10. 场景八：样式迁移（Tailwind）

好消息：**两个项目都使用 Tailwind CSS**，样式迁移相对轻松

### 迁移策略

```
frontend/legacy/css/*.css      → 不需要迁移，逐步用 Tailwind 替代
frontend/entrypoints/theme.css → app/styles/tailwind.css（已存在）
Liquid 内联 Tailwind class     → 直接复制到 React 组件的 className
```

### CSS 变量迁移

你的 Liquid 主题在 `theme.liquid` 中定义了 CSS 变量（`--page-width`、`--header-height` 等）。在 Hydrogen 中：

```css
/* app/styles/app.css */
:root {
  --page-width: 1200px;
  --header-height: 64px;
  /* 从 layout/theme.liquid 的 {% style %} 块中迁移 */
}
```

或者在 `tailwind.config` 中扩展：

```ts
// tailwind.config.ts（Tailwind v4 用 CSS 配置）
// app/styles/tailwind.css
@theme {
  --page-width: 1200px;
  --header-height: 64px;
}
```

---

## 11. 场景九：i18n 多语言

### Liquid 多语言

Shopify Markets + `locales/*.json` 翻译文件，Liquid 用 `{{ 'key' | t }}` 读取

### Hydrogen 多语言

已配置 URL 前缀策略（`app/lib/i18n.ts`）：

```
/           → 默认 EN-US
/zh-CN/     → 中文
/ja-JP/     → 日文
```

GraphQL 查询自动注入 `@inContext(country: $country, language: $language)`，API 返回对应语言的商品数据

**UI 文本翻译**：需要自行实现（推荐 `react-i18next` 或简单的 JSON 映射）

---

## 12. 打包、预发布、部署

### 本地开发 → 预览 → 部署的完整流程

```bash
# ① 本地开发
pnpm dev                        # http://localhost:3000

# ② 本地预览生产构建
pnpm build && pnpm preview      # 模拟 Oxygen 环境

# ③ 部署到 Oxygen（手动）
shopify hydrogen deploy          # 部署当前代码到 Oxygen

# ④ GitHub 自动部署（推荐）
git push origin main             # → 自动部署到 Production
git push origin feature/xxx      # → 自动部署到 Preview，生成预览 URL
```

### 环境管理

```bash
# 查看当前环境
shopify hydrogen env list

# 创建 staging 环境（关联 staging 分支）
# 在 Shopify Admin → Hydrogen → Environments 中操作

# 推送环境变量
shopify hydrogen env push --env-branch staging
```

### 部署流程对比

```
┌─────────────────────────────────────────────────────┐
│  Liquid Theme 部署                                    │
│                                                       │
│  代码修改 → pnpm build → shopify theme push           │
│             ↓                                         │
│        Vite 构建产物写入 assets/                       │
│             ↓                                         │
│        Shopify CDN 分发                               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Hydrogen 部署                                        │
│                                                       │
│  代码修改 → git push → GitHub Action 触发              │
│             ↓                                         │
│        Oxygen 构建 Worker bundle                      │
│             ↓                                         │
│        全球边缘部署（Cloudflare Workers）               │
│             ↓                                         │
│        生成预览 URL / 更新 Production                   │
│                                                       │
│  或手动: shopify hydrogen deploy                      │
└─────────────────────────────────────────────────────┘
```

### 域名切换（正式上线时）

```
当前：  www.flowtica.com → Shopify Liquid Theme
上线后：www.flowtica.com → Oxygen (Hydrogen)
        ↑ 在 Shopify Admin → Domains 中切换指向
```

**Liquid 主题不会被删除**，可随时切回

---

## 13. Liquid vs Hydrogen 概念映射表


| Liquid 概念                      | Hydrogen 对应                                 | 说明           |
| ------------------------------ | ------------------------------------------- | ------------ |
| `layout/theme.liquid`          | `app/root.tsx` + `PageLayout.tsx`           | 全局壳          |
| `templates/product.json`       | `app/routes/($locale).products.$handle.tsx` | 路由文件 = 模板    |
| `sections/main-product.liquid` | 路由文件的默认导出组件                                 | Section = 组件 |
| `snippets/xxx.liquid`          | `app/components/Xxx.tsx`                    | Snippet = 组件 |
| `{% render 'snippet' %}`       | `<Component />`                             | 引用组件         |
| `{{ product.title }}`          | `{product.title}`                           | 数据绑定         |
| `{% for item in array %}`      | `{array.map(item => ...)}`                  | 循环           |
| `{% if condition %}`           | `{condition && <Component />}`              | 条件           |
| Section Schema `settings`      | Metafields / Metaobjects / props            | 动态配置         |
| `{{ 'file.css' | asset_url }}` | `import './styles.css'` 或 Tailwind          | 样式引入         |
| `{{ product.url }}`            | `<Link to={'/products/' + handle}>`         | 链接           |
| `{% paginate %}`               | `<Pagination connection={...}>`             | 分页           |
| `{{ 'key' | t }}`              | `t('key')` (i18n 库)                         | 翻译           |
| `/cart/add.js` (AJAX API)      | `<CartForm action={ACTIONS.LinesAdd}>`      | 购物车操作        |
| Theme Customizer               | 无（需 Metaobjects 或第三方）                       | 可视化编辑        |
| `content_for_header`           | `<Scripts />` + `<Analytics.Provider>`      | 全局脚本         |
| Shopify CDN 托管                 | Oxygen 边缘部署                                 | 运行时          |


---

## 14. 迁移顺序建议

### 阶段一：跑通基础（1-2 天）

- `shopify hydrogen link` 连接商店
- `pnpm dev` 确认能看到真实数据
- 修改 `PageLayout.tsx`，搭建 Flowtica 的基础布局骨架
- 配置 Tailwind 主题变量（颜色、字体、间距）

### 阶段二：核心页面（按流量优先级）

- **首页** `_index.tsx` — 最先被访问，也最能体现品牌
- **产品页** `products.$handle.tsx` — 核心转化页
- **集合页** `collections.$handle.tsx` — 产品浏览
- **购物车** `cart.tsx` — 购买流程

### 阶段三：辅助页面

- 搜索页 `search.tsx`
- Blog `blogs.$blogHandle.tsx`
- 自定义页面（Download、Company）
- 客户账户（登录、订单、地址）

### 阶段四：上线准备

- SEO 检查（meta、sitemap、robots、结构化数据）
- 性能优化（流式加载、图片优化、缓存策略）
- 多语言配置
- Analytics / 追踪脚本集成
- Staging 环境测试
- 域名切换 → 正式上线

### 每个页面的迁移步骤

```
1. 打开对应的 Liquid section/template，理解数据和 UI 结构
2. 在 Hydrogen 路由 loader 中编写 GraphQL 查询
3. 用 React 组件重建 UI（复用 Tailwind class）
4. 测试数据渲染、交互、响应式
5. 对比 Liquid 页面，确认视觉一致性
```

---

## 快速参考卡片

```bash
# 日常开发
pnpm dev                              # 启动开发

# GraphQL 探索（找到可用的字段）
# 访问 https://shopify.dev/docs/api/storefront
# 或在 Shopify Admin → Settings → APIs → Storefront API

# 生成路由
shopify hydrogen generate route products/[handle]

# 部署
shopify hydrogen deploy               # 手动部署
git push                              # 自动部署（配置 GitHub 后）

# 环境变量
shopify hydrogen env pull              # 拉取
shopify hydrogen env push              # 推送

# 调试
shopify hydrogen dev --debug           # 调试模式
```

