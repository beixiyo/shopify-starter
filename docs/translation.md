# 翻译与多语言内容管理

Hydrogen 的国际化分两层：**路由 + API 上下文**（代码层，已完成）和**翻译内容**（运营层，本文档）。代码层 + 踩坑清单见 [i18n.md](./i18n.md)

## 1. 前置条件

| 步骤 | 路径 | 状态 |
|------|------|------|
| Markets 激活目标市场 | Markets → Asia（含 Japan） | ✅ Active |
| Languages 添加并发布日语 | Settings → Languages → Japanese → Publish | ✅ Published |
| 日语分配到域名 | Languages → Japanese → 2 domains | ✅ Done |

确认方式：GraphiQL 查询带 `@inContext(language: JA, country: JP)` 不报错即可

```graphql
query @inContext(language: JA, country: JP) {
  product(handle: "flowtica-scribe") {
    title
    descriptionHtml
  }
}
```

返回 `extensions.context.language: "JA"` 说明市场已激活。若标题仍为英文 → 正常，只是还没填翻译

---

## 2. 翻译内容

### 2.1 使用 Translate & Adapt

路径：Settings → Languages → Japanese 行 → **Translate ∨** → **Translate & Adapt**

或直接从 Shopify 后台左侧 **Apps → Translate & Adapt** 进入

### 2.2 需要翻译的资源类型

按优先级排序：

| 优先级 | 资源类型 | 影响范围 | 说明 |
|--------|---------|---------|------|
| P0 | **Products** | 商品页标题、描述、SEO | 用户直接看到的核心内容 |
| P0 | **Product options** | 选项名（如 Color、Size） | 影响变体选择器显示 |
| P1 | **Collections** | 集合页标题、描述 | 影响分类浏览 |
| P1 | **Navigation menus** | 导航栏 | Header / Footer 菜单项 |
| P2 | **Pages** | 关于我们、FAQ 等静态页 | CMS 内容 |
| P2 | **Policies** | 隐私政策、退货政策 | 法律合规 |
| P3 | **Email notifications** | 订单确认、发货通知 | Settings → Notifications |

### 2.3 单个商品翻译流程

1. Translate & Adapt → 选语言「Japanese」→ 选资源类型「Products」
2. 点击某个商品 → 左侧英文原文、右侧填日语译文
3. 需要翻译的字段：
   - **Title** — 商品标题
   - **Description** — 富文本描述（支持 HTML）
   - **SEO title** — 搜索引擎标题（可选，不填则用 Title）
   - **SEO description** — 搜索引擎描述
   - **URL handle** — 通常不改，保持英文 URL
4. 点 **Save** 保存

### 2.4 验证翻译是否生效

**方式 A — GraphiQL**

```graphql
query @inContext(language: JA, country: JP) {
  product(handle: "flowtica-scribe") {
    title
    descriptionHtml
  }
}
```

`title` 返回日语 → 生效。注意 Storefront API 有 CDN 缓存，保存后可能需要等几秒到几分钟

**方式 B — 前端页面**

访问 `http://localhost:3000/JA-JP/products/flowtica-scribe` → 标题和描述显示日语

---

## 3. 结账页翻译

**无需手工翻译**。Shopify 为结账页 UI 提供 33 种语言的预翻译字符串，日语已包含（按钮文字、表单标签等自动日语化）

触发条件：购物车通过 `@inContext(language: JA)` 创建 → `checkoutUrl` 跳转后自动显示日语结账页

需要翻译的例外：
- **Checkout UI Extensions**（如果安装了第三方结账插件）→ 需要在插件内单独配置
- **订单确认邮件** → Settings → Notifications → 编辑各模板添加日语版本

---

## 4. 批量翻译

### 4.1 导出 / 导入（推荐大量翻译时使用）

1. Settings → Languages → 右上角 **Export** → 选语言和资源类型 → 下载 CSV
2. 在 CSV 中填写翻译（`default` 列是英文原文，`ja` 列填日语）
3. Settings → Languages → **Import** → 上传 CSV

### 4.2 AI 自动翻译

Translate & Adapt 内置 Shopify AI 翻译：

1. 进入某资源的翻译页面
2. 点击 **Auto-translate** 按钮
3. 审核 AI 生成的翻译 → 人工修正 → 保存

⚠️ AI 翻译建议仅作初稿，由市场部人工审核专业术语和品牌用语

---

## 5. 新增语言清单

未来添加新语言时（如中文、韩语），按以下清单操作：

1. Settings → Languages → **Add language** → 选择语言 → Publish
2. 分配到对应域名
3. [app/lib/i18n/i18n.ts](../app/lib/i18n/i18n.ts) 的 `SUPPORTED_LOCALES` 数组追加一项
4. Translate & Adapt 填写翻译内容
5. 验证 GraphiQL + 前端页面 + 结账流程

```ts
// 示例：添加简体中文
{ language: 'ZH', country: 'CN', pathPrefix: '/ZH-CN', label: '简体中文' }
```

---

## 6. 常见问题

**Q: 翻译保存了但前端还是英文？**
- Storefront API 有 CDN 缓存，等 1-2 分钟后刷新
- 确认访问的是带 locale 前缀的 URL（如 `/JA-JP/...`），而非无前缀的默认英文路径
- GraphiQL 查询确认 `@inContext(language: JA)` 返回的是日语

**Q: 购物车里商品名是英文，但结账页是日语？**
- 已知 Shopify bug：cart mutation 返回数据不遵守 `@inContext` 的 language 参数
- `checkoutUrl` 本身的语言绑定不受影响
- 见 [i18n.md](./i18n.md) 的「Storefront API 的已知行为差异」一节

**Q: URL handle 需要翻译吗？**
- 通常**不翻译**，保持英文。日语 URL 对 SEO 无优势且容易编码出错
- 若后台翻译了 handle，代码 [app/lib/redirect.ts](../app/lib/redirect.ts) 的 `redirectIfHandleIsLocalized` 会自动 302 重定向
