import type { MoneyV2 } from '@shopify/hydrogen/storefront-api-types'
import { Money } from '@shopify/hydrogen'

export function ProductPrice({
  price,
  compareAtPrice,
}: {
  price?: MoneyV2
  compareAtPrice?: MoneyV2 | null
}) {
  return (
    <div className="flex items-center gap-2">
      {compareAtPrice
        ? (
            <>
              {price
                ? (
                    <span className="text-lg font-semibold text-danger">
                      <Money data={ price } />
                    </span>
                  )
                : null}
              <span className="text-sm text-text3 line-through">
                <Money data={ compareAtPrice } />
              </span>
            </>
          )
        : price
          ? (
              <span className="text-lg font-semibold text-text">
                <Money data={ price } />
              </span>
            )
          : (
              <span>&nbsp;</span>
            )}
    </div>
  )
}
