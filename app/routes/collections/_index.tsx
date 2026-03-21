import type { CollectionFragment } from 'storefrontapi.generated'
import type { Route } from './+types/_index'
import { getPaginationVariables, Image } from '@shopify/hydrogen'
import { Link, useLoaderData } from 'react-router'
import { PaginatedResourceSection } from '~/components/layout/PaginatedResourceSection'

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
async function loadCriticalData({ context, request }: Route.LoaderArgs) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 4,
  })

  const [{ collections }] = await Promise.all([
    context.storefront.query(COLLECTIONS_QUERY, {
      variables: paginationVariables,
    }),
    // 在此添加其他查询，以便并行加载
  ])

  return { collections }
}

/**
 * 加载呈现折页以下内容所需的数据。此数据将被延迟，并在初始页面加载后获取。
 * 如果不可用，页面应该仍然返回 200。
 * 确保在此处不要抛出任何错误，因为这会导致页面返回 500。
 */
function loadDeferredData({ context }: Route.LoaderArgs) {
  return {}
}

export default function Collections() {
  const { collections } = useLoaderData<typeof loader>()

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-text mb-8">Collections</h1>
      <PaginatedResourceSection<CollectionFragment>
        connection={ collections }
        resourcesClassName="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {({ node: collection, index }) => (
          <CollectionItem
            key={ collection.id }
            collection={ collection }
            index={ index }
          />
        )}
      </PaginatedResourceSection>
    </div>
  )
}

function CollectionItem({
  collection,
  index,
}: {
  collection: CollectionFragment
  index: number
}) {
  return (
    <Link
      className="group block overflow-hidden rounded-xl hover:no-underline"
      key={ collection.id }
      to={ `/collections/${collection.handle}` }
      prefetch="intent"
    >
      {collection?.image && (
        <div className="overflow-hidden rounded-xl bg-background3">
          <Image
            alt={ collection.image.altText || collection.title }
            aspectRatio="1/1"
            data={ collection.image }
            loading={ index < 3 ? 'eager' : undefined }
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
      <h5 className="mt-3 text-base font-medium text-text group-hover:text-brand transition-colors">
        {collection.title}
      </h5>
    </Link>
  )
}

const COLLECTIONS_QUERY = `#graphql
  fragment Collection on Collection {
    id
    title
    handle
    image {
      id
      url
      altText
      width
      height
    }
  }
  query StoreCollections(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    collections(
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor
    ) {
      nodes {
        ...Collection
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
` as const
