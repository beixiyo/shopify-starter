# GraphQL 查询

Hydrogen 通过 **Shopify Storefront API**（GraphQL）获取所有商店数据。这是从 Liquid 迁移后最大的变化——你需要主动查询数据，而非被动接收

## 1. 基本写法

```tsx
// 字符串模板 + #graphql 标记 + as const
const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      handle
      descriptionHtml
    }
  }
` as const
```

### 关键规则

| 规则 | 说明 |
|------|------|
| `#graphql` 开头 | 让编辑器识别语法高亮（VS Code GraphQL 插件） |
| `as const` 结尾 | 让 codegen 能推断精确的返回类型 |
| `@inContext` 指令 | 自动注入 i18n 上下文（country + language） |
| `$country` / `$language` | 由 `storefront.query()` 自动传入，无需手动传 |

### 在 loader 中执行查询

```tsx
export async function loader({ context, params }: Route.LoaderArgs) {
  const { product } = await context.storefront.query(PRODUCT_QUERY, {
    variables: { handle: params.handle },
    // $country 和 $language 由 context.storefront.i18n 自动注入
  })
  return { product }
}
```

---

## 2. Fragment（片段复用）

Fragment 避免在多个查询中重复字段定义

### 定义 Fragment

```tsx
// 在路由文件底部定义
const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    id
    availableForSale
    price { amount currencyCode }
    compareAtPrice { amount currencyCode }
    image { id url altText width height }
    selectedOptions { name value }
    title
  }
` as const
```

### 使用 Fragment

```tsx
const PRODUCT_QUERY = `#graphql
  query Product($handle: String!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      title
      selectedOrFirstAvailableVariant {
        ...ProductVariant              # ← 引用 fragment
      }
      adjacentVariants {
        ...ProductVariant              # ← 复用同一个 fragment
      }
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}           # ← 拼接 fragment 字符串
` as const
```

### 共享 Fragment

跨路由共享的 fragment 放在 `app/lib/fragments.ts`：

```tsx
// app/lib/fragments.ts
export const CART_QUERY_FRAGMENT = `#graphql
  fragment Money on MoneyV2 { currencyCode amount }
  fragment CartLine on CartLine { id quantity cost { ... } merchandise { ... } }
  fragment CartApiQuery on Cart { id totalQuantity lines { nodes { ...CartLine } } ... }
` as const

export const HEADER_QUERY = `#graphql
  query Header(...) { shop { ...Shop } menu(handle: $headerMenuHandle) { ...Menu } }
  ...
` as const
```

---

## 3. Codegen（类型自动生成）

### 配置

```ts
// .graphqlrc.ts
const graphqlConfig = {
  projects: {
    default: {
      schema: getSchema('storefront'), // Storefront API schema
      documents: [
        './*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        '!./app/graphql/**/*', // 排除 customer-account 目录
      ],
    },
    customer: {
      schema: getSchema('customer-account'), // Customer Account API schema
      documents: ['./app/graphql/customer-account/*.{ts,tsx}'],
    },
  },
}
```

### 生成类型

```bash
pnpm codegen    # 手动生成
pnpm dev        # 开发时自动 watch + 生成
```

生成的文件：
- `storefrontapi.generated.d.ts` — Storefront API 查询返回类型
- `customer-accountapi.generated.d.ts` — Customer Account API 查询返回类型

### 使用生成的类型

```tsx
// 导入生成的类型
import type { ProductFragment, ProductVariantFragment } from 'storefrontapi.generated'

function ProductCard({ product }: { product: ProductFragment }) {
  return <h2>{product.title}</h2> // ✅ 类型安全
}
```

---

## 4. 两种 API

### Storefront API（主要使用）

查询商品、集合、购物车等**面向顾客的数据**：

```tsx
// 通过 context.storefront 访问
const { product } = await context.storefront.query(PRODUCT_QUERY, {
  variables: { handle: 'cool-shirt' },
  cache: context.storefront.CacheShort(),
})
```

常用查询对象：
- `product` / `products` — 商品
- `collection` / `collections` — 集合
- `cart` — 购物车
- `shop` — 店铺信息
- `menu` — 导航菜单
- `search` / `predictiveSearch` — 搜索
- `page` / `blog` / `article` — CMS 内容

### Customer Account API（用户相关）

查询用户账户、订单等**需要认证的数据**：

```tsx
// 通过 context.customerAccount 访问
const { data } = await context.customerAccount.query(CUSTOMER_DETAILS_QUERY, {
  variables: { language: context.customerAccount.i18n.language },
})
```

Customer Account API 的 GraphQL 查询放在 `app/graphql/customer-account/` 目录，与 Storefront API 分开

---

## 5. 分页查询

Shopify 使用 **Cursor-based pagination**（游标分页）：

```tsx
import { getPaginationVariables } from '@shopify/hydrogen'

async function loadCriticalData({ context, params, request }: Route.LoaderArgs) {
  // 自动从 URL 解析分页参数（?cursor=xxx&direction=next）
  const paginationVariables = getPaginationVariables(request, { pageBy: 8 })

  const { collection } = await context.storefront.query(COLLECTION_QUERY, {
    variables: { handle: params.handle, ...paginationVariables },
  })
  return { collection }
}

// GraphQL 查询需要包含分页参数和 pageInfo
const COLLECTION_QUERY = `#graphql
  query Collection(
    $handle: String!
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      products(first: $first, last: $last, before: $startCursor, after: $endCursor) {
        nodes { ...ProductItem }
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

前端使用 `<Pagination>` 组件消费：

```tsx
import { Pagination } from '@shopify/hydrogen'

<Pagination connection={ collection.products }>
  {({ nodes, isLoading, PreviousLink, NextLink }) => (
    <div>
      <PreviousLink>{isLoading ? 'Loading...' : '← Load previous'}</PreviousLink>
      {nodes.map(product => <ProductCard key={ product.id } product={ product } />)}
      <NextLink>{isLoading ? 'Loading...' : 'Load more →'}</NextLink>
    </div>
  )}
</Pagination>
```

---

## 6. 查询组织原则

| 查询类型 | 放置位置 | 理由 |
|----------|---------|------|
| 页面专用查询 | 路由文件底部 | 与使用它的代码放一起，方便维护 |
| 多页面共享 fragment | `app/lib/fragments.ts` | 集中管理，避免重复 |
| Customer Account 查询 | `app/graphql/customer-account/` | 独立 schema，独立 codegen |
| 全局查询（header/footer） | `app/lib/fragments.ts` | 在 root.tsx 中使用 |

---

## 7. 调试技巧

- **本地 GraphiQL**：`pnpm dev` 启动后访问 `http://localhost:3000/graphiql`，直接查 Storefront API（见下方「数据验证」）
- **查看生成的类型**：`storefrontapi.generated.d.ts` 文件
- **Storefront API 文档**：https://shopify.dev/docs/api/storefront
- **VS Code 插件**：安装 GraphQL 插件，配合 `.graphqlrc.ts` 获得自动补全
- **loader 调试**：在 loader 中 `console.log()` 输出会出现在**终端**（运行 `pnpm dev` 的窗口），不在浏览器 DevTools

### 在 Shopify 后台查找 Product / Variant ID

Storefront API 使用 GID 格式的 ID（如 `gid://shopify/ProductVariant/47216813670656`），后台 URL 中的数字部分就是 GID 的末尾数字：

1. 登录 `admin.shopify.com/store/flowtica`
2. 进入 **Products** → 点击某个产品
3. **Product ID**：地址栏 `products/` 后的数字，如 `products/9200928260352` → GID 为 `gid://shopify/Product/9200928260352`
4. **Variant ID**：点击左侧某个 variant，地址栏变为 `products/9200928260352/variants/47216813670656` → GID 为 `gid://shopify/ProductVariant/47216813670656`

当前使用的关键 ID：

| 产品 | Variant 名称 | Variant ID | GID |
|------|-------------|------------|-----|
| Flowtica Scribe | （取最低价 `priceRange.minVariantPrice`） | — | — |
| Flowtica Scribe Power Set | Satin Gunmetal / Power Set / Not Now | `47216813670656` | `gid://shopify/ProductVariant/47216813670656` |

---

## 8. 数据验证

开发时需要确认「后台数据 → API → 前端渲染」三层一致。核心工具是 **Hydrogen 本地 GraphiQL**：`http://localhost:3000/graphiql`（仅开发环境可用）

### 三层真相源

| 层 | 入口 | 用途 |
|----|------|------|
| Shopify 后台 | `admin.shopify.com/store/flowtica` | 数据写入源 |
| Storefront API | 本地 GraphiQL | 验证 API 实际返回什么 |
| 前端页面 | `localhost:3000/products/<handle>` | 验证渲染是否正确 |

**排错思路**：GraphiQL 返回对但前端错 → 前端问题；GraphiQL 返回就错 → 后台数据或查询问题

### 后台字段 ↔ API 字段映射

| API 字段 | 后台位置 |
|----------|----------|
| `title` | 商品详情页 **Title** |
| `vendor` | 右栏 **Product organization → Vendor** |
| `descriptionHtml` | **Description** 富文本 |
| `handle` | 底部 **Search engine listing → URL handle**（点铅笔图标展开） |
| `options[]` | **Variants → Options** |
| `variants[].price` / `compareAtPrice` | variant 的 **Price** / **Compare-at price** |
| `variants[].sku` | variant 的 **Inventory → SKU** |
| `variants[].availableForSale` | 由 **Inventory quantity + Track quantity + Continue selling when out of stock** 综合决定 |
| `media[]` | 商品详情页 **Media** 区图片/视频顺序 |

权威字段定义：https://shopify.dev/docs/api/storefront/latest/objects/Product

### 常用验证查询

在本地 GraphiQL 粘贴（替换 handle 即可）：

```graphql
{
  product(handle: "flowtica-scribe") {
    title vendor descriptionHtml handle
    options { name optionValues { name } }
    variants(first: 50) {
      nodes {
        id title sku availableForSale
        price { amount currencyCode }
        compareAtPrice { amount currencyCode }
        selectedOptions { name value }
      }
    }
    media(first: 20) { nodes { __typename } }
  }
}
```

后台改字段 → Storefront API 有 CDN 缓存（秒级到几分钟生效）→ 刷新 GraphiQL 确认 → 再刷新前端页面

### variant 切换验证

1. 前端切换 Color/Size → URL 应带 `?Color=Red&Size=M`（由 `useSelectedOptionInUrlParam` 写入）
2. 直接访问带参数的 URL 应高亮对应选项并显示对应价格
3. 后台清空某 variant 库存且关闭超卖 → 该选项应变灰/不可选

---

## 9. 下一步

了解了 GraphQL 查询后，进入 [06-context-session.md](./06-context-session.md) 深入 Hydrogen Context
