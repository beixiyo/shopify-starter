import type { MappedProductOptions } from '@shopify/hydrogen'
import type {
  Maybe,
  ProductOptionValueSwatch,
} from '@shopify/hydrogen/storefront-api-types'
import type { ProductFragment } from 'storefrontapi.generated'
import { Link, useNavigate } from 'react-router'
import { AddToCartButton } from '~/components/cart/AddToCartButton'
import { useAside } from '~/components/layout/Aside'

export function ProductForm({
  productOptions,
  selectedVariant,
}: {
  productOptions: MappedProductOptions[]
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant']
}) {
  const navigate = useNavigate()
  const { open } = useAside()
  return (
    <div className="space-y-6">
      {productOptions.map((option) => {
        if (option.optionValues.length === 1)
          return null

        return (
          <div key={ option.name }>
            <h5 className="text-sm font-medium text-text mb-3">{option.name}</h5>
            <div className="flex flex-wrap gap-2">
              {option.optionValues.map((value) => {
                const {
                  name,
                  handle,
                  variantUriQuery,
                  selected,
                  available,
                  exists,
                  isDifferentProduct,
                  swatch,
                } = value

                const baseClass = `relative flex items-center justify-center rounded-lg border px-4 py-2 text-sm transition-all ${
                  selected
                    ? 'border-text bg-text text-background font-medium'
                    : 'border-border text-text hover:border-text'
                } ${!available ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`

                if (isDifferentProduct) {
                  return (
                    <Link
                      className={ baseClass }
                      key={ option.name + name }
                      prefetch="intent"
                      preventScrollReset
                      replace
                      to={ `/products/${handle}?${variantUriQuery}` }
                    >
                      <ProductOptionSwatch swatch={ swatch } name={ name } />
                    </Link>
                  )
                }
                else {
                  return (
                    <button
                      type="button"
                      className={ baseClass }
                      key={ option.name + name }
                      disabled={ !exists }
                      onClick={ () => {
                        if (!selected) {
                          void navigate(`?${variantUriQuery}`, {
                            replace: true,
                            preventScrollReset: true,
                          })
                        }
                      } }
                    >
                      <ProductOptionSwatch swatch={ swatch } name={ name } />
                    </button>
                  )
                }
              })}
            </div>
          </div>
        )
      })}
      <AddToCartButton
        disabled={ !selectedVariant || !selectedVariant.availableForSale }
        onClick={ () => {
          open('cart')
        } }
        lines={
          selectedVariant
            ? [
                {
                  merchandiseId: selectedVariant.id,
                  quantity: 1,
                  selectedVariant,
                },
              ]
            : []
        }
      >
        {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
      </AddToCartButton>
    </div>
  )
}

function ProductOptionSwatch({
  swatch,
  name,
}: {
  swatch?: Maybe<ProductOptionValueSwatch> | undefined
  name: string
}) {
  const image = swatch?.image?.previewImage?.url
  const color = swatch?.color

  if (!image && !color)
    return name

  return (
    <div
      aria-label={ name }
      className="h-6 w-6 rounded-full border border-border2"
      style={ {
        backgroundColor: color || 'transparent',
      } }
    >
      {!!image && <img src={ image } alt={ name } className="h-full w-full rounded-full object-cover" />}
    </div>
  )
}
