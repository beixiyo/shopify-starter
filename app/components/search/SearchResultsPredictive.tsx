import type { Fetcher } from 'react-router'
import type { PredictiveSearchReturn } from '~/lib/search'
import { Image, Money } from '@shopify/hydrogen'
import * as React from 'react'
import { useEffect, useRef } from 'react'
import { Link, useFetcher } from 'react-router'
import { useAside } from '~/components/layout/Aside'
import {
  getEmptyPredictiveSearchResult,
  urlWithTrackingParams,
} from '~/lib/search'

type PredictiveSearchItems = PredictiveSearchReturn['result']['items']

type UsePredictiveSearchReturn = {
  term: React.MutableRefObject<string>
  total: number
  inputRef: React.MutableRefObject<HTMLInputElement | null>
  items: PredictiveSearchItems
  fetcher: Fetcher<PredictiveSearchReturn>
}

type SearchResultsPredictiveArgs = Pick<
  UsePredictiveSearchReturn,
  'term' | 'total' | 'inputRef' | 'items'
> & {
  state: Fetcher['state']
  closeSearch: () => void
}

type PartialPredictiveSearchResult<
  ItemType extends keyof PredictiveSearchItems,
  ExtraProps extends keyof SearchResultsPredictiveArgs = 'term' | 'closeSearch',
> = Pick<PredictiveSearchItems, ItemType>
  & Pick<SearchResultsPredictiveArgs, ExtraProps>

type SearchResultsPredictiveProps = {
  children: (args: SearchResultsPredictiveArgs) => React.ReactNode
}

/**
 * Component that renders predictive search results
 */
export function SearchResultsPredictive({
  children,
}: SearchResultsPredictiveProps) {
  const aside = useAside()
  const { term, inputRef, fetcher, total, items } = usePredictiveSearch()

  /*
   * Utility that resets the search input
   */
  function resetInput() {
    if (inputRef.current) {
      inputRef.current.blur()
      inputRef.current.value = ''
    }
  }

  /**
   * Utility that resets the search input and closes the search aside
   */
  function closeSearch() {
    resetInput()
    aside.close()
  }

  return children({
    items,
    closeSearch,
    inputRef,
    state: fetcher.state,
    term,
    total,
  })
}

SearchResultsPredictive.Articles = SearchResultsPredictiveArticles
SearchResultsPredictive.Collections = SearchResultsPredictiveCollections
SearchResultsPredictive.Pages = SearchResultsPredictivePages
SearchResultsPredictive.Products = SearchResultsPredictiveProducts
SearchResultsPredictive.Queries = SearchResultsPredictiveQueries
SearchResultsPredictive.Empty = SearchResultsPredictiveEmpty

function SearchResultsPredictiveArticles({
  term,
  articles,
  closeSearch,
}: PartialPredictiveSearchResult<'articles'>) {
  if (!articles.length)
    return null

  return (
    <div className="flex flex-col" key="articles">
      <h5 className="text-xs font-semibold text-text4 uppercase tracking-wider mb-2">Articles</h5>
      <ul className="flex flex-col">
        { articles.map((article) => {
          const articleUrl = urlWithTrackingParams({
            baseUrl: `/blogs/${article.blog.handle}/${article.handle}`,
            trackingParams: article.trackingParameters,
            term: term.current ?? '',
          })

          return (
            <li key={ article.id }>
              <Link
                onClick={ closeSearch }
                to={ articleUrl }
                className="group flex items-center gap-3 py-2.5 transition-opacity hover:opacity-80"
              >
                { article.image?.url
                  ? (
                      <div className="shrink-0 w-8 h-8 rounded-md overflow-hidden bg-background2">
                        <Image
                          alt={ article.image.altText ?? '' }
                          src={ article.image.url }
                          width={ 32 }
                          height={ 32 }
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )
                  : (
                      <div className="shrink-0 w-8 h-8 rounded-md bg-background2 flex items-center justify-center text-text4">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 1.5 } d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5L18.5 7H20a2 2 0 012 2v9a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    ) }
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-text truncate block">{ article.title }</span>
                </div>
              </Link>
            </li>
          )
        }) }
      </ul>
    </div>
  )
}

function SearchResultsPredictiveCollections({
  term,
  collections,
  closeSearch,
}: PartialPredictiveSearchResult<'collections'>) {
  if (!collections.length)
    return null

  return (
    <div className="flex flex-col" key="collections">
      <h5 className="text-xs font-semibold text-text4 uppercase tracking-wider mb-2">Collections</h5>
      <ul className="flex flex-col">
        { collections.map((collection) => {
          const collectionUrl = urlWithTrackingParams({
            baseUrl: `/collections/${collection.handle}`,
            trackingParams: collection.trackingParameters,
            term: term.current,
          })

          return (
            <li key={ collection.id }>
              <Link
                onClick={ closeSearch }
                to={ collectionUrl }
                className="group flex items-center gap-3 py-2.5 transition-opacity hover:opacity-80"
              >
                { collection.image?.url
                  ? (
                      <div className="shrink-0 w-8 h-8 rounded-md overflow-hidden bg-background2">
                        <Image
                          alt={ collection.image.altText ?? '' }
                          src={ collection.image.url }
                          width={ 32 }
                          height={ 32 }
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )
                  : (
                      <div className="shrink-0 w-8 h-8 rounded-md bg-background2 flex items-center justify-center text-text4">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 1.5 } d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                      </div>
                    ) }
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-text truncate block">{ collection.title }</span>
                </div>
              </Link>
            </li>
          )
        }) }
      </ul>
    </div>
  )
}

function SearchResultsPredictivePages({
  term,
  pages,
  closeSearch,
}: PartialPredictiveSearchResult<'pages'>) {
  if (!pages.length)
    return null

  return (
    <div className="flex flex-col" key="pages">
      <h5 className="text-xs font-semibold text-text4 uppercase tracking-wider mb-2">Pages</h5>
      <ul className="flex flex-col">
        { pages.map((page) => {
          const pageUrl = urlWithTrackingParams({
            baseUrl: `/pages/${page.handle}`,
            trackingParams: page.trackingParameters,
            term: term.current,
          })

          return (
            <li key={ page.id }>
              <Link
                onClick={ closeSearch }
                to={ pageUrl }
                className="group flex items-center justify-between py-2.5 transition-opacity hover:opacity-80"
              >
                <span className="text-sm font-medium text-text">{ page.title }</span>
                <svg className="w-3.5 h-3.5 text-text4 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-1 group-hover:translate-x-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </li>
          )
        }) }
      </ul>
    </div>
  )
}

function SearchResultsPredictiveProducts({
  term,
  products,
  closeSearch,
}: PartialPredictiveSearchResult<'products'>) {
  if (!products.length)
    return null

  return (
    <div className="flex flex-col" key="products">
      <h5 className="text-xs font-semibold text-text4 uppercase tracking-wider mb-2">Products</h5>
      <ul className="flex flex-col">
        { products.map((product) => {
          const productUrl = urlWithTrackingParams({
            baseUrl: `/products/${product.handle}`,
            trackingParams: product.trackingParameters,
            term: term.current,
          })

          const price = product?.selectedOrFirstAvailableVariant?.price
          const image = product?.selectedOrFirstAvailableVariant?.image
          return (
            <li key={ product.id }>
              <Link
                to={ productUrl }
                onClick={ closeSearch }
                className="group flex items-center gap-3 py-2.5 transition-opacity hover:opacity-80"
              >
                { image
                  ? (
                      <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-background2">
                        <Image
                          alt={ image.altText ?? '' }
                          src={ image.url }
                          width={ 40 }
                          height={ 40 }
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )
                  : (
                      <div className="shrink-0 w-10 h-10 rounded-md bg-background2 flex items-center justify-center text-text4">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 1.5 } d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    ) }
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium text-text truncate">{ product.title }</span>
                  <span className="text-xs text-text3 mt-0.5">{ price && <Money data={ price } /> }</span>
                </div>
              </Link>
            </li>
          )
        }) }
      </ul>
    </div>
  )
}

function SearchResultsPredictiveQueries({
  queries,
  queriesDatalistId,
}: PartialPredictiveSearchResult<'queries', never> & {
  queriesDatalistId: string
}) {
  if (!queries.length)
    return null

  return (
    <datalist id={ queriesDatalistId }>
      { queries.map((suggestion) => {
        if (!suggestion)
          return null

        return <option key={ suggestion.text } value={ suggestion.text } />
      }) }
    </datalist>
  )
}

function SearchResultsPredictiveEmpty({
  term,
}: {
  term: React.MutableRefObject<string>
}) {
  if (!term.current) {
    return null
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 mb-4 rounded-full bg-background2 flex items-center justify-center text-text4">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
        </svg>
      </div>
      <p className="text-sm text-text3">
        No results found for
        { ' ' }
        <q className="font-medium text-text">{ term.current }</q>
      </p>
    </div>
  )
}

/**
 * Hook that returns the predictive search results and fetcher and input ref.
 * @example
 * '''ts
 * const { items, total, inputRef, term, fetcher } = usePredictiveSearch();
 * '''
 */
function usePredictiveSearch(): UsePredictiveSearchReturn {
  const fetcher = useFetcher<PredictiveSearchReturn>({ key: 'search' })
  const term = useRef<string>('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  if (fetcher?.state === 'loading') {
    term.current = String(fetcher.formData?.get('q') || '')
  }

  // capture the search input element as a ref
  useEffect(() => {
    if (!inputRef.current) {
      inputRef.current = document.querySelector('input[type="search"]')
    }
  }, [])

  const { items, total }
    = fetcher?.data?.result ?? getEmptyPredictiveSearchResult()

  return { items, total, inputRef, term, fetcher }
}
