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
    <li key={ id } className="py-6 first:pt-0">
      <div className="flex gap-4">
        {image && (
          <div className="shrink-0 overflow-hidden rounded-lg bg-background3">
            <Image
              alt={ title }
              aspectRatio="1/1"
              data={ image }
              height={ 100 }
              loading="lazy"
              width={ 100 }
              className="h-24 w-24 object-cover"
            />
          </div>
        )}

        <div className="flex flex-1 flex-col justify-between min-w-0">
          <div>
            <Link
              prefetch="intent"
              to={ lineItemUrl }
              onClick={ () => {
                if (layout === 'aside') {
                  close()
                }
              } }
              className="hover:text-brand transition-colors"
            >
              <p className="text-sm font-medium text-text truncate">
                {product.title}
              </p>
            </Link>
            <div className="mt-1 text-sm text-text3">
              <ProductPrice price={ line?.cost?.totalAmount } />
            </div>
            {selectedOptions.length > 0 && (
              <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                {selectedOptions.map(option => (
                  <li key={ option.name } className="text-xs text-text3">
                    {option.name}
                    :
                    {option.value}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <CartLineQuantity line={ line } />
        </div>
      </div>

      {lineItemChildren
        ? (
            <div className="mt-3 ml-28">
              <p id={ childrenLabelId } className="sr-only">
                Line items with
                {' '}
                {product.title}
              </p>
              <ul aria-labelledby={ childrenLabelId } className="divide-y divide-border/50">
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
 */
function CartLineQuantity({ line }: { line: CartLine }) {
  if (!line || typeof line?.quantity === 'undefined')
    return null
  const { id: lineId, quantity, isOptimistic } = line
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0))
  const nextQuantity = Number((quantity + 1).toFixed(0))

  return (
    <div className="mt-2 flex items-center gap-2">
      <div className="flex items-center rounded-lg border border-border">
        <CartLineUpdateButton lines={ [{ id: lineId, quantity: prevQuantity }] }>
          <button
            aria-label="Decrease quantity"
            disabled={ quantity <= 1 || !!isOptimistic }
            name="decrease-quantity"
            value={ prevQuantity }
            className="flex h-8 w-8 items-center justify-center text-text3 transition-colors hover:text-text disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="text-sm">&#8722;</span>
          </button>
        </CartLineUpdateButton>
        <span className="flex h-8 w-8 items-center justify-center text-sm font-medium text-text">
          {quantity}
        </span>
        <CartLineUpdateButton lines={ [{ id: lineId, quantity: nextQuantity }] }>
          <button
            aria-label="Increase quantity"
            name="increase-quantity"
            value={ nextQuantity }
            disabled={ !!isOptimistic }
            className="flex h-8 w-8 items-center justify-center text-text3 transition-colors hover:text-text disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="text-sm">&#43;</span>
          </button>
        </CartLineUpdateButton>
      </div>
      <CartLineRemoveButton lineIds={ [lineId] } disabled={ !!isOptimistic } />
    </div>
  )
}

/**
 * 从购物车中删除行项目的按钮。
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
      <button
        disabled={ disabled }
        type="submit"
        className="text-xs text-text3 underline-offset-2 hover:text-danger hover:underline transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
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
 * 为更新操作返回一个唯一的键。
 */
function getUpdateKey(lineIds: string[]) {
  return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-')
}
