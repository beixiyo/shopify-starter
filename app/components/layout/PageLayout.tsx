import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated'
import { Suspense, useId } from 'react'
import { Await, Link } from 'react-router'
import { CartMain } from '~/components/cart/CartMain'
import { Aside } from '~/components/layout/Aside'
import { Footer } from '~/components/layout/Footer'
import { Header, HeaderMenu } from '~/components/layout/Header'
import {
  SEARCH_ENDPOINT,
  SearchFormPredictive,
} from '~/components/search/SearchFormPredictive'
import { SearchResultsPredictive } from '~/components/search/SearchResultsPredictive'
import { LocaleMismatchHintProvider } from '~/lib/i18n'

export function PageLayout({
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
  publicStoreDomain,
}: PageLayoutProps) {
  return (
    <LocaleMismatchHintProvider>
      <Aside.Provider>
        <CartAside cart={ cart } />
        <SearchAside />
        <MobileMenuAside header={ header } publicStoreDomain={ publicStoreDomain } />
        { header && (
          <Header
            header={ header }
            cart={ cart }
            isLoggedIn={ isLoggedIn }
            publicStoreDomain={ publicStoreDomain }
          />
        ) }
        <main className="pt-16 flex-1">{ children }</main>
        <Footer
          footer={ footer }
          header={ header }
          publicStoreDomain={ publicStoreDomain }
        />
      </Aside.Provider>
    </LocaleMismatchHintProvider>
  )
}

function CartAside({ cart }: { cart: PageLayoutProps['cart'] }) {
  return (
    <Aside type="cart" heading="CART">
      <Suspense fallback={ <p>Loading cart ...</p> }>
        <Await resolve={ cart }>
          { cart => <CartMain cart={ cart } layout="aside" /> }
        </Await>
      </Suspense>
    </Aside>
  )
}

function SearchAside() {
  const queriesDatalistId = useId()
  return (
    <Aside type="search" heading="SEARCH">
      <div className="flex flex-col h-full -mx-4 -my-4">
        <div className="px-4 shrink-0">
          <SearchFormPredictive className="relative flex items-center w-full mt-4">
            { ({ fetchResults, goToSearch, inputRef }) => (
              <>
                <div className="absolute left-3 text-text4 pointer-events-none">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
                <input
                  name="q"
                  onChange={ fetchResults }
                  onFocus={ fetchResults }
                  placeholder="Search products, articles..."
                  ref={ inputRef }
                  type="search"
                  list={ queriesDatalistId }
                  className="w-full h-10 pl-9 pr-4 bg-background2/50 border border-border rounded-lg text-sm text-text placeholder:text-text4 focus:border-border2 transition-colors"
                />
              </>
            ) }
          </SearchFormPredictive>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-gutter-stable hide-scroll">
          <SearchResultsPredictive>
            { ({ items, total, term, state, closeSearch }) => {
              const { articles, collections, pages, products, queries } = items

              if (state === 'loading' && term.current) {
                return (
                  <div className="flex justify-center py-12">
                    <div className="w-5 h-5 border-2 border-border2 border-t-text rounded-full animate-spin"></div>
                  </div>
                )
              }

              if (!total) {
                return <SearchResultsPredictive.Empty term={ term } />
              }

              return (
                <div className="flex flex-col gap-8 pb-4">
                  <SearchResultsPredictive.Queries
                    queries={ queries }
                    queriesDatalistId={ queriesDatalistId }
                  />
                  <SearchResultsPredictive.Products
                    products={ products }
                    closeSearch={ closeSearch }
                    term={ term }
                  />
                  <SearchResultsPredictive.Collections
                    collections={ collections }
                    closeSearch={ closeSearch }
                    term={ term }
                  />
                  <SearchResultsPredictive.Pages
                    pages={ pages }
                    closeSearch={ closeSearch }
                    term={ term }
                  />
                  <SearchResultsPredictive.Articles
                    articles={ articles }
                    closeSearch={ closeSearch }
                    term={ term }
                  />
                  { term.current && total
                    ? (
                      <div className="pt-2 border-t border-border2/50">
                        <Link
                          onClick={ closeSearch }
                          to={ `${SEARCH_ENDPOINT}?q=${term.current}` }
                          className="group flex items-center justify-between py-2 text-text text-sm font-medium hover:opacity-80 transition-opacity"
                        >
                          <span>
                            View all results for <q className="font-normal text-text3">{ term.current }</q>
                          </span>
                          <svg className="w-4 h-4 text-text4 group-hover:text-text transition-transform transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={ 2 } d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </Link>
                      </div>
                    )
                    : null }
                </div>
              )
            } }
          </SearchResultsPredictive>
        </div>
      </div>
    </Aside>
  )
}

function MobileMenuAside({
  header,
  publicStoreDomain,
}: {
  header: PageLayoutProps['header']
  publicStoreDomain: PageLayoutProps['publicStoreDomain']
}) {
  return (
    header.menu
    && header.shop.primaryDomain?.url && (
      <Aside type="mobile" heading="MENU">
        <HeaderMenu
          menu={ header.menu }
          viewport="mobile"
          primaryDomainUrl={ header.shop.primaryDomain.url }
          publicStoreDomain={ publicStoreDomain }
        />
      </Aside>
    )
  )
}

interface PageLayoutProps {
  cart: Promise<CartApiQueryFragment | null>
  footer: Promise<FooterQuery | null>
  header: HeaderQuery
  isLoggedIn: Promise<boolean>
  publicStoreDomain: string
  children?: React.ReactNode
}
