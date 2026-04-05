# 部署与域名切换指南 (Deployment & Domain Switch Guide)

本文档说明在使用 Cloudflare (或任何非 Shopify 官方托管) 部署 Hydrogen Headless 站点时，如何进行完整的测试，以及如何下架旧版的 Shopify Theme 并将正式域名切换到新版 Headless 站点

---

## 1. 测试环境配置（无需绑定正式域名）

在 Headless 架构下，你可以完全使用 Cloudflare 提供的测试域名（如 `your-project.pages.dev` 或配置的子域名 `beta.flowtica.ai`）来测试完整的购物和付款流程。**购物车结算时会自动跳转到 Shopify 的原生安全结账页，支付流程不受前端测试域名影响。**

但为了确保前端 API 调用和用户登录正常，必须在 Shopify 后台将测试域名加入白名单

### 1.1 配置 Storefront API CORS（跨域白名单）

如果不配置，前端在调用 Storefront API 时浏览器会报 CORS 跨域拦截错误

1. 进入 **Shopify Admin** 后台
2. 左下角点击 **Settings (设置)** -> **Apps and sales channels (应用和销售渠道)**
3. 找到你为 Hydrogen 创建的 Custom App（例如名为 `Hydrogen Storefront` 的应用）
4. 点击进入应用设置，找到 **Storefront API** 的配置模块
5. 找到 **Allowed Origins (允许的来源)**
6. 点击 Add origin，添加你 Cloudflare 的测试域名，例如：
   - `https://your-project.pages.dev`
   - `https://beta.flowtica.ai`
   - *(可选)* `http://localhost:3000` (用于本地开发)

### 1.2 配置 Customer Account API 登录回调 (如有登录功能)

如果你使用了新版 Customer Account API（OAuth 2.0 登录），Shopify 会严格校验回调地址

1. 仍在刚才的 **Custom App** 页面
2. 找到 **Customer Account API** 配置区域（或者在左侧 `Customer accounts` 菜单栏）
3. 找到 **Callback URIs / Redirect URIs (回调地址)**
4. 添加你测试环境的完整回调 URL。通常在 Hydrogen 项目中，这个地址是 `/account/authorize`（具体根据你路由结构决定），例如：
   - `https://your-project.pages.dev/account/authorize`
   - `https://beta.flowtica.ai/account/authorize`
   - `http://localhost:3000/account/authorize`
5. 同样需要配置 **Logout URIs (登出回调)**，通常配置为你的首页：
   - `https://your-project.pages.dev/`

---

## 2. 旧版 Shopify Theme 下架与正式上线 Headless

以前的站点是传统的 Shopify Theme，它的工作原理是：你的主域名 (`www.flowtica.ai`) 解析到 Shopify 服务器，Shopify 收到请求后渲染你的 Theme
现在你开发了独立的 Headless 站点部署在 Cloudflare，所以**下架旧版 Theme 的本质是：把域名的解析控制权从 Shopify 移交给 Cloudflare，并把 Shopify 仅作为"结账(Checkout)"后台。**

### 2.1 上线原理

*   **旧版状态**：`www.flowtica.ai` 指向 Shopify (渲染 Theme)
*   **新版状态**：`www.flowtica.ai` 指向 Cloudflare (渲染 Hydrogen 前端)；结账时跳往 `checkout.flowtica.ai`（指向 Shopify Checkout 引擎）

### 2.2 上线切换步骤

**第一步：在 Shopify 解绑主域名（降级旧 Theme）**

由于 Shopify 不允许一个域名同时挂在两套完全不同的系统上，你需要释放正式主域名
1. 进入 **Shopify Admin** -> **Settings (设置)** -> **Domains (域名)**
2. 如果 `www.flowtica.ai` 当前是 "Primary domain (主域名)"，你需要先点击 **Change primary domain**，把它改回 Shopify 默认给你的二级域名（如 `flowtica.myshopify.com`）
3. 主域名修改后，旧的 Shopify Theme 就不再占据 `www.flowtica.ai` 了。此时普通用户访问 `www.flowtica.ai` 可能会报错，所以接下来要迅速在 Cloudflare 配置好

*(建议操作：如果只是想临时隐藏 Theme 避免用户访问，其实最快的方式是给旧 Theme 开启密码保护：`Online Store` -> `Preferences` -> `Password protection`)*

**第二步：配置结账专用子域名（Checkout Domain）**

对于 Headless，强烈建议用一个子域名专门做结账页，维持品牌一致性，例如 `checkout.flowtica.ai`
1. 在 Shopify Admin -> **Domains** 点击 **Connect existing domain**
2. 输入 `checkout.flowtica.ai`，按照 Shopify 提示配置 CNAME 解析（通常是指向 `shops.myshopify.com`）
3. 在 Shopify 里把 `checkout.flowtica.ai` 设为特定于结账的域名（或者在没有独立选项时，保留其为连接状态，作为氢项目的 `PUBLIC_CHECKOUT_DOMAIN`）

**第三步：在 Cloudflare Pages 绑定主域名**

1. 登录 **Cloudflare 控制台**
2. 进入你部署好的 Pages 项目（或 Workers）
3. 进入 **Custom Domains (自定义域)** 设置
4. 添加 `www.flowtica.ai` 和 `flowtica.ai`
5. Cloudflare 会自动在你的 DNS 设置里添加相关的 CNAME/A 记录

**第四步：更新你的 Headless 项目环境变量**

确保你 Cloudflare Pages 的正式生产环境变量 (`Production`) 配置正确：

```env
# 你的 Shopify 店铺原生域名，用于 API 数据请求
PUBLIC_STORE_DOMAIN="flowtica.myshopify.com" 

# 这是极其关键的，当用户在你的网站点击"Checkout"时，程序要知道跳转到哪里
PUBLIC_CHECKOUT_DOMAIN="checkout.flowtica.ai"
```

**第五步：更新白名单（参考第一部分）**

千万别忘了把正式域名加到 Shopify 的 API 白名单里！
- **CORS Allowed Origins**: 添加 `https://www.flowtica.ai` 和 `https://flowtica.ai`
- **Customer Account Callback**: 添加 `https://www.flowtica.ai/account/authorize`

### 2.3 总结

你不需要真的去“删除”或“下架”那套 Shopify 模板代码（它留在那儿没关系），你只需要**把 `www.flowtica.ai` 的 DNS 解析从 Shopify 抽走，绑定给 Cloudflare**。一旦域名切换完成，流量就会全部涌入你的新版 Headless 前端，旧版 Theme 就自然被架空了