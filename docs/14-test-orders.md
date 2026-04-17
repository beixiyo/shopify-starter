# 测试订单与支付验证

在不花真钱的前提下验证完整购买流程。本店使用 Shopify Payments，通过其内置 **Test Mode** 进行测试

> ⚠️ **开启 Test Mode 期间，所有渠道（老站 + 新站）的真实信用卡交易都会失败。务必选低流量时段操作，测完立即关闭。**

## 1. 开启 Test Mode

1. 后台 → **Settings → Payments** → Shopify Payments 区域 → **Manage**
2. 拉到底部 → 勾选 **Enable test mode** → **Save**

需要 **Store owner** 或有 Payments 权限的账号才能操作

## 2. 测试卡号

| 场景 | 卡号 | CVV | 有效期 |
|------|------|-----|--------|
| 支付成功 | `4242 4242 4242 4242` | 任意三位 | 任意未来日期 |
| 支付被拒 | `4000 0000 0000 0002` | 任意三位 | 任意未来日期 |
| 3D Secure 验证 | `4000 0000 0000 3220` | 任意三位 | 任意未来日期 |

持卡人姓名随意填写

完整测试卡号列表：[Shopify 官方文档 · Testing Shopify Payments](https://help.shopify.com/en/manual/payments/shopify-payments/testing-shopify-payments)

## 3. 测试流程

### 3.1 基础购买（英文站）

1. 访问 `http://localhost:3000/products/flowtica-scribe`
2. 点 **Add to cart** → 购物车抽屉弹出，确认商品名、数量、价格
3. 点 **Checkout** → 跳转到 Shopify 结账页
4. 填写收货地址（美国地址用邮编 `10001`）
5. 支付信息填测试卡号 `4242 4242 4242 4242`
6. 完成订单

**验证**：
- 后台 Orders 出现新订单，标记为 **test**
- **Channel** 列显示 Hydrogen 渠道名（非 `Online Store`）
- 金额、商品、variant 与前端选择一致

### 3.2 日语站购买

1. 访问 `http://localhost:3000/JA-JP/products/flowtica-scribe`
2. 同上流程加购 → Checkout
3. 结账页应显示**日语** UI（按钮、表单标签等）

**验证**：
- 结账页语言为日语
- 后台订单的 **Market** 列显示 Japan
- 可筛选 Channel + Market 区分英文站/日语站订单

### 3.3 支付失败

1. 结账时卡号填 `4000 0000 0000 0002`
2. 提交后应显示支付被拒提示

**验证**：后台不应产生新订单

### 3.4 变体切换

1. 选择不同 Color / Size → 确认价格跟随变化
2. 加购 → Checkout → 确认结账页显示的 variant 正确

## 4. 关闭 Test Mode

测试完毕后**立即执行**：

1. Settings → Payments → Shopify Payments → **Manage**
2. 取消勾选 **Enable test mode** → **Save**
3. 确认页面显示 Test mode 已关闭

## 5. 验证 Channel 区分（给市场部看）

测试订单产生后，后台 Orders 页面可以按以下维度筛选：

| 筛选条件 | 作用 |
|---------|------|
| **Channel** | 区分老站（`Online Store`）vs 新站（Hydrogen 渠道名） |
| **Market** | 区分美国订单 vs 日本订单 |

点列表上方的 **筛选图标（漏斗）** → 选 Channel 或 Market → 即可分开查看。截图给市场部证明"订单不会混"

## 6. 常见问题

**Q: Manage 按钮是灰色的？**
- 当前账号没有 Payments 权限。让 Store owner 在 Settings → Users and permissions 里给你加权限

**Q: 开了 test mode 但结账页没变化？**
- 清除浏览器缓存或用无痕模式重试
- 确认 Save 成功（页面顶部应有绿色提示）

**Q: 测试订单会影响数据报表吗？**
- Test mode 下的订单在 Analytics 中会被标记，不影响真实销售数据
- 测完可在 Orders 页面将测试订单 Archive 归档
