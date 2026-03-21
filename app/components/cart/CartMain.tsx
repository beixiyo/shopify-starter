import type { CartApiQueryFragment } from 'storefrontapi.generated'
import type { CartLine } from '~/components/cart/CartLineItem'
import { useOptimisticCart } from '@shopify/hydrogen'
import { Link } from 'react-router'
import { CartLineItem } from '~/components/cart/CartLineItem'
import { CartSummary } from '~/components/cart/CartSummary'
import { useAside } from '~/components/layout/Aside'

export type CartLayout = 'page' | 'aside'

export type CartMainProps = {
  cart: CartApiQueryFragment | null
  layout: CartLayout
}

export type LineItemChildrenMap = { [parentId: string]: CartLine[] }
/** Returns a map of all line items and their children. */
function getLineItemChildrenMap(lines: CartLine[]): LineItemChildrenMap {
  const children: LineItemChildrenMap = {}
  for (const line of lines) {
    if ('parentRelationship' in line && line.parentRelationship?.parent) {
      const parentId = line.parentRelationship.parent.id
      if (!children[parentId])
        children[parentId] = []
      children[parentId].push(line)
    }
    if ('lineComponents' in line) {
      const children = getLineItemChildrenMap(line.lineComponents)
      for (const [parentId, childIds] of Object.entries(children)) {
        if (!children[parentId])
          children[parentId] = []
        children[parentId].push(...childIds)
      }
    }
  }
  return children
}
/**
 * The main cart component that displays the cart items and summary.
 * It is used by both the /cart route and the cart aside dialog.
 */
export function CartMain({ layout, cart: originalCart }: CartMainProps) {
  const cart = useOptimisticCart(originalCart)

  const linesCount = Boolean(cart?.lines?.nodes?.length || 0)
  const cartHasItems = cart?.totalQuantity ? cart.totalQuantity > 0 : false
  const childrenMap = getLineItemChildrenMap(cart?.lines?.nodes ?? [])

  return (
    <section
      aria-label={ layout === 'page' ? 'Cart page' : 'Cart drawer' }
    >
      <CartEmpty hidden={ linesCount } layout={ layout } />
      <div>
        <p id="cart-lines" className="sr-only">
          Line items
        </p>
        <ul aria-labelledby="cart-lines" className="divide-y divide-border">
          {(cart?.lines?.nodes ?? []).map((line) => {
            if (
              'parentRelationship' in line
              && line.parentRelationship?.parent
            ) {
              return null
            }
            return (
              <CartLineItem
                key={ line.id }
                line={ line }
                layout={ layout }
                childrenMap={ childrenMap }
              />
            )
          })}
        </ul>
        {cartHasItems && <CartSummary cart={ cart } layout={ layout } />}
      </div>
    </section>
  )
}

function CartEmpty({
  hidden = false,
}: {
  hidden: boolean
  layout?: CartMainProps['layout']
}) {
  const { close } = useAside()
  return (
    <div hidden={ hidden } className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-text3 text-lg mb-6">
        Looks like you haven&rsquo;t added anything yet, let&rsquo;s get you started!
      </p>
      <Link
        to="/collections"
        onClick={ close }
        prefetch="viewport"
        className="inline-flex items-center gap-2 rounded-lg bg-button px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        Continue shopping
        <span>&rarr;</span>
      </Link>
    </div>
  )
}
