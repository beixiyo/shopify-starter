import type { FooterQuery, HeaderQuery } from 'storefrontapi.generated'
import { Suspense } from 'react'
import { Await, NavLink } from 'react-router'

export function Footer({
  footer: footerPromise,
  header,
  publicStoreDomain,
}: FooterProps) {
  return (
    <Suspense>
      <Await resolve={ footerPromise }>
        {footer => (
          <footer className="bg-button mt-auto">
            <div className="mx-auto max-w-[1280px] px-4 md:px-8 lg:px-12 py-12 md:py-16">
              {/* Top: Brand + Nav */}
              <div className="flex flex-col gap-10 md:flex-row md:justify-between md:gap-16">
                {/* Brand */}
                <div className="shrink-0">
                  <h3 className="text-xl font-semibold text-textSpecial tracking-tight">
                    {header.shop.name}
                  </h3>
                  <p className="mt-2 text-sm text-textSpecial/50 max-w-xs leading-relaxed">
                    Beyond Audio, Write the Unspoken.
                  </p>
                </div>

                {/* Nav Links */}
                {footer?.menu && header.shop.primaryDomain?.url && (
                  <FooterMenu
                    menu={ footer.menu }
                    primaryDomainUrl={ header.shop.primaryDomain.url }
                    publicStoreDomain={ publicStoreDomain }
                  />
                )}
              </div>

              {/* Bottom: Copyright */}
              <div className="mt-12 pt-6 border-t border-textSpecial/10">
                <p className="text-xs text-textSpecial/30">
                  &copy;
                  {' '}
                  {new Date().getFullYear()}
                  {' '}
                  {header.shop.name}
                  . All rights reserved.
                </p>
              </div>
            </div>
          </footer>
        )}
      </Await>
    </Suspense>
  )
}

function FooterMenu({
  menu,
  primaryDomainUrl,
  publicStoreDomain,
}: {
  menu: FooterQuery['menu']
  primaryDomainUrl: FooterProps['header']['shop']['primaryDomain']['url']
  publicStoreDomain: string
}) {
  return (
    <nav className="flex flex-wrap gap-x-8 gap-y-3" role="navigation">
      {(menu || FALLBACK_FOOTER_MENU).items.map((item) => {
        if (!item.url)
          return null

        const url
          = item.url.includes('myshopify.com')
            || item.url.includes(publicStoreDomain)
            || item.url.includes(primaryDomainUrl)
            ? new URL(item.url).pathname
            : item.url

        const isExternal = !url.startsWith('/')

        return isExternal
          ? (
              <a
                href={ url }
                key={ item.id }
                rel="noopener noreferrer"
                target="_blank"
                className="text-sm text-textSpecial/60 hover:text-textSpecial transition-colors hover:no-underline"
              >
                {item.title}
              </a>
            )
          : (
              <NavLink
                end
                key={ item.id }
                prefetch="intent"
                to={ url }
                className={ ({ isActive }) =>
                  `text-sm transition-colors hover:no-underline ${
                    isActive ? 'text-textSpecial' : 'text-textSpecial/60 hover:text-textSpecial'
                  }` }
              >
                {item.title}
              </NavLink>
            )
      })}
    </nav>
  )
}

const FALLBACK_FOOTER_MENU = {
  id: 'gid://shopify/Menu/199655620664',
  items: [
    {
      id: 'gid://shopify/MenuItem/461633060920',
      resourceId: 'gid://shopify/ShopPolicy/23358046264',
      tags: [],
      title: 'Privacy Policy',
      type: 'SHOP_POLICY',
      url: '/policies/privacy-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633093688',
      resourceId: 'gid://shopify/ShopPolicy/23358013496',
      tags: [],
      title: 'Refund Policy',
      type: 'SHOP_POLICY',
      url: '/policies/refund-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633126456',
      resourceId: 'gid://shopify/ShopPolicy/23358111800',
      tags: [],
      title: 'Shipping Policy',
      type: 'SHOP_POLICY',
      url: '/policies/shipping-policy',
      items: [],
    },
    {
      id: 'gid://shopify/MenuItem/461633159224',
      resourceId: 'gid://shopify/ShopPolicy/23358079032',
      tags: [],
      title: 'Terms of Service',
      type: 'SHOP_POLICY',
      url: '/policies/terms-of-service',
      items: [],
    },
  ],
}

interface FooterProps {
  footer: Promise<FooterQuery | null>
  header: HeaderQuery
  publicStoreDomain: string
}
