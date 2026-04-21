# Oxygen 部署指南（Hydrogen 官方路径）

本文档说明如何把 Hydrogen 项目部署到 **Shopify Oxygen**（Hydrogen 官方托管平台，底层为 Cloudflare Workers，由 Shopify 代管）

---

## 1. 核心概念

开始之前先理清几个 Shopify 术语的层级关系，避免后面操作时混淆：

| 层级 | 英文 | 范围 | 例子 |
|------|------|------|------|
| **Shop / Store** | Shopify store | 一个独立的 Shopify 店铺（商品库、订单、客户全部隔离） | `<handle>.myshopify.com` |
| **Sales Channel** | Sales channel（如 Online Store / Hydrogen / Headless） | Store 下的一个销售入口 | — |
| **Storefront** | Hydrogen storefront | Hydrogen channel 下的一个前端实例（对应一个部署单元） | — |
| **Environment** | Environment（Production / Preview / Custom） | Storefront 下的一个环境 | — |
| **Deployment** | Deployment | Environment 下的一次不可变快照 | — |

关键关系：**一个 Shop 可有多个 Storefront；一个 Storefront 可有多个 Environment；每次 push / deploy 生成一个 Deployment**

### Hydrogen channel vs Headless channel

容易混淆，实际功能完全不同：

| Channel | 作用 | 部署方式 |
|---------|------|---------|
| **Headless** | 只发 Storefront API token | 自部署（Vercel / Cloudflare / VPS） |
| **Hydrogen** | Storefront API token + **Oxygen 托管** + GitHub CI/CD + Preview 环境 + 回滚 | Oxygen（Shopify 代管） |

两者可并存。本文档聚焦 **Hydrogen channel + Oxygen**

---

## 2. 套餐要求

Oxygen **在所有付费套餐上免费**，无额外费用，无流量/部署次数上限：

| 套餐 | 月费 | Oxygen |
|------|------|--------|
| Starter | $5 | ❌ 不支持 |
| Pause and build | — | ✅ |
| Basic | $39 | ✅ |
| Shopify | $105 | ✅ |
| Advanced | $399 | ✅ |
| Plus | $2,300+ | ✅ |

⚠️ **Development Stores 不支持 Oxygen**（Shopify Partner 免费开的测试店）。staging 需要付费 store，或用同 storefront 下的 Preview 环境（见 §11）

Worker 运行时限制在所有套餐一致：10MB bundle / 128MB 内存 / 30s CPU 时间

Hydrogen sales channel 本身免费安装，不区分套餐

---

## 3. 前提条件

- [ ] Shopify 店铺 ≥ Basic 套餐
- [ ] 本地 Node 20+ 和 pnpm
- [ ] 项目能本地跑 `pnpm dev`
- [ ] 已登录 Shopify admin（网页端）
- [ ] （CI/CD 需要）仓库已推到 GitHub

---

## 4. 如何找到 Shop 域名

很多 CLI 命令要传 `--shop <handle>.myshopify.com`，但这个域名在 Shopify admin 里并不显眼，四种找法：

### 4.1 从 admin URL 读

浏览器登录目标 store 的 Shopify admin，看地址栏：

```
https://admin.shopify.com/store/<handle>
                                 ^^^^^^^^
```

`<handle>` 就是 shop 名的前缀。完整 shop 域名是 **`<handle>.myshopify.com`**

> 注意新版 admin URL 是 `admin.shopify.com/store/<handle>`，不是 `<handle>.myshopify.com/admin`。但 `<handle>` 同值

### 4.2 从 Settings → Domains 看

admin → **Settings** → **Domains** → 会看到一条 `<handle>.myshopify.com` 标记为 *Shopify 默认域名*

### 4.3 从 Shopify admin 左下角店铺切换器看

多 store 账号的 admin 左下角有店铺切换器，点开能看到所有可访问的 store，hover 每个能看到其 `.myshopify.com` 域名

### 4.4 从 CLI 列出

```bash
pnpm exec shopify hydrogen deploy
# 第一步 "Select a shop to log in to" 会列出你所有可访问的 store
# （按 Ctrl+C 可取消，只是为了看列表）
```

---

## 5. 步骤 1：在 Shopify admin 安装 Hydrogen channel

**在目标 store 的 admin 里操作**（多 store 的话要先切到目标 store）

### 5.1 进入 Sales channels 列表

左侧栏 **Sales channels** 区域，右侧 `>` 展开

### 5.2 Add sales channel

点 Sales channels 标题旁的 `+` 或 **Add sales channel** → 进入 channel 商店

### 5.3 搜索并安装 Hydrogen

搜索框输入 `Hydrogen` → 找到 Shopify 官方那个（图标紫色化学瓶子）→ 点 **Add sales channel** → **Install**

> ⚠️ 不要误选 **Headless**，那是另一个 channel

安装完成后左侧栏 Sales channels 下多出 **Hydrogen** 条目

---

## 6. 步骤 2：创建 Storefront

### 6.1 进入 Hydrogen channel

左侧 Sales channels → **Hydrogen**

### 6.2 Create storefront

点 **Create storefront**：

| 字段 | 说明 |
|------|------|
| Storefront name | 自己起，建议加区分（如 `my-app-jp`、`my-app-staging`） |
| Setup CI/CD | 首次建议选 **Set up CI/CD later**，手动部署跑通再接 GitHub |

确认创建后跳转到 storefront overview，**记下 storefront 名字**（CLI `link` 需要）

### 6.3 可选：同 store 下建多个 storefront

一个 store 下的 Hydrogen channel 可以创建任意多个 storefront，典型用途：
- Production（生产）+ Staging（内部预览）
- 同 store 的多个品牌或产品线分别部署

重复 §6.2 即可

---

## 7. 步骤 3：本地项目关联

本节在项目目录 `frontend/shopify` 下执行

### 7.1 登录 Shopify CLI

首次使用要指定目标 shop：

```bash
pnpm exec shopify hydrogen login --shop <handle>.myshopify.com
# 例: pnpm exec shopify hydrogen login --shop my-store.myshopify.com
```

`<handle>` 的找法见 §4

如果你之前已经 login 过**其他 store**，切到新 store 要重跑 `login --shop` 覆盖。无需先 logout

浏览器会弹出授权确认 → 通过后 CLI 提示 `authentication complete`

### 7.2 列出当前 store 下的 storefront

```bash
pnpm exec shopify hydrogen list
```

输出示例：

```
Showing 1 Hydrogen storefront for the store <handle>.myshopify.com

<Storefront Name> (id: 1234567890)
    https://<storefront>-<hash>.o2.myshopify.dev
```

如果列表为空，回 §6 在 Hydrogen channel 里建 storefront

### 7.3 Link 到目标 storefront

```bash
pnpm link
# 等同于: pnpm exec shopify hydrogen link
```

CLI 列出可选 storefront，方向键选 → 回车

也可用 `--storefront` 直接指定：

```bash
pnpm exec shopify hydrogen link --storefront "<Storefront Name>"
```

成功后项目下生成 `.shopify/project.json`（已 gitignore），记录 storefront id

### 7.4 拉取环境变量

```bash
pnpm env:pull
```

从 Oxygen 同步 `SESSION_SECRET` / `PUBLIC_STOREFRONT_API_TOKEN` / `PUBLIC_STORE_DOMAIN` 等到本地 `.env`

> `env:push` 反向推本地到 Oxygen。双向都走 Shopify CLI，不要直接改 `.env` 不同步

### 7.5 切到另一个 store 的流程

```bash
# 1. 解开当前 storefront
pnpm exec shopify hydrogen unlink

# 2. 切 CLI 登录到新 store
pnpm exec shopify hydrogen login --shop <another-handle>.myshopify.com

# 3. 列出新 store 下的 storefront
pnpm exec shopify hydrogen list

# 4. 链到新 storefront
pnpm exec shopify hydrogen link

# 5. 拉取新环境变量（会覆盖本地 .env）
pnpm env:pull
```

⚠️ `pnpm env:pull` 会覆盖 `.env`。本地要多 store 切换时建议先 `.env` 另存一份，或配置多份 `.env.<shop>`（见 §13）

---

## 8. 步骤 4：首次手动部署

```bash
pnpm deploy
# 等同于: shopify hydrogen deploy
```

CLI 步骤：

1. `No deployment description provided` warning —— 未提交时出现，首次忽略即可。正式部署前最好先 commit，让 deployment metadata 记录完整 SHA
2. `Select an environment to deploy to` —— 首次选 **Preview**（出问题不影响 Production）
3. 跑 build（React Router typegen + Vite build）
4. 上传产物
5. 打印预览 URL，形如 `https://<storefront>-<hash>.o2.myshopify.dev`

### 8.1 预览 URL 需要登录

所有环境（包括 Production）默认 **私有（Private）**，只有 store 协作者登录后才能访问。绑自定义域名也不会自动变成公开 —— 必须手动把环境设为 Public（见 §9.5）

对外分享临时预览链接的方式（仍然是私有 URL，带 token）：

- Hydrogen channel → storefront → deployment 详情页 → **Share** → `Anyone with the link` → 复制

### 8.2 如果要 Deploy Token

某些情况下（CI、某些 Oxygen 实例）需要手动提供 token：

1. Hydrogen channel → storefront → 右上 `...` → **Deployment tokens** → Create token → 复制
2. 粘贴到 CLI，或设为环境变量 `SHOPIFY_HYDROGEN_DEPLOYMENT_TOKEN`

---

## 9. 步骤 5：绑定自定义域名

⚠️ **Hydrogen storefront 的域名不在 Settings → Domains 里**（那是给 Online Store Theme 用的），在 **Hydrogen channel 的 storefront 详情页**

### 9.1 在 Shopify 发起绑定

1. Sales channels → Hydrogen → 你的 storefront
2. 顶部 tab 或 Settings 里找 **Domains**
3. 点 **Connect domain**，输入目标域名（如 `shop.example.com`）
4. Shopify 返回一个 CNAME 目标（形如 `shops.myshopify.com` 或 `<storefront>-<hash>.o2.myshopify.dev`）—— **复制下来**

### 9.2 在 DNS 服务商加 CNAME

以主流 DNS 服务商为例：

| DNS 服务 | 操作 |
|---------|------|
| AWS Route 53 | Hosted zones → 选目标 zone → Create record → Name: 子域前缀 / Type: CNAME / Value: §9.1 复制的目标 / TTL: 300 |
| Cloudflare | DNS → Add record → Type: CNAME / Name: 子域前缀 / Target: §9.1 复制的目标 / Proxy: **关闭**（橙云灰）—— Shopify 要自己签 SSL，不能被 CF 代理 |
| GoDaddy | DNS → Add → CNAME / Name: 子域前缀 / Points to: §9.1 复制的目标 |

### 9.3 回 Shopify 验证

等 1–5 分钟 DNS 传播 → Shopify 域名页点 **Verify connection** → 通过后 Shopify 自动签 SSL 证书

验证不过参见 §16.4

### 9.4 设为 Primary domain（可选）

如果这是该 storefront 的主域，域名列表里设为 **Primary domain**

### 9.5 把 Production 环境设为公开（必须）

绑自定义域后 **还需要** 把 Production 环境改为公开，否则任何人访问都会看到 Oxygen 登录页：

1. Hydrogen channel → 你的 storefront → **Storefront settings**
2. **Environments and variables**
3. 点 **Production** 环境
4. 找到 **URL privacy** → 改为 **Public**
5. **Save**

> **套餐限制**：Basic / Shopify / Advanced 套餐最多 **1 个** Public 环境；Plus 最多 25 个。正式 Production 设为 Public 即足够

---

## 10. 步骤 6：GitHub CI/CD

手动部署跑通后接 CI/CD，push 代码自动部署

### 10.1 在 Hydrogen channel 连 GitHub

1. Sales channels → Hydrogen → 你的 storefront
2. Settings → **Environments** 或 **Source**
3. 点 **Connect to GitHub**
4. 授权 Shopify GitHub App 访问仓库
5. 选仓库和默认分支
6. 指定项目根目录路径（monorepo 要填子目录，如 `frontend/shopify`）

### 10.2 合并 Oxygen workflow PR

Shopify 会自动发 PR，在 `.github/workflows/` 加一个 `oxygen-deployment-*.yml`

Review → merge

### 10.3 首次自动部署

merge 后 Shopify 立刻跑一次部署。之后每次 push 到默认分支自动部署到 Production；非默认分支 push 自动生成独立 Preview URL（Shopify GitHub App 会在 PR 评论里贴出链接）

### 10.4 多个 storefront 的 CI/CD

一个仓库可以接多个 storefront（分别在对应 Hydrogen channel 里 Connect GitHub）。Shopify 会生成多份独立 workflow YAML（文件名按 storefront 区分）。push 时并行触发各自部署

---

## 11. 环境变量管理

### 11.1 在 Oxygen 管理

Hydrogen channel → storefront → **Environments** → 选环境 → Add variable

支持两种：
- **Plain**：明文，后台可见
- **Secret**：加密，仅注入运行时，后台不再可见

每个 storefront 最多 **110 个**自定义变量

### 11.2 本地同步

```bash
pnpm env:pull                             # Oxygen → 本地 .env
pnpm exec shopify hydrogen env push       # 本地 .env → Oxygen
pnpm exec shopify hydrogen env list       # 列出当前 storefront 的变量
```

### 11.3 Hydrogen 必需变量

```env
SESSION_SECRET              # 32+ 位随机字符串
PUBLIC_STOREFRONT_API_TOKEN # Storefront API 公钥
PUBLIC_STORE_DOMAIN         # <handle>.myshopify.com
PUBLIC_CHECKOUT_DOMAIN      # <handle>.myshopify.com 或独立 checkout 域名
```

新建 storefront 时 Shopify 自动生成 `SESSION_SECRET` 和 API token，其余需要人工填

### 11.4 环境变量与 Deployment 的关系

Oxygen deployment 是**不可变快照**。改了环境变量**不会自动生效旧 deployment**，需要：
- **Redeploy** 现有 deployment（保持代码不变，注入最新变量）
- 或 push 新代码触发新 deployment

改变量时 Shopify 后台会提示是否 redeploy

---

## 12. 多 Store / 多市场架构

一套代码对接多市场通常有两种做法，各有取舍：

### 12.1 架构 A：单 Store + Shopify Markets

- 一个 Shopify store 里通过 **Markets** 配置多个市场（不同货币、税务、翻译、结账设置）
- 一个 Hydrogen storefront 部署到该 store
- 运行时靠 `context.i18n`（language/country）决定走哪个 market

**优点**
- 一份代码、一个 deployment、一套商品库和订单
- 统一后台管理所有市场数据

**缺点**
- 日本消费税、欧洲增值税等复杂本地合规靠 Markets 配置实现，灵活度有限
- 独立本地支付通道（例如只在日本用的 Konbini）经常要独立 store 才能接

### 12.2 架构 B：多 Store（每市场独立）

- 每个市场建独立 Shopify store（独立商品库、订单、客户、账务）
- 每个 store 装 Hydrogen channel、创建 storefront
- 同一份代码分别 deploy 到各 storefront，每个 deployment 绑对应市场域名

**优点**
- 各市场本地财务、税务、合规、支付完全独立
- 各市场运营团队权限清晰，互不干扰

**缺点**
- 商品需在每个 store 分别维护（可用 [Matrixify](https://matrixify.app/) / MESA 等工具同步）
- 订单不合并，财务对账要 per-store
- 部署运维复杂度 ×市场数

### 12.3 架构 B 的部署模型

```
一个代码仓库
  ├─→ deploy A → store-a.myshopify.com 的 storefront A → 绑 www.example.com
  ├─→ deploy B → store-b.myshopify.com 的 storefront B → 绑 jp.example.com
  └─→ deploy C → store-c.myshopify.com 的 storefront C → 绑 sg.example.com
```

每个 storefront 独立环境变量（`PUBLIC_STORE_DOMAIN` / API token 各异），代码一致

本项目的 i18n 代码（见 [i18n.md](./i18n.md)）按 host 识别 locale，在架构 B 下每个部署只响应自己的域名，永远返回固定 locale，Storefront API 永远拿对应 store 的数据 —— **架构 B 下 i18n 代码不需要改动**

### 12.4 扩展新市场的步骤（架构 B）

加一个新市场（如新加坡）时：

1. 运营 / 财务侧：创建新 Shopify store（付费套餐）
2. 新 store admin → 安装 Hydrogen channel（§5） → 创建 storefront（§6）
3. 本地切到新 store 部署：

   ```bash
   pnpm exec shopify hydrogen unlink
   pnpm exec shopify hydrogen login --shop <new-handle>.myshopify.com
   pnpm exec shopify hydrogen link
   pnpm env:pull
   pnpm deploy
   ```

4. （可选）接 CI/CD：Hydrogen channel → storefront → Connect GitHub（§10）
5. 代码侧：如需跨域语言切换，给 `SUPPORTED_LOCALES` 追加一项（见 [i18n.md](./i18n.md)）
6. DNS：CNAME 加子域 → Shopify 绑定 → Verify（§9）

### 12.5 跨市场语言切换的注意点

架构 B 下不同域名背后是**不同 store**，同一商品 handle 不保证在所有 store 都存在

- 语言切换保持同 path：有 404 风险（目标 store 没对应商品）
- 运营约定各 store product handle 保持一致：治本方案
- 代码维护跨 store handle 映射：折中
- 语言切换只跳首页：最保守

---

## 13. 本地多 Store 切换（架构 B 场景）

`pnpm link` 一次只能绑一个 storefront，本地开发切不同 store 有几种做法：

### 13.1 做法 A：手动切换

按 §7.5 流程 `unlink` → `login --shop` → `link` → `env:pull`

简单但每次切要敲几条命令，`.env` 会被覆盖

### 13.2 做法 B：多份 .env 文件

维护 `.env.shop-a` / `.env.shop-b`，用符号链接或脚本切换：

```bash
ln -sf .env.shop-a .env  # 切到 shop A
ln -sf .env.shop-b .env  # 切到 shop B
```

或在 `package.json` 加脚本：

```json
{
  "scripts": {
    "dev:a": "cp .env.shop-a .env && shopify hydrogen dev --codegen",
    "dev:b": "cp .env.shop-b .env && shopify hydrogen dev --codegen"
  }
}
```

### 13.3 做法 C：生产依赖 CI/CD

生产 / 预发全走 GitHub CI/CD，每个 storefront 一份 workflow。开发者本地只 link 到常用的那个 store。push 即自动部署所有 store

Shopify 官方对多 store 场景的立场：[Hydrogen Discussion #2351](https://github.com/Shopify/hydrogen/discussions/2351) 维护者回复 *"For the moment, I think you'll just have to manually manage a local .env"* —— 官方暂无内置多 store 快速切换

---

## 14. Preview / 测试环境

### 14.1 Preview 环境（推荐）

Oxygen 每个 storefront 内置：
- **Production** —— 绑到默认分支
- **Preview** —— 绑到其他分支，每分支独立预览 URL

接 CI/CD 后 push 非默认分支自动生成 preview，URL 形如 `https://<branch>-<storefront>-<hash>.o2.myshopify.dev`

环境变量可 per-environment 设置，方便 preview 用测试 API key / production 用真实 key

### 14.2 独立 staging store

若 staging 要和 production 数据完全隔离：

- 单独建一个付费 store 作为 staging
- 装 Hydrogen channel、建 storefront（§5、§6）
- 绑 staging 子域（如 `staging.example.com`）

成本换取隔离，不常见

⚠️ **Development Stores 不能当 staging**（见 §2）

---

## 15. 回滚

生产问题时不用重部署：

1. Hydrogen channel → storefront overview
2. 目标环境（通常 Production）→ `...` → **View deployments**
3. 选一个正常历史版本 → **Make this the current deployment**

秒级生效，不删除任何 deployment。环境变量使用当时的快照值；若要更新变量触发新 deployment 用 **Redeploy**

---

## 16. 常见问题

### 16.1 `pnpm deploy` 卡在 "Select a shop"

方向键选。Oxygen 不支持 Development Stores 和 Starter 套餐（[官方说明](https://shopify.dev/docs/storefronts/headless/hydrogen/fundamentals)），列表里的 dev store 选了会报错。只能选付费 store

### 16.2 `hydrogen link` 只看到部分 storefront

`link` 只列出**当前 CLI 登录 shop** 下的 storefront。其他 shop 的看不到

解决：先 `hydrogen login --shop <other-handle>.myshopify.com` 切 shop，再 `link`。或 `hydrogen list` 先看看

### 16.3 `hydrogen link` 没有 `--shop` 参数

确实没有（[hydrogen link 文档](https://shopify.dev/docs/api/shopify-cli/hydrogen/hydrogen-link)）。只有 `--path` / `--storefront` / `--force`

切 shop 用 `hydrogen login --shop <handle>.myshopify.com`，然后再 `link`

### 16.4 自定义域名 Verify 一直不过

- 确认 DNS 真生效：`dig <your-subdomain>.example.com CNAME +short`
- TTL 过高（如 3600）会延迟传播，改 300 重试
- Cloudflare DNS 注意 Proxy 要**关闭**（橙云灰），开了 Shopify 拿不到源站 SSL
- Shopify 内部缓存 5–10 分钟，等一下再 Verify

### 16.5 部署后打开 URL（包括自定义域名）要登录

所有 Oxygen 环境默认 Private。无论是 `.o2.myshopify.dev` URL 还是绑定的自定义域名，只要 Environment 是 Private 就要登录

**解决**：按 §9.5 把 Production 环境改为 Public。只有 `env:pull` 拿到的预览 URL 可以用 §8.1 的 Share link 临时绕过

### 16.6 Build 失败但本地 `pnpm build` 正常

Oxygen 用 Shopify 环境变量构建；本地用 `.env`。Oxygen 上检查：
- 必需变量齐全（§11.3）
- build-time 才生效的变量没漏

### 16.7 报错 `This app requires Shopify Plus`

套餐没达标。Settings → Plan 应 ≥ Basic。Trial / Developer 套餐需要升级

### 16.8 `env pull` 报 `no storefront linked`

先 `pnpm link`。如果 `.shopify/project.json` 存在但 store 已变更，删了重新 link

### 16.9 改了环境变量但部署没生效

Oxygen deployment 是不可变快照，需要 **Redeploy**（同代码注入新变量）或 push 新代码

### 16.10 500 错 "Element type is invalid: got: object"

通常是组件导入错误，例如 `<Analytics>` 应为 `<Analytics.Provider>`（`Analytics` 是命名空间对象）。先排查 root.tsx / 最近改动的组件导入

### 16.11 500 错 JP / 新 store 部署后空白页

新 store 数据空，代码里查 `main-menu` / 产品 handle / policies 等硬编码资源会返回 null，下游渲染挂掉。要么在代码里加 null 兜底，要么在 store 里把基础数据配齐（menu、至少一个 product、policies）

---

## 17. 同时保留自部署路径

本项目支持多部署路径并存，Oxygen 和 Cloudflare Workers / Express 自部署互不干扰：

- `pnpm deploy` → Oxygen（本文档）
- `pnpm deploy:cf` → Cloudflare Workers（[`wrangler.toml`](../wrangler.toml)）
- `pnpm start:express` → Express 自部署（[`server.express.mjs`](../server.express.mjs)）

多路径并存的价值：
- Oxygen 异常时有 fallback
- 特殊合规要求（前端不能在 Shopify 体系内）时走自部署

详见 [deploy-cloudflare.md](./deploy-cloudflare.md)

---

## 18. 相关文档

- [dev-workflow.md](./dev-workflow.md) — 开发命令和工作流
- [deploy-cloudflare.md](./deploy-cloudflare.md) — Cloudflare / 自部署路径（备用）
- [i18n.md](./i18n.md) — 按域名切 locale 的实现
- [context-session.md](./context-session.md) — Hydrogen context 与 `i18n` 注入
- [Shopify 官方 Hydrogen & Oxygen docs](https://shopify.dev/docs/storefronts/headless/hydrogen)
- [hydrogen CLI reference](https://shopify.dev/docs/api/shopify-cli/hydrogen)
