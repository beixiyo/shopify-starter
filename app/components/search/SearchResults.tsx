import type { RegularSearchReturn } from '~/lib/search'
import { Image, Money, Pagination } from '@shopify/hydrogen'
import { Link } from 'react-router'
import { urlWithTrackingParams } from '~/lib/search'

type SearchItems = RegularSearchReturn['result']['items']
type PartialSearchResult<ItemType extends keyof SearchItems> = Pick<
  SearchItems,
  ItemType
>
  & Pick<RegularSearchReturn, 'term'>

type SearchResultsProps = RegularSearchReturn & {
  children: (args: SearchItems & { term: string }) => React.ReactNode
}

export function SearchResults({
  term,
  result,
  children,
}: Omit<SearchResultsProps, 'error' | 'type'>) {
  if (!result?.total) {
    return null
  }

  return children({ ...result.items, term })
}

SearchResults.Articles = SearchResultsArticles
SearchResults.Pages = SearchResultsPages
SearchResults.Products = SearchResultsProducts
SearchResults.Empty = SearchResultsEmpty

function SearchResultsArticles({
  term,
  articles,
}: PartialSearchResult<'articles'>) {
  if (!articles?.nodes.length) {
    return null
  }

  return (
    <div className="search-result">
      <h2 className="text-2xl font-medium tracking-tight text-text mb-6">Articles</h2>
      <div className="flex flex-col">
        { articles?.nodes?.map((article) => {
          const articleUrl = urlWithTrackingParams({
            baseUrl: `/blogs/${article.handle}`,
            trackingParams: article.trackingParameters,
            term,
          })

          return (
            <Link
              key={ article.id }
              prefetch="intent"
              to={ articleUrl }
              className="group flex items-center justify-between py-6 border-b border-border2 hover:border-text transition-colors"
            >
              <span className="text-lg font-medium text-text group-hover:text-text2 transition-colors">
                { article.title }
              </span>
              <svg className="w-5 h-5 text-text4 group-hover:text-text transition-all transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          )
        }) }
      </div>
    </div>
  )
}

function SearchResultsPages({ term, pages }: PartialSearchResult<'pages'>) {
  if (!pages?.nodes.length) {
    return null
  }

  return (
    <div className="search-result">
      <h2 className="text-2xl font-medium tracking-tight text-text mb-6">Pages</h2>
      <div className="flex flex-col">
        { pages?.nodes?.map((page) => {
          const pageUrl = urlWithTrackingParams({
            baseUrl: `/pages/${page.handle}`,
            trackingParams: page.trackingParameters,
            term,
          })

          return (
            <Link
              key={ page.id }
              prefetch="intent"
              to={ pageUrl }
              className="group flex items-center justify-between py-6 border-b border-border2 hover:border-text transition-colors"
            >
              <span className="text-lg font-medium text-text group-hover:text-text2 transition-colors">
                { page.title }
              </span>
              <svg className="w-5 h-5 text-text4 group-hover:text-text transition-all transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          )
        }) }
      </div>
    </div>
  )
}

function SearchResultsProducts({
  term,
  products,
}: PartialSearchResult<'products'>) {
  if (!products?.nodes.length) {
    return null
  }

  return (
    <div className="search-result">
      <h2 className="text-2xl font-medium tracking-tight text-text mb-8">Products</h2>
      <Pagination connection={ products }>
        { ({ nodes, isLoading, NextLink, PreviousLink }) => {
          const ItemsMarkup = nodes.map((product) => {
            const productUrl = urlWithTrackingParams({
              baseUrl: `/products/${product.handle}`,
              trackingParams: product.trackingParameters,
              term,
            })

            const price = product?.selectedOrFirstAvailableVariant?.price
            const image = product?.selectedOrFirstAvailableVariant?.image

            return (
              <Link
                key={ product.id }
                prefetch="intent"
                to={ productUrl }
                className="group flex flex-col"
              >
                <div className="aspect-4/5 w-full overflow-hidden rounded-2xl bg-background2 mb-4">
                  { image ? (
                    <Image
                      data={ image }
                      alt={ product.title }
                      sizes="(min-width: 768px) 25vw, 50vw"
                      className="object-cover w-full h-full transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-text4">
                      No image
                    </div>
                  ) }
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-text truncate">{ product.title }</span>
                  <span className="text-sm text-text3">{ price && <Money data={ price } /> }</span>
                </div>
              </Link>
            )
          })

          return (
            <div className="flex flex-col gap-12">
              <div className="flex justify-center">
                <PreviousLink className="inline-flex items-center justify-center px-6 py-3 border border-border2 rounded-full text-sm font-medium text-text hover:bg-background2 hover:border-text transition-all">
                  { isLoading ? 'Loading...' : '↑ Load previous' }
                </PreviousLink>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12">
                { ItemsMarkup }
              </div>

              <div className="flex justify-center">
                <NextLink className="inline-flex items-center justify-center px-6 py-3 border border-border2 rounded-full text-sm font-medium text-text hover:bg-background2 hover:border-text transition-all">
                  { isLoading ? 'Loading...' : 'Load more ↓' }
                </NextLink>
              </div>
            </div>
          )
        } }
      </Pagination>
    </div>
  )
}

function SearchResultsEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 mb-6 rounded-full bg-background2 flex items-center justify-center text-text4">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
      <h3 className="text-xl font-medium text-text mb-2">No results found</h3>
      <p className="text-text3 max-w-md">Try checking your spelling or using different keywords to find what you're looking for.</p>
    </div>
  )
}
