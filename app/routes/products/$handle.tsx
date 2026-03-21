import type { Route } from './+types/$handle'
import {
  Analytics,
  getAdjacentAndFirstAvailableVariants,
  getProductOptions,
  getSelectedProductOptions,
  useOptimisticVariant,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen'
import { useLoaderData } from 'react-router'
import { ProductForm } from '~/components/product/ProductForm'
import { ProductImage } from '~/components/product/ProductImage'
import { ProductPrice } from '~/components/product/ProductPrice'
import { redirectIfHandleIsLocalized } from '~/lib/redirect'

export const meta: Route.MetaFunction = ({ data }) => {
  return [
    { title: `Hydrogen | ${data?.product.title ?? ''}` },
    {
      rel: 'canonical',
      href: `/products/${data?.product.handle}`,
    },
  ]
}

export async function loader(args: Route.LoaderArgs) {
  // 开始获取非关键数据，不阻塞首字节时间
  const deferredData = loadDeferredData(args)

  // 等待呈现页面初始状态所需的关键数据
  const criticalData = await loadCriticalData(args)

  return { ...deferredData, ...criticalData }
}

/**
 * 加载呈现折页以上内容所需的数据。这是呈现页面所需的关键数据。
 * 如果不可用，整个页面应该返回 400 或 500 错误。
 */
async function loadCriticalData({ context, params, request }: Route.LoaderArgs) {
  const { handle } = params
  const { storefront } = context

  if (!handle) {
    throw new Error('Expected product handle to be defined')
  }

  const [{ product }] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: { handle, selectedOptions: getSelectedProductOptions(request) },
    }),
    // 在此添加其他查询，以便并行加载
  ])

  if (!product?.id) {
    throw new Response(null, { status: 404 })
  }

  // API 句柄可能是本地化的，所以重定向到本地化的句柄
  redirectIfHandleIsLocalized(request, { handle, data: product })

  return {
    product,
  }
}

/**
 * 加载呈现折页以下内容所需的数据。此数据将被延迟，并在初始页面加载后获取。
 * 如果不可用，页面应该仍然返回 200。
 * 确保在此处不要抛出任何错误，因为这会导致页面返回 500。
 */
function loadDeferredData({ context, params }: Route.LoaderArgs) {
  // 放置任何不需要在首次页面渲染时可用的 API 调用
  // 例如：产品评论、产品推荐、社交源

  return {}
}

export default function Product() {
  const { product } = useLoaderData<typeof loader>()

  // 根据给定的可用变体信息乐观地选择一个变体
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  )

  // 在不导航的情况下将搜索参数设置为选定的变体
  // 仅当 URL 中未设置搜索参数时
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions)

  // 获取产品选项数组
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  })

  const { title, descriptionHtml } = product

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 lg:gap-16">
        <ProductImage image={ selectedVariant?.image } />
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">{title}</h1>
          <div className="mt-3">
            <ProductPrice
              price={ selectedVariant?.price }
              compareAtPrice={ selectedVariant?.compareAtPrice }
            />
          </div>
          <div className="mt-8">
            <ProductForm
              productOptions={ productOptions }
              selectedVariant={ selectedVariant }
            />
          </div>
          {descriptionHtml && (
            <div className="mt-10 border-t border-border pt-8">
              <h3 className="text-sm font-semibold text-text mb-3">Description</h3>
              <div
                className="prose prose-sm text-text2 max-w-none"
                dangerouslySetInnerHTML={ { __html: descriptionHtml } }
              />
            </div>
          )}
        </div>
      </div>
      <Analytics.ProductView
        data={ {
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        } }
      />
    </div>
  )
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const
