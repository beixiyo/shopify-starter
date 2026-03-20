import type {
  PredictiveSearchQuery,
  RegularSearchQuery,
} from 'storefrontapi.generated'
import type { Route } from './+types/search'
import type { PredictiveSearchReturn, RegularSearchReturn } from '~/lib/search'
import { Analytics, getPaginationVariables } from '@shopify/hydrogen'
import { useLoaderData } from 'react-router'
import { SearchForm } from '~/components/search/SearchForm'
import { SearchResults } from '~/components/search/SearchResults'
import {
  getEmptyPredictiveSearchResult,

} from '~/lib/search'

export const meta: Route.MetaFunction = () => {
  return [{ title: `Hydrogen | Search` }]
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const isPredictive = url.searchParams.has('predictive')
  const searchPromise: Promise<PredictiveSearchReturn | RegularSearchReturn>
    = isPredictive
      ? predictiveSearch({ request, context })
      : regularSearch({ request, context })

  searchPromise.catch((error: Error) => {
    console.error(error)
    return { term: '', result: null, error: error.message }
  })

  return await searchPromise
}

/**
 * 呈现 /search 路由
 */
export default function SearchPage() {
  const { type, term, result, error } = useLoaderData<typeof loader>()
  if (type === 'predictive')
    return null

  return (
    <div className="search">
      <h1>Search</h1>
      <SearchForm>
        {({ inputRef }) => (
          <>
            <input
              defaultValue={ term }
              name="q"
              placeholder="Search…"
              ref={ inputRef }
              type="search"
            />
            &nbsp;
            <button type="submit">Search</button>
          </>
        )}
      </SearchForm>
      {error && <p style={ { color: 'red' } }>{error}</p>}
      {!term || !result?.total
        ? (
            <SearchResults.Empty />
          )
        : (
            <SearchResults result={ result } term={ term }>
              {({ articles, pages, products, term }) => (
                <div>
                  <SearchResults.Products products={ products } term={ term } />
                  <SearchResults.Pages pages={ pages } term={ term } />
                  <SearchResults.Articles articles={ articles } term={ term } />
                </div>
              )}
            </SearchResults>
          )}
      <Analytics.SearchView data={ { searchTerm: term, searchResults: result } } />
    </div>
  )
}

/**
 * 常规搜索查询和片段
 * （根据需要调整）
 */
const SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment SearchProduct on Product {
    __typename
    handle
    id
    publishedAt
    title
    trackingParameters
    vendor
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
      compareAtPrice {
        amount
        currencyCode
      }
      selectedOptions {
        name
        value
      }
      product {
        handle
        title
      }
    }
  }
` as const

const SEARCH_PAGE_FRAGMENT = `#graphql
  fragment SearchPage on Page {
     __typename
     handle
    id
    title
    trackingParameters
  }
` as const

const SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment SearchArticle on Article {
    __typename
    handle
    id
    title
    trackingParameters
  }
` as const

const PAGE_INFO_FRAGMENT = `#graphql
  fragment PageInfoFragment on PageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
` as const

// 注：https://shopify.dev/docs/api/storefront/latest/queries/search
export const SEARCH_QUERY = `#graphql
  query RegularSearch(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $term: String!
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    articles: search(
      query: $term,
      types: [ARTICLE],
      first: $first,
    ) {
      nodes {
        ...on Article {
          ...SearchArticle
        }
      }
    }
    pages: search(
      query: $term,
      types: [PAGE],
      first: $first,
    ) {
      nodes {
        ...on Page {
          ...SearchPage
        }
      }
    }
    products: search(
      after: $endCursor,
      before: $startCursor,
      first: $first,
      last: $last,
      query: $term,
      sortKey: RELEVANCE,
      types: [PRODUCT],
      unavailableProducts: HIDE,
    ) {
      nodes {
        ...on Product {
          ...SearchProduct
        }
      }
      pageInfo {
        ...PageInfoFragment
      }
    }
  }
  ${SEARCH_PRODUCT_FRAGMENT}
  ${SEARCH_PAGE_FRAGMENT}
  ${SEARCH_ARTICLE_FRAGMENT}
  ${PAGE_INFO_FRAGMENT}
` as const

/**
 * 常规搜索获取器
 */
async function regularSearch({
  request,
  context,
}: Pick<
  Route.LoaderArgs,
  'request' | 'context'
>): Promise<RegularSearchReturn> {
  const { storefront } = context
  const url = new URL(request.url)
  const variables = getPaginationVariables(request, { pageBy: 8 })
  const term = String(url.searchParams.get('q') || '')

  // 搜索 `q` 术语的文章、页面和产品
  const {
    errors,
    ...items
  }: { errors?: Array<{ message: string }> } & RegularSearchQuery
    = await storefront.query(SEARCH_QUERY, {
      variables: { ...variables, term },
    })

  if (!items) {
    throw new Error('No search data returned from Shopify API')
  }

  const total = Object.values(items).reduce(
    (acc: number, { nodes }: { nodes: Array<unknown> }) => acc + nodes.length,
    0,
  )

  const error = errors
    ? errors.map(({ message }: { message: string }) => message).join(', ')
    : undefined

  return { type: 'regular', term, error, result: { total, items } }
}

/**
 * 预测搜索查询和片段
 * （根据需要调整）
 */
const PREDICTIVE_SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment PredictiveArticle on Article {
    __typename
    id
    title
    handle
    blog {
      handle
    }
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
` as const

const PREDICTIVE_SEARCH_COLLECTION_FRAGMENT = `#graphql
  fragment PredictiveCollection on Collection {
    __typename
    id
    title
    handle
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
` as const

const PREDICTIVE_SEARCH_PAGE_FRAGMENT = `#graphql
  fragment PredictivePage on Page {
    __typename
    id
    title
    handle
    trackingParameters
  }
` as const

const PREDICTIVE_SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment PredictiveProduct on Product {
    __typename
    id
    title
    handle
    trackingParameters
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
    }
  }
` as const

const PREDICTIVE_SEARCH_QUERY_FRAGMENT = `#graphql
  fragment PredictiveQuery on SearchQuerySuggestion {
    __typename
    text
    styledText
    trackingParameters
  }
` as const

// 注：https://shopify.dev/docs/api/storefront/latest/queries/predictiveSearch
const PREDICTIVE_SEARCH_QUERY = `#graphql
  query PredictiveSearch(
    $country: CountryCode
    $language: LanguageCode
    $limit: Int!
    $limitScope: PredictiveSearchLimitScope!
    $term: String!
    $types: [PredictiveSearchType!]
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(
      limit: $limit,
      limitScope: $limitScope,
      query: $term,
      types: $types,
    ) {
      articles {
        ...PredictiveArticle
      }
      collections {
        ...PredictiveCollection
      }
      pages {
        ...PredictivePage
      }
      products {
        ...PredictiveProduct
      }
      queries {
        ...PredictiveQuery
      }
    }
  }
  ${PREDICTIVE_SEARCH_ARTICLE_FRAGMENT}
  ${PREDICTIVE_SEARCH_COLLECTION_FRAGMENT}
  ${PREDICTIVE_SEARCH_PAGE_FRAGMENT}
  ${PREDICTIVE_SEARCH_PRODUCT_FRAGMENT}
  ${PREDICTIVE_SEARCH_QUERY_FRAGMENT}
` as const

/**
 * 预测搜索获取器
 */
async function predictiveSearch({
  request,
  context,
}: Pick<
  Route.ActionArgs,
  'request' | 'context'
>): Promise<PredictiveSearchReturn> {
  const { storefront } = context
  const url = new URL(request.url)
  const term = String(url.searchParams.get('q') || '').trim()
  const limit = Number(url.searchParams.get('limit') || 10)
  const type = 'predictive'

  if (!term)
    return { type, term, result: getEmptyPredictiveSearchResult() }

  // 预测性地搜索文章、集合、页面、产品和查询（建议）
  const {
    predictiveSearch: items,
    errors,
  }: PredictiveSearchQuery & { errors?: Array<{ message: string }> }
    = await storefront.query(PREDICTIVE_SEARCH_QUERY, {
      variables: {
        // 根据需要自定义搜索选项
        limit,
        limitScope: 'EACH',
        term,
      },
    })

  if (errors) {
    throw new Error(
      `Shopify API errors: ${errors.map(({ message }: { message: string }) => message).join(', ')}`,
    )
  }

  if (!items) {
    throw new Error('No predictive search data returned from Shopify API')
  }

  const total = Object.values(items).reduce(
    (acc: number, item: Array<unknown>) => acc + item.length,
    0,
  )

  return { type, term, result: { items, total } }
}
