import type { CartViewPayload } from '@shopify/hydrogen'
import type { CartApiQueryFragment, HeaderQuery } from 'storefrontapi.generated'
import {
  useAnalytics,
  useOptimisticCart,
} from '@shopify/hydrogen'
import { Suspense, useEffect, useState } from 'react'
import { Await, NavLink, useAsyncValue } from 'react-router'
import { useAside } from '~/components/layout/Aside'
import { LanguageSelector, MobileLanguageSwitcher } from '~/components/layout/LanguageSelector'

export function Header({
  header,
  isLoggedIn,
  cart,
  publicStoreDomain,
}: HeaderProps) {
  const { shop, menu } = header
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={ `
        fixed top-0 left-0 right-0 z-40
        h-16 flex items-center
        px-4 md:px-8 lg:px-12
        transition-all duration-300
        ${scrolled
      ? 'bg-background/95 backdrop-blur-md shadow-sm'
      : 'bg-background'
    }
      ` }
    >
      {/* Logo */ }
      <NavLink
        prefetch="intent"
        to="/"
        className="text-lg font-semibold tracking-tight text-text hover:no-underline shrink-0"
        end
      >
        { shop.name }
      </NavLink>

      {/* Desktop Nav */ }
      <HeaderMenu
        menu={ menu }
        viewport="desktop"
        primaryDomainUrl={ header.shop.primaryDomain.url }
        publicStoreDomain={ publicStoreDomain }
      />

      {/* CTAs */ }
      <HeaderCtas isLoggedIn={ isLoggedIn } cart={ cart } />
    </header>
  )
}

export function HeaderMenu({
  menu,
  primaryDomainUrl,
  viewport,
  publicStoreDomain,
}: {
  menu: HeaderProps['header']['menu']
  primaryDomainUrl: HeaderProps['header']['shop']['primaryDomain']['url']
  viewport: Viewport
  publicStoreDomain: HeaderProps['publicStoreDomain']
}) {
  const { close } = useAside()
  const isMobile = viewport === 'mobile'

  return (
    <nav
      className={
        isMobile
          ? 'flex flex-col gap-6 px-2 pt-4'
          : 'hidden md:flex items-center gap-8 ml-12'
      }
      role="navigation"
    >
      { isMobile && (
        <NavLink
          end
          onClick={ close }
          prefetch="intent"
          to="/"
          className="text-base font-medium text-text hover:text-brand transition-colors hover:no-underline"
        >
          Home
        </NavLink>
      ) }
      { (menu || FALLBACK_HEADER_MENU).items.map((item) => {
        if (!item.url)
          return null

        const url
          = item.url.includes('myshopify.com')
            || item.url.includes(publicStoreDomain)
            || item.url.includes(primaryDomainUrl)
            ? new URL(item.url).pathname
            : item.url

        return (
          <NavLink
            end
            key={ item.id }
            onClick={ close }
            prefetch="intent"
            to={ url }
            className={ ({ isActive, isPending }) => `
              text-sm font-medium transition-colors hover:no-underline
              ${isMobile ? 'text-base' : ''}
              ${isActive
            ? 'text-brand'
            : isPending
              ? 'text-text4'
              : 'text-text2 hover:text-text'
          }
            ` }
          >
            { item.title }
          </NavLink>
        )
      }) }

      { isMobile && <MobileLanguageSwitcher /> }
    </nav>
  )
}

function HeaderCtas({
  isLoggedIn,
  cart,
}: Pick<HeaderProps, 'isLoggedIn' | 'cart'>) {
  return (
    <nav className="flex items-center gap-4 ml-auto" role="navigation">
      <HeaderMenuMobileToggle />
      <LanguageSelector />
      <NavLink
        prefetch="intent"
        to="/account"
        className="hidden md:block text-sm font-medium text-text2 hover:text-text transition-colors hover:no-underline"
      >
        <Suspense fallback="Sign in">
          <Await resolve={ isLoggedIn } errorElement="Sign in">
            { isLoggedIn => (isLoggedIn ? 'Account' : 'Sign in') }
          </Await>
        </Suspense>
      </NavLink>
      <SearchToggle />
      <CartToggle cart={ cart } />
    </nav>
  )
}

function HeaderMenuMobileToggle() {
  const { open } = useAside()
  return (
    <button
      className="md:hidden -ml-2 text-text3 hover:text-text transition-colors"
      onClick={ () => open('mobile') }
      aria-label="Open menu"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 8h18M3 16h18" />
      </svg>
    </button>
  )
}

function SearchToggle() {
  const { open } = useAside()
  return (
    <button
      className="text-text3 hover:text-text transition-colors"
      onClick={ () => open('search') }
      aria-label="Search"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    </button>
  )
}

function CartBadge({ count }: { count: number }) {
  const { open } = useAside()
  const { publish, shop, cart, prevCart } = useAnalytics()

  return (
    <a
      href="/cart"
      className="relative text-text3 hover:text-text transition-colors"
      onClick={ (e) => {
        e.preventDefault()
        open('cart')
        publish('cart_viewed', {
          cart,
          prevCart,
          shop,
          url: window.location.href || '',
        } as CartViewPayload)
      } }
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
      { count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-semibold text-textSpecial bg-button rounded-full">
          { count }
        </span>
      ) }
    </a>
  )
}

function CartToggle({ cart }: Pick<HeaderProps, 'cart'>) {
  return (
    <Suspense fallback={ <CartBadge count={ 0 } /> }>
      <Await resolve={ cart }>
        <CartBanner />
      </Await>
    </Suspense>
  )
}

function CartBanner() {
  const originalCart = useAsyncValue() as CartApiQueryFragment | null
  const cart = useOptimisticCart(originalCart)
  return <CartBadge count={ cart?.totalQuantity ?? 0 } />
}

const FALLBACK_HEADER_MENU = {
  id: 'gid://shopify/Menu/199655587896',
  items: [
    {
      id: 'gid://shopify/MenuItem/461609500728',
      resourceId: null,
      tags: [],
      title: 'Collections',
      type: 'HTTP',
      url: '/collections',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609533496',
      resourceId: null,
      tags: [],
      title: 'Blog',
      type: 'HTTP',
      url: '/blogs/journal',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609566264',
      resourceId: null,
      tags: [],
      title: 'Policies',
      type: 'HTTP',
      url: '/policies',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461609599032',
      resourceId: 'gid://shopify/Page/92591030328',
      tags: [],
      title: 'About',
      type: 'PAGE',
      url: '/pages/about',
      items: [],
    },
  ],
}

interface HeaderProps {
  header: HeaderQuery
  cart: Promise<CartApiQueryFragment | null>
  isLoggedIn: Promise<boolean>
  publicStoreDomain: string
}

type Viewport = 'desktop' | 'mobile'
