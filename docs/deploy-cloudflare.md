# 部署与域名切换指南（Cloudflare / 自部署，备用路径）

> ⚠️ **首选部署路径是 Shopify Oxygen**，见 [deploy-oxygen.md](./deploy-oxygen.md)
>
> 本文档保留作为**备用路径**，覆盖 Cloudflare Pages/Workers 或 Express 自部署的场景。适用于：
> - 需要把前端托管在 Shopify 体系外（合规、可控性要求）
> - 多 CDN 或边缘策略定制
> - Hydrogen channel 不可用的店铺套餐
>
> 常见误解：Oxygen 并非 Plus 专属。Basic 套餐 ($39/月) 即可用，Hydrogen channel 本身免费

本文档说明在使用 Cloudflare（或任何非 Shopify 官方托管）部署 Hydrogen Headless 站点时，如何进行完整的测试，以及如何下架旧版的 Shopify Theme 并将正式域名切换到新版 Headless 站点

---

## 1. 测试环境配置（无需绑定正式域名）

在 Headless 架构下，你可以完全使用 Cloudflare 提供的测试域名（如 `your-project.pages.dev` 或配置的子域名 `beta.example.com`）来测试完整的购物和付款流程。**购物车结算时会自动跳转到 Shopify 的原生安全结账页，支付流程不受前端测试域名影响**

但为了确保前端 API 调用和用户登录正常，必须在 Shopify 后台将测试域名加入白名单

### 1.1 配置 Storefront API CORS（跨域白名单）

如果不配置，前端在调用 Storefront API 时浏览器会报 CORS 跨域拦截错误

1. 进入 **Shopify Admin** 后台
2. 左下角点击 **Settings** → **Apps and sales channels**
3. 找到你为 Hydrogen 创建的 Custom App
4. 点击进入应用设置，找到 **Storefront API** 的配置模块
5. 找到 **Allowed Origins**
6. 点击 Add origin，添加你的测试域名，例如：
   - `https://your-project.pages.dev`
   - `https://beta.example.com`
   - *(可选)* `http://localhost:3000`（本地开发）

### 1.2 配置 Customer Account API 登录回调（如有登录功能）

如果你使用了新版 Customer Account API（OAuth 2.0），Shopify 会严格校验回调地址

1. 仍在刚才的 **Custom App** 页面
2. 找到 **Customer Account API** 配置区域（或左侧 `Customer accounts` 菜单栏）
3. 找到 **Callback URIs / Redirect URIs**
4. 添加完整回调 URL。Hydrogen 默认是 `/account/authorize`，例如：
   - `https://your-project.pages.dev/account/authorize`
   - `https://beta.example.com/account/authorize`
   - `http://localhost:3000/account/authorize`
5. 同时配置 **Logout URIs**，通常为首页：
   - `https://your-project.pages.dev/`

---

## 2. 旧版 Shopify Theme 下架与正式上线 Headless

传统 Shopify Theme 的工作原理是：主域名（如 `www.example.com`）解析到 Shopify 服务器，Shopify 渲染 Theme

切到 Headless + Cloudflare 后，**下架旧版 Theme 的本质是：把域名解析控制权从 Shopify 移交给 Cloudflare，Shopify 仅作为"结账(Checkout)"后台**

### 2.1 上线原理

- **旧版状态**：`www.example.com` 指向 Shopify（渲染 Theme）
- **新版状态**：`www.example.com` 指向 Cloudflare（渲染 Hydrogen 前端）；结账时跳往 `checkout.example.com`（指向 Shopify Checkout）

### 2.2 上线切换步骤

**第一步：在 Shopify 解绑主域名（降级旧 Theme）**

Shopify 不允许一个域名同时挂在两套完全不同的系统上，需要先释放正式主域名

1. 进入 **Shopify Admin** → **Settings** → **Domains**
2. 如果主域名当前是 **Primary domain**，点击 **Change primary domain**，改回 Shopify 默认二级域名（如 `<handle>.myshopify.com`）
3. 主域名改掉后，旧 Theme 不再占据主域。此时普通用户访问主域可能会报错，所以接下来要迅速在 Cloudflare 配置好

> 如果只是想临时隐藏旧 Theme 避免用户访问，最快是给旧 Theme 开启密码保护：`Online Store` → `Preferences` → `Password protection`

**第二步：配置结账专用子域名（Checkout Domain）**

对于 Headless，强烈建议用子域名专门做结账页，维持品牌一致性，例如 `checkout.example.com`

1. 在 Shopify Admin → **Domains** 点击 **Connect existing domain**
2. 输入 `checkout.example.com`，按 Shopify 提示配置 CNAME 解析（通常指向 `shops.myshopify.com`）
3. 把该子域作为 Hydrogen 项目的 `PUBLIC_CHECKOUT_DOMAIN`

**第三步：在 Cloudflare Pages 绑定主域名**

1. 登录 **Cloudflare 控制台**
2. 进入部署好的 Pages 项目（或 Workers）
3. 进入 **Custom Domains** 设置
4. 添加主域名和 www 子域（如 `www.example.com` 和 `example.com`）
5. Cloudflare 会自动在 DNS 里加相关 CNAME/A 记录

> ⚠️ 如果域名 DNS 不在 Cloudflare 托管（如托管在 AWS Route 53），Cloudflare Pages 可能只允许子域而不支持 apex domain。这种场景下要么把 NS 迁到 Cloudflare，要么改用 Cloudflare Workers + 自行 CNAME 的方案

**第四步：更新 Headless 项目环境变量**

Cloudflare Pages 的正式生产环境变量（`Production`）要配：

```env
# Shopify 店铺原生域名，用于 API 数据请求
PUBLIC_STORE_DOMAIN="<handle>.myshopify.com"

# 用户点击 "Checkout" 时的跳转目标，极其关键
PUBLIC_CHECKOUT_DOMAIN="checkout.example.com"
```

**第五步：更新白名单（同 §1）**

正式域名加到 Shopify 的 API 白名单：
- **CORS Allowed Origins**：添加 `https://www.example.com` 和 `https://example.com`
- **Customer Account Callback**：添加 `https://www.example.com/account/authorize`

### 2.3 总结

不需要真的去"删除"或"下架"那套 Shopify 模板代码（留在那儿没关系），只需要**把主域名的 DNS 解析从 Shopify 抽走，绑给 Cloudflare**。一旦域名切换完成，流量就会全部涌入新版 Headless 前端，旧版 Theme 自然被架空
