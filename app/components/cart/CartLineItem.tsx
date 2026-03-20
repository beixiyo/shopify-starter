import type { OptimisticCartLine } from '@shopify/hydrogen'
import type { CartLineUpdateInput } from '@shopify/hydrogen/storefront-api-types'
import type {
  CartApiQueryFragment,
} from 'storefrontapi.generated'
import type { CartLayout, LineItemChildrenMap } from '~/components/cart/CartMain'
import { CartForm, Image } from '@shopify/hydrogen'
import { Link } from 'react-router'
import { useAside } from '~/components/layout/Aside'
import { ProductPrice } from '~/components/product/ProductPrice'
import { useVariantUrl } from '~/lib/variants'

export type CartLine = OptimisticCartLine<CartApiQueryFragment>

/**
 * 购物车中的单个行项目。它显示产品图像、标题和价格。
 * 它还提供控件来更新数量或删除行项目。
 * 如果该行是具有子组件（如保修或礼品包装）的父行，
 * 它们将在父行下方进行嵌套渲染。
 */
export function CartLineItem({
  layout,
  line,
  childrenMap,
}: {
  layout: CartLayout
  line: CartLine
  childrenMap: LineItemChildrenMap
}) {
  const { id, merchandise } = line
  const { product, title, image, selectedOptions } = merchandise
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions)
  const { close } = useAside()
  const lineItemChildren = childrenMap[id]
  const childrenLabelId = `cart-line-children-${id}`

  return (
    <li key={ id } className="cart-line">
      <div className="cart-line-inner">
        {image && (
          <Image
            alt={ title }
            aspectRatio="1/1"
            data={ image }
            height={ 100 }
            loading="lazy"
            width={ 100 }
          />
        )}

        <div>
          <Link
            prefetch="intent"
            to={ lineItemUrl }
            onClick={ () => {
              if (layout === 'aside') {
                close()
              }
            } }
          >
            <p>
              <strong>{product.title}</strong>
            </p>
          </Link>
          <ProductPrice price={ line?.cost?.totalAmount } />
          <ul>
            {selectedOptions.map(option => (
              <li key={ option.name }>
                <small>
                  {option.name}
                  :
                  {option.value}
                </small>
              </li>
            ))}
          </ul>
          <CartLineQuantity line={ line } />
        </div>
      </div>

      {lineItemChildren
        ? (
            <div>
              <p id={ childrenLabelId } className="sr-only">
                Line items with
                {' '}
                {product.title}
              </p>
              <ul aria-labelledby={ childrenLabelId } className="cart-line-children">
                {lineItemChildren.map(childLine => (
                  <CartLineItem
                    childrenMap={ childrenMap }
                    key={ childLine.id }
                    line={ childLine }
                    layout={ layout }
                  />
                ))}
              </ul>
            </div>
          )
        : null}
    </li>
  )
}

/**
 * 提供在购物车中更新行项目数量的控件。
 * 当行项目是新的且服务器尚未响应
 * 已成功添加到购物车时，这些控件被禁用。
 */
function CartLineQuantity({ line }: { line: CartLine }) {
  if (!line || typeof line?.quantity === 'undefined')
    return null
  const { id: lineId, quantity, isOptimistic } = line
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0))
  const nextQuantity = Number((quantity + 1).toFixed(0))

  return (
    <div className="cart-line-quantity">
      <small>
        Quantity:
        {quantity}
        {' '}
&nbsp;&nbsp;
      </small>
      <CartLineUpdateButton lines={ [{ id: lineId, quantity: prevQuantity }] }>
        <button
          aria-label="Decrease quantity"
          disabled={ quantity <= 1 || !!isOptimistic }
          name="decrease-quantity"
          value={ prevQuantity }
        >
          <span>&#8722; </span>
        </button>
      </CartLineUpdateButton>
      &nbsp;
      <CartLineUpdateButton lines={ [{ id: lineId, quantity: nextQuantity }] }>
        <button
          aria-label="Increase quantity"
          name="increase-quantity"
          value={ nextQuantity }
          disabled={ !!isOptimistic }
        >
          <span>&#43;</span>
        </button>
      </CartLineUpdateButton>
      &nbsp;
      <CartLineRemoveButton lineIds={ [lineId] } disabled={ !!isOptimistic } />
    </div>
  )
}

/**
 * 从购物车中删除行项目的按钮。当行项目是新的且
 * 服务器尚未响应已成功添加到购物车时，它被禁用。
 */
function CartLineRemoveButton({
  lineIds,
  disabled,
}: {
  lineIds: string[]
  disabled: boolean
}) {
  return (
    <CartForm
      fetcherKey={ getUpdateKey(lineIds) }
      route="/cart"
      action={ CartForm.ACTIONS.LinesRemove }
      inputs={ { lineIds } }
    >
      <button disabled={ disabled } type="submit">
        Remove
      </button>
    </CartForm>
  )
}

function CartLineUpdateButton({
  children,
  lines,
}: {
  children: React.ReactNode
  lines: CartLineUpdateInput[]
}) {
  const lineIds = lines.map(line => line.id)

  return (
    <CartForm
      fetcherKey={ getUpdateKey(lineIds) }
      route="/cart"
      action={ CartForm.ACTIONS.LinesUpdate }
      inputs={ { lines } }
    >
      {children}
    </CartForm>
  )
}

/**
 * 为更新操作返回一个唯一的键。这用于确保修改相同行项目的
 * 操作不会并发运行，而是相互取消。例如，如果用户
 * 快速连续点击"增加数量"和"减少数量"，
 * 操作将相互取消，只有最后一个会运行。
 * @param lineIds - 受更新影响的行ID
 * @returns
 */
function getUpdateKey(lineIds: string[]) {
  return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-')
}
