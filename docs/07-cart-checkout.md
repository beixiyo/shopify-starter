# 购物车与结账

Hydrogen 购物车基于 **React Router 的 Form + Action 模式**，配合 Hydrogen 内置的 `CartForm` 组件实现。这是从 Liquid（Ajax API `/cart/add.js`）迁移后变化最大的部分

## 1. 架构概览

```
用户点击「Add to Cart」
  → <CartForm> 渲染隐藏表单
    → 表单提交 POST 到 /cart（route action）
      → action 中调用 cart.addLines()（Storefront API mutation）
        → 返回更新后的 cart
          → useOptimisticCart() 立即更新 UI（不等后端响应）
```

### 关键角色

| 组件/文件 | 职责 |
|----------|------|
| `CartForm` | Hydrogen 封装的表单组件，发起购物车操作 |
| `($locale).cart.tsx` 的 `action` | 接收表单数据，调用 Cart API |
| `context.cart` | Cart API client（`addLines`、`updateLines`、`removeLines` 等） |
| `useOptimisticCart()` | 乐观更新（UI 立即响应，不等服务端） |

---

## 2. 加购按钮

```tsx
// app/components/AddToCartButton.tsx
export function AddToCartButton({ lines, disabled, children, onClick }) {
  return (
    <CartForm
      route="/cart" // 表单提交目标
      inputs={ { lines } } // 购物车行数据
      action={ CartForm.ACTIONS.LinesAdd } // 操作类型
    >
      {fetcher => (
        <>
          <input name="analytics" type="hidden" value={ JSON.stringify(analytics) } />
          <button
            type="submit"
            onClick={ onClick }
            disabled={ disabled ?? fetcher.state !== 'idle' } // 提交中禁用
          >
            {children}
          </button>
        </>
      )}
    </CartForm>
  )
}
```

### 在产品页调用

```tsx
// app/components/ProductForm.tsx
<AddToCartButton
  disabled={ !selectedVariant || !selectedVariant.availableForSale }
  onClick={ () => open('cart') } // 点击后打开购物车侧栏
  lines={ selectedVariant
    ? [{
        merchandiseId: selectedVariant.id,
        quantity: 1,
        selectedVariant,
      }]
    : [] }
>
  {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
</AddToCartButton>
```

---

## 3. Cart Route Action

`($locale).cart.tsx` 的 `action` 是购物车操作的统一入口：

```tsx
export async function action({ request, context }: Route.ActionArgs) {
  const { cart } = context
  const formData = await request.formData()
  const { action, inputs } = CartForm.getFormInput(formData)

  let result: CartQueryDataReturn

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
      result = await cart.updateDiscountCodes([...discountCodes])
      break

    case CartForm.ACTIONS.GiftCardCodesAdd:
      result = await cart.addGiftCardCodes([...giftCardCodes])
      break

    case CartForm.ACTIONS.GiftCardCodesRemove:
      result = await cart.removeGiftCardCodes([...giftCardCodes])
      break

    case CartForm.ACTIONS.BuyerIdentityUpdate:
      result = await cart.updateBuyerIdentity({ ...inputs.buyerIdentity })
      break
  }

  // 设置 cart ID cookie（首次创建购物车时）
  const headers = result.cart?.id
    ? cart.setCartId(result.cart.id)
    : new Headers()

  // 支持表单提交后重定向
  const redirectTo = formData.get('redirectTo')
  if (typeof redirectTo === 'string') {
    headers.set('Location', redirectTo)
    return data({ cart: result.cart }, { status: 303, headers })
  }

  return data({ cart: result.cart, errors: result.errors }, { status: 200, headers })
}
```

---

## 4. Optimistic UI（乐观更新）

购物车使用 `useOptimisticCart()` 实现即时 UI 反馈：

```tsx
// app/components/CartMain.tsx
export function CartMain({ layout, cart: originalCart }) {
  // 乐观更新：在服务端响应前，先用 pending action 预测结果
  const cart = useOptimisticCart(originalCart)

  return (
    <ul>
      {cart?.lines?.nodes?.map(line => (
        <CartLineItem key={ line.id } line={ line } />
      ))}
    </ul>
  )
}
```

工作原理：
1. 用户点击加购 → `CartForm` 发起 POST 请求
2. `useOptimisticCart` 立即将新商品添加到本地 cart 状态
3. 用户立即看到购物车更新（**无需等待**服务端响应）
4. 服务端响应后，替换为真实数据

类似的，Header 中的购物车数量也是乐观更新：

```tsx
// app/components/Header.tsx
function CartBanner() {
  const originalCart = useAsyncValue()
  const cart = useOptimisticCart(originalCart) // 乐观更新数量
  return <CartBadge count={ cart?.totalQuantity ?? 0 } />
}
```

---

## 5. Cart 页面 vs Cart 侧栏

项目同时支持两种购物车展示方式：

### 购物车页面（`/cart`）

```tsx
// app/routes/($locale).cart.tsx
export default function Cart() {
  const cart = useLoaderData<typeof loader>()
  return (
    <div className="cart">
      <h1>Cart</h1>
      <CartMain layout="page" cart={ cart } />
    </div>
  )
}

export async function loader({ context }: Route.LoaderArgs) {
  return await context.cart.get() // 直接加载完整购物车
}
```

### 购物车侧栏（Aside）

```tsx
// app/components/PageLayout.tsx
function CartAside({ cart }) {
  return (
    <Aside type="cart" heading="CART">
      <Suspense fallback={ <p>Loading cart...</p> }>
        <Await resolve={ cart }>
          {cart => <CartMain cart={ cart } layout="aside" />}
        </Await>
      </Suspense>
    </Aside>
  )
}
```

侧栏使用 deferred 的 `cart` Promise（来自 root loader），不阻塞首屏

---

## 6. 结账流程

Hydrogen 不处理结账——直接跳转到 Shopify Checkout：

```tsx
// app/components/CartSummary.tsx
<a href={ cart.checkoutUrl } target="_self">
  Continue to Checkout →
</a>
```

`cart.checkoutUrl` 由 Storefront API 返回，指向 Shopify 的托管结账页面（`checkout.shopify.com`）

### 自定义结账

如果需要自定义结账体验，可以使用：
- **Shopify Checkout Extensibility**（推荐）：通过 Checkout UI Extensions 自定义
- **Custom checkout**：完全自建结账流（需要 Shopify Plus）

---

## 7. 折扣码和礼品卡

CartForm 支持折扣码和礼品卡操作：

```tsx
// 应用折扣码
<CartForm
  route="/cart"
  action={CartForm.ACTIONS.DiscountCodesUpdate}
  inputs={{ discountCode: 'SUMMER20', discountCodes: existingCodes }}
>
  <button type="submit">Apply Discount</button>
</CartForm>

// 添加礼品卡
<CartForm
  route="/cart"
  action={CartForm.ACTIONS.GiftCardCodesAdd}
  inputs={{ giftCardCode: 'ABCD-1234-EFGH-5678' }}
>
  <button type="submit">Apply Gift Card</button>
</CartForm>
```

---

## 8. 下一步

进入 [08-components.md](./08-components.md) 了解 Hydrogen 内置组件和自定义组件模式
