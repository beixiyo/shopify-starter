# 待办：Smile.io 与 Judge.me 接入方案

> 旧 Liquid 主题（`flowtica-shopify`）通过 Shopify **Theme App Block**（`shopify://apps/smile-io/blocks/...`）接了 Smile.io。新 Hydrogen 项目是 headless React，**App Block 完全不工作**，必须改走 JS SDK / REST API 自渲染。
>
> Judge.me 在旧项目**实际并未接入**（搜索 `.liquid/.json/.js/.css/.md` 均无匹配，之前看到的匹配来自 PNG 二进制），这次属于**全新接入**。

---

## 一、现状快照

### 旧项目已接 Smile.io 的位置

| 位置 | 老项目文件 | Block 类型 |
|---|---|---|
| 首页 hero 区浮动启动器锚点 | [flowtica-shopify/sections/hero-slideshow.liquid:82](../../../flowtica-shopify/sections/hero-slideshow.liquid) | `data-smile-launcher-anchor`（配合 `IntersectionObserver` 在 hero 可见时显隐 `#smile-ui-lite-launcher-frame-container`） |
| 产品页 · 积分提示 | [flowtica-shopify/templates/product.json:163](../../../flowtica-shopify/templates/product.json) | `smile-io/blocks/smile-points-on-product-page` |
| Scribe 产品页 · 积分提示 | [flowtica-shopify/templates/product.scribe.json:129](../../../flowtica-shopify/templates/product.scribe.json) | 同上 |
| `/loyalty-program` 着陆页 | [flowtica-shopify/templates/page.loyalty-program.json](../../../flowtica-shopify/templates/page.loyalty-program.json) | `smile-landing-page-header` / `how-it-works` / `earning-rule-highlight` / `redeeming-rule-highlight` 四块 |

### 新项目对应迁移目标

| 目标 | 新项目文件 |
|---|---|
| 全局浮动启动器 + hero 滚动显隐 | [app/root.tsx](../app/root.tsx) |
| 产品页积分 / 评论星级 | [app/routes/products/$handle.tsx](../app/routes/products/$handle.tsx) · [app/components/scribe/ScribeProductPage.tsx](../app/components/scribe/ScribeProductPage.tsx) · [app/components/buy-now/BuyNowProductPurchase.tsx](../app/components/buy-now/BuyNowProductPurchase.tsx) |
| 忠诚度着陆页 | 需新建 `app/routes/loyalty-program.tsx` |
| 评论（Judge.me） | 产品页 + 可选的评论聚合页 |

---

## 二、Smile.io（⚠️ 有套餐 blocker）

### Blocker：Hydrogen 属于"非主 storefront"

[Smile.io 官方文档](https://help.smile.io/en/articles/4891875-javascript-sdk)：

> Using Smile.js on a different website or storefront (outside of your primary Shopify or BigCommerce store) is an advanced use case. In addition to enabling the JavaScript SDK, this requires **API Access** (✅ **Plus and Enterprise plans only**).

翻译：老 Liquid 主题属于"primary Shopify store"，任何套餐都能用；新 Hydrogen 是独立 storefront，**必须 Plus ($999/月) 或 Enterprise 才能接**

**接入前第一步**：登录 [Smile Admin](https://web.smile.io) > Settings > Billing，确认当前套餐。若非 Plus+ 则先砍需求或先升套餐

### 若套餐 OK，接入方案

**凭证准备**
- `SMILE_PUBLISHABLE_KEY`（`pub_xxx` 格式，Smile Admin > Settings > Developer Tools）
- 若要个性化（按登录客户展示积分），还需生成 `customerToken`（JWT，服务端签）

**步骤清单**

- [ ] 在 Smile Admin > Settings > Developer Tools 启用 *JavaScript SDK*
- [ ] `.env` 添加 `PUBLIC_SMILE_PUBLISHABLE_KEY=pub_xxx`（`PUBLIC_` 前缀，Hydrogen env 规范）
- [ ] 在 [app/root.tsx](../app/root.tsx) 的 `<head>` 注入 Smile UI 脚本：
      ```html
      <script async src="https://js.smile.io/v1/smile-ui.js" data-smile-shop-id="..."></script>
      ```
      或用 SDK 方式：加载后 `window.Smile.initialize({ publishableKey, customerToken })`
- [ ] 浮动启动器显隐逻辑迁移到 React（参考 [flowtica-shopify/layout/theme.liquid:441-502](../../../flowtica-shopify/layout/theme.liquid)）：
      - 在首页 hero 组件加 `data-smile-launcher-anchor` DOM 属性
      - 在 [app/root.tsx](../app/root.tsx) 或独立 `SmileLauncherBinder` 组件里用 `useEffect` + `IntersectionObserver` 切 `#smile-ui-lite-launcher-frame-container` 的 `.smile-hidden` class
      - 老项目 poll 逻辑（`POLL_MS=400, POLL_MAX=40`）可以简化为监听 `smile-ui:ready` 事件
- [ ] 产品页积分提示：调 [Smile REST API](https://dev.smile.io/api) `GET /v1/points_products/{product_id}` 拿 earning rules，自写 Tailwind 组件
- [ ] `/loyalty-program` 着陆页：新建 `app/routes/loyalty-program.tsx`，通过 REST API 拉 header / how-it-works / earning-rules / redeeming-rules 数据，自绘 UI（参照老 [page.loyalty-program.json](../../../flowtica-shopify/templates/page.loyalty-program.json) 的四块结构）
- [ ] i18n：Smile 自己的 UI 文案在 Smile Admin 里配；自绘部分走项目现有 i18n

**文档索引**
- 指南：https://dev.smile.io/js/introduction
- 初始化：https://dev.smile.io/js/smile/initialize
- 全量文档：https://dev.smile.io/llms.txt

---

## 三、Judge.me（无 blocker，纯新增）

### 套餐要求

Judge.me **Awesome 套餐（$15/月）** 才有 *Platform Independent Review Widgets* 功能，Hydrogen 必须这一套。免费版只能在 Liquid 里用

### 方案对比（二选一）

| | A. 客户端组件（推荐起步） | B. SSR REST API（推荐长期） |
|---|---|---|
| 实现 | 装 `judgeme-hydrogen-fixed`，`useJudgeme` + `<JudgemeReviewWidget />` | 在 `app/routes/api/reviews.ts` 里后端直连 Judge.me API，自写 React 组件 |
| 体验 | 首帧有短暂闪烁（官方 Hydrogen package 刷新循环 bug 已修复） | 无闪烁、SSR 友好、可 SEO |
| 样式控制 | Judge.me 后台配置，className 能少量覆盖 | 完全自由，Tailwind 自绘 |
| 代码量 | ~30 行 | ~300 行（路由 + HTML 解析 + UI） |
| 参考 | [ben-goodman-uk/judgeme-hydrogen-fixed](https://github.com/ben-goodman-uk/judgeme-hydrogen-fixed) | [Weaverse/pilot · app/routes/api/reviews.ts](https://github.com/Weaverse/pilot/blob/main/app/routes/api/reviews.ts) + [app/utils/judgeme.ts](https://github.com/Weaverse/naturelle/blob/main/app/utils/judgeme.ts) |
| 工期 | ~1 小时 | ~半天 |

**注意**：官方 `@judgeme/shopify-hydrogen`（2022 发的 2.0.0）在 Oxygen 上有 `installed.js` 导致的**无限刷新循环**，**不要装**。必须用 `judgeme-hydrogen-fixed`（2026-01 修复版）

### 方案 A 落地步骤（客户端组件）

**凭证准备**
- `JUDGEME_SHOP_DOMAIN`（`flowtica.myshopify.com`）
- `JUDGEME_PUBLIC_TOKEN`（Judge.me Dashboard > Settings > Technical）
- `JUDGEME_CDN_HOST`（固定 `https://cdn.judge.me`）

**步骤清单**
- [ ] `pnpm add judgeme-hydrogen-fixed`（**不要**装 `@judgeme/shopify-hydrogen`）
- [ ] `.env` 添加三个变量（见上），同步补到 `env.d.ts`
- [ ] 在 [app/root.tsx](../app/root.tsx) 的 `loader` 返回 `judgeme: { shopDomain, publicToken, cdnHost }`
- [ ] 在 `App()` 调 `useJudgeme(data.judgeme)`
- [ ] 产品页（[products/$handle.tsx](../app/routes/products/$handle.tsx)）插入：
      ```tsx
      <JudgemePreviewBadge id={product.id} productHandle={product.handle} productTitle={product.title} />
      <JudgemeReviewWidget id={product.id} productHandle={product.handle} productTitle={product.title} productImageUrl={product.featuredImage?.url} productDescription={product.description} />
      ```
- [ ] Scribe 专用页 [ScribeProductPage.tsx](../app/components/scribe/ScribeProductPage.tsx) 同样插入
- [ ] 样式调整（字号、间距、暗色模式）通过 className 覆盖 `.jdgm-*` class；或 Judge.me 后台改
- [ ] i18n：Judge.me 后台 > Settings > Language 切到目标语言；多语 storefront 需要按 locale 切 widget 语言（进阶）

### 方案 B 落地步骤（SSR REST API，供未来替换时参考）

- [ ] 新增 `JUDGEME_PRIVATE_API_TOKEN`（Judge.me Dashboard > Settings > API）
- [ ] 新建 `app/routes/api.reviews.tsx`（loader + action），端点直连：
      - `https://api.judge.me/api/v1/widgets/preview_badge`（星级徽章）
      - `https://api.judge.me/api/v1/widgets/product_review`（评论列表 widget HTML）
      - `https://api.judge.me/api/v1/reviews`（分页评论 + 提交）
- [ ] 新建 `app/utils/judgeme.ts`：用正则从 widget HTML 解析 `averageRating` / `totalReviews` / `ratingDistribution`
- [ ] 产品页 loader 并行请求 `/api/reviews?type=rating`
- [ ] 自绘 `<RatingStars />` / `<ReviewList />` / `<ReviewForm />` 组件
- [ ] 参考代码直接照搬 Weaverse/pilot 的实现再改 UI

**文档索引**
- npm：https://www.npmjs.com/package/judgeme-hydrogen-fixed
- API 参考：https://judge.me/api/docs

---

## 四、执行顺序建议（真正动手时）

1. **先接 Judge.me 方案 A**（1 小时，风险低，效果立竿见影）
2. **确认 Smile.io 套餐**：
   - 若 Plus+ → 接入（先浮动启动器，再产品页积分，最后 loyalty 着陆页）
   - 若非 Plus+ → 暂时不接，文档里留 placeholder，等业务决定是否升级
3. **Judge.me 方案 B** 仅当方案 A 闪烁被产品验收打回时再做

---

## 五、需要收集的凭证清单

接入前让业务/运营提供：

- [ ] Judge.me Awesome 套餐已订阅确认
- [ ] `JUDGEME_PUBLIC_TOKEN`
- [ ] `JUDGEME_PRIVATE_API_TOKEN`（方案 B 才需要）
- [ ] Smile.io 当前套餐等级确认（关键！）
- [ ] `SMILE_PUBLISHABLE_KEY`（若套餐 OK）
- [ ] Smile.io 是否需要按登录客户展示个性化积分（决定是否要 customerToken 签发逻辑）
