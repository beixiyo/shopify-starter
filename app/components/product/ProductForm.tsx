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
    <div className="product-form">
      {productOptions.map((option) => {
        // 如果选项值中只有一个值，不显示该选项
        if (option.optionValues.length === 1)
          return null

        return (
          <div className="product-options" key={ option.name }>
            <h5>{option.name}</h5>
            <div className="product-options-grid">
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

                if (isDifferentProduct) {
                  // SEO优化
                  // 当变体是导致不同URL的组合列表子产品时，
                  // 需要将其渲染为锚标记
                  return (
                    <Link
                      className="product-options-item"
                      key={ option.name + name }
                      prefetch="intent"
                      preventScrollReset
                      replace
                      to={ `/products/${handle}?${variantUriQuery}` }
                      style={ {
                        border: selected
                          ? '1px solid black'
                          : '1px solid transparent',
                        opacity: available ? 1 : 0.3,
                      } }
                    >
                      <ProductOptionSwatch swatch={ swatch } name={ name } />
                    </Link>
                  )
                }
                else {
                  // SEO优化
                  // 当变体是搜索参数的更新时，
                  // 将其渲染为使用JavaScript导航的按钮，
                  // 以便SEO机器人不会将这些索引为重复链接
                  return (
                    <button
                      type="button"
                      className={ `product-options-item${
                        exists && !selected ? ' link' : ''
                      }` }
                      key={ option.name + name }
                      style={ {
                        border: selected
                          ? '1px solid black'
                          : '1px solid transparent',
                        opacity: available ? 1 : 0.3,
                      } }
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
            <br />
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
      className="product-option-label-swatch"
      style={ {
        backgroundColor: color || 'transparent',
      } }
    >
      {!!image && <img src={ image } alt={ name } />}
    </div>
  )
}
