# Shopify Hydrogen 登录接入指南

## 目标

这篇文档回答 4 个问题：

1. Shopify 的“登录”到底是谁在做
2. Hydrogen 项目里最少需要哪些代码和配置
3. 本地开发为什么不能直接用 `localhost`
4. 如何一步步验证登录已经打通

适用场景：

- 新建一个 Shopify Hydrogen 项目，准备接入客户登录
- 接手老项目，但不理解 `context.customerAccount` 的作用
- 已经有登录页，想确认是“代码问题”还是“后台配置问题”

---

## 先记住结论

- **商品、购物车、结账** 主要走 **Storefront API**
- **客户登录、订单、地址、资料** 主要走 **Customer Account API**
- Hydrogen 里常见的登录实现不是自己校验邮箱密码，而是：
  1. 前端跳到 Shopify 的客户账户登录页
  2. 用户完成邮箱验证码 / Shop 登录
  3. Shopify 回调到你的站点
  4. Hydrogen 用 `context.customerAccount.authorize()` 完成授权态建立

一句话：

> 你的站点负责发起登录和接收回调，真正的身份认证由 Shopify Customer Accounts 完成

---

## 概念地图

### 1. Online Store

Shopify 默认主题站点，通常是：

- `https://www.example.com`
- 或 `https://example.myshopify.com`

它负责传统 Liquid 主题页面

### 2. Hydrogen Storefront

你自己的 Headless 前端，常见技术栈是：

- React
- React Router
- Hydrogen

它通过 API 访问 Shopify，不依赖 Liquid 模板渲染

### 3. Customer Accounts

Shopify 提供的客户账户系统，负责：

- 登录
- 注册
- 邮箱验证码
- Shop 登录
- 订单查看
- 地址管理
- 资料维护

常见账户域名类似：

- `https://account.flowtica.ai`

### 4. Customer Account API

Hydrogen 通过它访问登录后的客户数据，例如：

- `customer`
- `orders`
- `addresses`
- `profile`

### 5. OAuth 回调

登录完成后，Shopify 需要跳回你的前端站点。  
这个跳回地址必须提前加入白名单，否则会报错

在 Hydrogen 里，这个回调通常是：

- `/account/authorize`

---

## 整体流程图

```text
用户打开 /account/signin
  -> 前端调用 /account/login
    -> context.customerAccount.login()
      -> 跳到 Shopify Customer Accounts
        -> 用户输入邮箱 / 验证码 / Shop 登录
          -> Shopify 重定向回你的 /account/authorize
            -> context.customerAccount.authorize()
              -> 建立登录态
                -> 跳回 /account 或 /account/orders
```

---

## 当前项目里的对应文件

当前 `frontend/shopify` 已经接入了这套流程

先区分一个容易混淆的点：

- **不是 Shopify 平台强制规定这些 URL 必须长这样**
- **而是 Hydrogen 官方示例和社区实践里，`/account/login`、`/account/authorize` 很常见**
- `signin`、`orders`、`profile`、`addresses` 这些更多是当前项目自己的账户中心路由设计

也就是说，下面这些文件路径是 **当前项目的实现映射**，不是 Shopify 唯一官方标准路径：

- 登录 UI：`app/routes/account/signin.tsx`
- 发起登录：`app/routes/account/login.tsx`（Hydrogen 常见惯例）
- 处理回调：`app/routes/account/authorize.tsx`（Hydrogen 常见惯例）
- 登录后账户布局：`app/routes/account/layout.tsx`
- 订单列表：`app/routes/account/orders/_index.tsx`
- 资料页：`app/routes/account/profile.tsx`
- 地址页：`app/routes/account/addresses.tsx`

如果你改成别的路径，例如：

- `/auth/login`
- `/auth/callback`

在技术上也完全可以，但你必须同步修改：

- 前端入口跳转地址
- Shopify / Hydrogen customer application 的 redirect URI
- 登出地址和 javascript origin 配置（如果你也改了域名或路径）

最关键的 2 个路由实际上非常简单：

```ts
// app/routes/account/login.tsx
export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url)

  return context.customerAccount.login({
    countryCode: context.storefront.i18n.country,
    loginHint: url.searchParams.get('login_hint') || undefined,
  })
}
```

```ts
// app/routes/account/authorize.tsx
export async function loader({ context }: Route.LoaderArgs) {
  return context.customerAccount.authorize()
}
```

这也是 Hydrogen 官方推荐的核心写法

来源：

- [Hydrogen customer login route](https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/hydrogen)
- [Hydrogen customer authorize route](https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/hydrogen)

---

## 后台需要准备什么

## 一张表看懂

| 项目 | 是否必须 | 作用 | 在哪里配 |
|------|----------|------|----------|
| `Headless storefront` | 必须 | 让 Hydrogen 项目和 Shopify 店铺绑定 | Shopify 后台 / Hydrogen CLI |
| `Storefront API Token` | 必须 | 商品、购物车、CMS 等 API 访问 | Headless channel |
| `Customer accounts` | 必须 | 提供登录、注册、订单、地址能力 | `Settings -> Customer accounts` |
| `Customer account API client id/url` | 登录时必须 | Hydrogen 调用 Customer Account OAuth / API | `.env` |
| `redirect URI` 白名单 | 必须 | 允许 Shopify 登录后跳回你的站点 | Hydrogen CLI push 或后台对应配置 |
| `logout URI` 白名单 | 建议 | 允许登出后安全跳回你的站点 | 同上 |
| `javascript origin` | 前端浏览器 OAuth 时常需要 | 允许来自该域名的 JS 访问授权端点 | 同上 |

---

## Shopify 后台点击路径

### 1. 进入后台

打开：

- [https://admin.shopify.com](https://admin.shopify.com)

### 2. 确认 Customer Accounts 已启用

点击：

- `Settings`
- `Customer accounts`

你应该看到类似信息：

- `Authentication`
- `URL`
- `Shop` 登录方式

如果页面里已经显示客户账户专用域名，例如：

- `https://account.flowtica.ai`

说明新版 Customer Accounts 已经启用

### 3. 确认 Customer Accounts 域名

仍然在：

- `Settings -> Customer accounts`

查看：

- `URL`

这里显示的是客户账户站点域名，不等于你的 Hydrogen 站点域名

例如当前项目里：

- 客户账户域名：`https://account.flowtica.ai`
- Hydrogen 临时调试域名：`https://xxx.tryhydrogen.dev`
- 未来生产前端域名：可能是 `https://www.flowtica.ai`

### 4. 确认 Checkout 没强制登录

如果你希望“游客也能购买”，去 checkout 配置里确认不要打开：

- `Require customers to sign in to their account before checkout`

这不是登录接入本身的必要条件，但会影响业务流程

---

## 环境变量怎么配

当前项目使用 Hydrogen 约定的环境变量名，核心项如下：

```env
SESSION_SECRET="至少 32 位随机字符串"
PUBLIC_STOREFRONT_API_TOKEN="Storefront public token"
PRIVATE_STOREFRONT_API_TOKEN="Storefront private token"
PUBLIC_STORE_DOMAIN="flowtica.myshopify.com"
PUBLIC_CHECKOUT_DOMAIN="flowtica.myshopify.com"

PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID="客户账户 client id"
PUBLIC_CUSTOMER_ACCOUNT_API_URL="客户账户 API URL"
SHOP_ID="店铺数字 ID"
```

### 每个变量改变了什么状态

| 变量 | 作用 | 不配置会怎样 |
|------|------|--------------|
| `SESSION_SECRET` | 加密站点 session | 登录态无法安全持久化 |
| `PUBLIC_STOREFRONT_API_TOKEN` | 客户端访问 Storefront API | 商品、购物车等功能异常 |
| `PRIVATE_STOREFRONT_API_TOKEN` | 服务端访问 Storefront API | 服务端查询能力受限 |
| `PUBLIC_STORE_DOMAIN` | 指向目标 Shopify 店铺 | 会连错店铺或无法连店 |
| `PUBLIC_CHECKOUT_DOMAIN` | 结账域名 | 结账跳转域名可能不对 |
| `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID` | Customer Account OAuth 客户端标识 | 登录无法发起 |
| `PUBLIC_CUSTOMER_ACCOUNT_API_URL` | Customer Account API 端点 | 登录/客户数据无法访问 |
| `SHOP_ID` | Analytics / 店铺标识 | 统计相关能力不完整 |

### 如何获取

最省事的方法：

```bash
pnpm env:pull
```

预期结果：

- 本地 `.env` 被写入 / 更新
- 至少出现 Storefront API 相关变量
- 如果店铺已经开通 Customer Accounts，也会出现 customer account 相关变量

如果缺少 `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID` 或 `PUBLIC_CUSTOMER_ACCOUNT_API_URL`，说明店铺侧 Customer Accounts 还没准备好，或者当前 storefront 还没关联到正确配置

---

## 为什么本地不能直接用 localhost 登录

这是最容易踩坑的点

你在本地直接访问：

```text
http://localhost:3000/account/signin
```

页面本身通常能打开，因为这是你自己的前端页面。  
但点击 `Continue` 发起 Customer Account OAuth 时，Hydrogen 会提示：

```text
Customer Account API OAuth requires a Hydrogen tunnel in local development.
Run the development server with the `--customer-account-push` flag,
then open the tunnel URL shown in your terminal (`https://*.tryhydrogen.dev`) instead of localhost.
```

### 原因

Customer Account OAuth 需要一个 **公网可访问的 HTTPS 回调地址**，而：

- `localhost` 不是公网地址
- Shopify 无法安全地把用户从它的登录域名回调到你的本地机器

所以本地开发必须先开一条 Hydrogen tunnel，把本地 `3000` 暴露成：

- `https://xxx.tryhydrogen.dev`

### 这个命令做了什么

```bash
pnpm exec shopify hydrogen dev --codegen --customer-account-push
```

它同时完成 3 件事：

1. 启动本地 Hydrogen dev server
2. 建立 `tryhydrogen.dev` HTTPS tunnel
3. 把当前 storefront 对应的 customer account redirect/logout/origin 配置 push 到 Shopify

官方命令参考：

- [shopify hydrogen customer-account-push](https://shopify.dev/docs/api/shopify-cli/hydrogen/hydrogen-customer-account-push)

### 成功时你会看到什么

终端里会出现类似：

```text
View flowtica-react app: https://outdoor-andrew-boat-proxy.tryhydrogen.dev
```

之后你应该访问：

```text
https://outdoor-andrew-boat-proxy.tryhydrogen.dev/account/signin
```

而不是：

```text
http://localhost:3000/account/signin
```

---

## 本地接入步骤

## 第 1 步：确认环境变量

在项目目录：

```bash
cd /Users/es/Documents/code/frontend/flowtica-internal-flow/frontend/shopify
```

检查 `.env` 至少包含：

```env
PUBLIC_STORE_DOMAIN=
PUBLIC_STOREFRONT_API_TOKEN=
PRIVATE_STOREFRONT_API_TOKEN=
PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID=
PUBLIC_CUSTOMER_ACCOUNT_API_URL=
SESSION_SECRET=
```

预期结果：

- 这些 key 存在
- 值不是空字符串

如果没有，先执行：

```bash
pnpm env:pull
```

## 第 2 步：启动带 tunnel 的开发服务

```bash
pnpm exec shopify hydrogen dev --codegen --customer-account-push
```

预期结果：

- 终端提示你选择店铺
- 终端提示你选择 Hydrogen storefront
- 显示 `Starting tunnel...`
- 最终出现 `https://*.tryhydrogen.dev`

如果报：

```text
Unexpected argument: --customer-account-push
```

说明你把参数传给了 `pnpm dev` 脚本而不是 Shopify CLI。  
直接执行上面的完整命令，不要用：

```bash
pnpm dev -- --customer-account-push
```

## 第 3 步：访问登录页

打开：

```text
https://你的-tryhydrogen-域名/account/signin
```

预期结果：

- 能看到你项目自己的登录页面
- 输入邮箱后点击 `Continue`
- 页面跳去 Shopify 的客户账户登录页

## 第 4 步：完成验证码登录

输入邮箱验证码或使用 Shop 登录

预期结果：

- Shopify 完成认证后回调到：
  `https://你的-tryhydrogen-域名/account/authorize`
- 随后再跳转到：
  `/account` 或 `/account/orders`

## 第 5 步：验证登录后数据

至少验证下面 3 项：

1. 能进入 `/account/orders`
2. 刷新页面后仍然保持登录
3. 能打开 `/account/profile` 或 `/account/addresses`

如果这些都正常，说明：

- OAuth 流程通了
- session 生效了
- Customer Account API 查询通了

---

## 生产环境怎么做

本地调试靠 `tryhydrogen.dev`，生产环境则要把正式站点域名加入 Customer Account 应用配置

最常见的正式回调地址是：

```text
https://www.example.com/account/authorize
```

如果你有登出后跳转，也建议配置：

```text
https://www.example.com/account/logout
```

以及 JS origin：

```text
https://www.example.com
```

### 有哪些白名单

根据 Shopify 文档，Customer Account OAuth 相关配置通常包括：

- `redirectUri`
- `logoutUris`
- `javascriptOrigin`

这 3 项分别控制：

| 项 | 作用 |
|----|------|
| `redirectUri` | 登录完成后允许回跳到哪些 URL |
| `logoutUris` | 登出后允许跳去哪些 URL |
| `javascriptOrigin` | 哪些前端来源允许参与浏览器端认证流程 |

来源：

- [hydrogenStorefrontCustomerApplicationUrlsReplace](https://shopify.dev/docs/api/admin-graphql/unstable/mutations/hydrogenstorefrontcustomerapplicationurlsreplace)

### 推荐做法

开发环境：

- 只用 `shopify hydrogen dev --customer-account-push`
- 不手工维护临时 `tryhydrogen.dev` 域名

生产环境：

- 使用固定正式域名
- 明确配置固定的 redirect/logout/origin
- 部署后做一次真实登录验收

---

## 代码最小实现

如果你从零写一个 Hydrogen 登录流程，最少需要这些路由

### 1. 登录入口页

作用：

- 展示邮箱输入框
- 让用户点击后跳转到真正的 OAuth 发起路由

示例：

```tsx
import { useNavigate } from 'react-router'
import { useState } from 'react'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const navigate = useNavigate()

  return (
    <form
      onSubmit={ (event) => {
        event.preventDefault()
        navigate(`/account/login?login_hint=${encodeURIComponent(email)}`)
      } }
    >
      <input
        type="email"
        value={ email }
        onChange={ e => setEmail(e.target.value) }
      />
      <button type="submit">Continue</button>
    </form>
  )
}
```

### 2. 发起登录

作用：

- 告诉 Shopify 开始 Customer Account OAuth

```ts
export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url)

  return context.customerAccount.login({
    countryCode: context.storefront.i18n.country,
    loginHint: url.searchParams.get('login_hint') || undefined,
  })
}
```

### 3. 处理回调

作用：

- 用 Shopify 回带的授权结果建立站点登录态

```ts
export async function loader({ context }: Route.LoaderArgs) {
  return context.customerAccount.authorize()
}
```

### 4. 保护账户页

作用：

- 没登录时重定向到登录页
- 已登录时允许查询订单、地址等数据

常见用法：

```ts
await context.customerAccount.handleAuthStatus()
```

或：

```ts
const isLoggedIn = await context.customerAccount.isLoggedIn()
```

---

## 验收清单

每次接入新项目时，按这个顺序检查

### A. 页面存在

- `/account/signin` 不是 404
- Header 或入口按钮能跳到登录页

### B. 环境变量完整

- `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID` 存在
- `PUBLIC_CUSTOMER_ACCOUNT_API_URL` 存在
- `SESSION_SECRET` 存在

### C. Shopify 后台已准备

- `Settings -> Customer accounts` 已启用
- Customer Accounts 域名已连通
- storefront 已正确 link 到当前店铺

### D. 本地开发方式正确

- 使用 `--customer-account-push`
- 使用 `https://*.tryhydrogen.dev`
- 不用 `localhost` 做登录回调测试

### E. 真实登录成功

- 输入邮箱后能跳到 Shopify 登录页
- 验证码成功
- 最终能回到 `/account/orders`

### F. 登录后能力可用

- 订单页可打开
- 地址页可打开
- 资料页可打开
- 登出后回到未登录状态

---

## 常见报错与处理

### 1. `/account/signin` 线上 404

说明：

- 当前线上域名并没有部署这套 Hydrogen 应用
- 或路由没有被当前线上服务接管

诊断方法：

先访问首页，再手动改 URL：

```text
https://你的域名/account/signin
```

如果仍是 404，优先检查部署，不要先怀疑 Shopify 后台

### 2. 本地点击 Continue 后提示必须使用 tunnel

报错示例：

```text
Customer Account API OAuth requires a Hydrogen tunnel in local development.
```

处理方法：

```bash
pnpm exec shopify hydrogen dev --codegen --customer-account-push
```

然后打开终端里显示的 `tryhydrogen.dev` 地址

### 3. 选择 storefront 后仍无法回调

可能原因：

- 当前 storefront 没 push 成功
- 你访问的不是 `tryhydrogen.dev`
- 本地 dev server 已切换了 tunnel，但你还在用旧地址

处理方法：

1. 重启 dev server
2. 复制终端最新的 `tryhydrogen.dev`
3. 用新地址重新测 `/account/signin`

### 4. 能登录，但 `/account` 页面几乎没样式

这通常不是登录失败，而是：

- 账户页只做了功能骨架
- 还没有按品牌站点补 UI

诊断方法：

- 看页面是否能展示订单数据
- 看刷新后是否仍保持登录

如果数据正常但 UI 很朴素，优先补账户中心样式，而不是去查 OAuth

---

## 成本与副作用

### 1. 引入 Customer Accounts 的收益

- 不用自己实现邮箱验证码和客户身份系统
- 订单 / 地址 / 资料能力直接复用 Shopify
- 结账与客户账户天然联动

### 2. 代价

- 本地开发不能只靠 `localhost`
- 需要理解 OAuth 回调和 storefront 绑定
- 登录 UI 和账户中心 UI 通常仍要你自己做

### 3. 边界

这套方案适合：

- 电商站点客户登录
- 查看订单、地址、资料
- 与 Shopify 结账体系整合

这套方案不直接解决：

- 你自己的业务后台管理员登录
- 独立会员体系
- 非 Shopify 用户数据库

如果你的业务要求“登录后访问的不是 Shopify customer，而是你自己的 SaaS 用户体系”，那就需要另一套身份系统

---

## 给未来项目的最小抄作业顺序

1. 在 Shopify 后台启用 `Customer accounts`
2. 用 Headless channel 准备 storefront 和 token
3. 拉取 `.env`
4. 写 `signin`、`login`、`authorize` 三个路由
5. 用 `context.customerAccount.isLoggedIn()` / `handleAuthStatus()` 保护账户页
6. 本地用 `pnpm exec shopify hydrogen dev --codegen --customer-account-push`
7. 只用 `tryhydrogen.dev` 测登录
8. 部署后用正式域名做一次完整登录回归

---

## 参考来源

- [Build with the Customer Account API in Hydrogen](https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/hydrogen)
- [Shopify CLI: hydrogen customer-account-push](https://shopify.dev/docs/api/shopify-cli/hydrogen/hydrogen-customer-account-push)
- [Hydrogen customer application URLs mutation](https://shopify.dev/docs/api/admin-graphql/unstable/mutations/hydrogenstorefrontcustomerapplicationurlsreplace)
- [Shopify Hydrogen](https://hydrogen.shopify.dev/)
