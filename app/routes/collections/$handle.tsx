import type { ProductItemFragment } from 'storefrontapi.generated'
import type { Route } from './+types/$handle'
import { Analytics, getPaginationVariables } from '@shopify/hydrogen'
import { redirect, useLoaderData } from 'react-router'
import { PaginatedResourceSection } from '~/components/layout/PaginatedResourceSection'
import { ProductItem } from '~/components/product/ProductItem'
import { redirectIfHandleIsLocalized } from '~/lib/redirect'

export const meta: Route.MetaFunction = ({ data }) => {
  return [{ title: `Hydrogen | ${data?.collection.title ?? ''} Collection` }]
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
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 8,
  })

  if (!handle) {
    throw redirect('/collections')
  }

  const [{ collection }] = await Promise.all([
    storefront.query(COLLECTION_QUERY, {
      variables: { handle, ...paginationVariables },
      // 在此添加其他查询，以便并行加载
    }),
  ])

  if (!collection) {
    throw new Response(`Collection ${handle} not found`, {
      status: 404,
    })
  }

  // API 句柄可能是本地化的，所以重定向到本地化的句柄
  redirectIfHandleIsLocalized(request, { handle, data: collection })

  return {
    collection,
  }
}

/**
 * 加载呈现折页以下内容所需的数据。此数据将被延迟，并在初始页面加载后获取。
 * 如果不可用，页面应该仍然返回 200。
 * 确保在此处不要抛出任何错误，因为这会导致页面返回 500。
 */
function loadDeferredData({ context }: Route.LoaderArgs) {
  return {}
}

export default function Collection() {
  const { collection } = useLoaderData<typeof loader>()

  return (
    <div className="collection">
      <h1>{collection.title}</h1>
      <p className="collection-description">{collection.description}</p>
      <PaginatedResourceSection<ProductItemFragment>
        connection={ collection.products }
        resourcesClassName="products-grid"
      >
        {({ node: product, index }) => (
          <ProductItem
            key={ product.id }
            product={ product }
            loading={ index < 8 ? 'eager' : undefined }
          />
        )}
      </PaginatedResourceSection>
      <Analytics.CollectionView
        data={ {
          collection: {
            id: collection.id,
            handle: collection.handle,
          },
        } }
      />
    </div>
  )
}

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
  }
` as const

// 注：https://shopify.dev/docs/api/storefront/2022-04/objects/collection
const COLLECTION_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      products(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor
      ) {
        nodes {
          ...ProductItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
  }
` as const
