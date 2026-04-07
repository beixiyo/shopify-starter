import type { ShouldRevalidateFunction } from 'react-router'
import type { Route } from './+types/root'
import type { I18nLocale } from '~/lib/i18n'
import { Analytics, getShopAnalytics, useNonce } from '@shopify/hydrogen'
import { lazy } from 'react'
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,

  useRouteError,
  useRouteLoaderData,
} from 'react-router'
import favicon from '~/assets/favicon.svg'
import { FOOTER_QUERY, HEADER_QUERY } from '~/lib/fragments'
import { SUPPORTED_LOCALES } from '~/lib/i18n'
import { PageLayout } from './components/layout/PageLayout'
import baseStyles from './styles/css/index.css?url'

export type RootLoader = typeof loader

/**
 * 这很重要，以避免在子导航上重新获取根查询
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
}) => {
  // 执行变更时重新验证，例如添加到购物车、登录...
  if (formMethod && formMethod !== 'GET')
    return true

  // 通过 useRevalidator 手动重新验证时重新验证
  if (currentUrl.toString() === nextUrl.toString())
    return true

  // 默认不对根加载器数据进行重新验证以提高性能。
  // 使用此功能时，您的 UI 可能会与服务器不同步的风险。
  // 谨慎使用。如果您对此优化不满意，请更新下面的行到 `return defaultShouldRevalidate` 。
  // 更多详情请参阅：https://remix.run/docs/en/main/route/should-revalidate
  return false
}

/**
 * 主样式表和重置样式表在 Layout 组件中添加
 * 以防止开发 HMR 更新中的 bug。
 *
 * 这避免了编辑后导航到另一个页面时发生的 "failed to execute 'insertBefore' on 'Node'" 错误。
 *
 * 这是一个临时修复，直到问题被解决。
 * https://github.com/remix-run/remix/issues/9242
 */
export function links() {
  return [
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
    { rel: 'icon', type: 'image/svg+xml', href: favicon },
  ]
}

export async function loader(args: Route.LoaderArgs) {
  // 开始获取非关键数据而不阻止首字节时间
  const deferredData = loadDeferredData(args)

  // 等待呈现页面初始状态所需的关键数据
  const criticalData = await loadCriticalData(args)

  const { storefront, env } = args.context
  const selectedLocale = storefront.i18n as I18nLocale
  const url = new URL(args.request.url)

  return {
    ...deferredData,
    ...criticalData,
    selectedLocale,
    urlOrigin: url.origin,
    urlPathname: url.pathname,
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    shop: getShopAnalytics({
      storefront,
      publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
    }),
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      withPrivacyBanner: false,
      // localize the privacy banner
      country: args.context.storefront.i18n.country,
      language: args.context.storefront.i18n.language,
    },
  }
}

/**
 * 加载呈现折叠线以上内容所需的数据。这是呈现页面所需的关键数据。
 * 如果不可用，整个页面应该返回 400 或 500 错误。
 */
async function loadCriticalData({ context }: Route.LoaderArgs) {
  const { storefront } = context

  const [header] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'main-menu', // 调整为你的header菜单句柄
      },
    }),
    // 在这里添加其他查询，以便它们并行加载
  ])

  return { header }
}

/**
 * 加载呈现折叠线以下内容所需的数据。这个数据是延迟的，将在初始页面加载后获取。
 * 如果不可用，页面仍应返回 200。确保不要在这里抛出任何错误，因为它会导致页面返回 500。
 */
function loadDeferredData({ context }: Route.LoaderArgs) {
  const { storefront, customerAccount, cart } = context

  // 延迟footer查询（折叠线以下）
  const footer = storefront
    .query(FOOTER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        footerMenuHandle: 'footer', // 调整为你的footer菜单句柄
      },
    })
    .catch((error: Error) => {
      // 记录查询错误，但不要抛出它们，以便页面仍然可以呈现
      console.error(error)
      return null
    })
  return {
    cart: cart.get(),
    isLoggedIn: customerAccount.isLoggedIn(),
    footer,
  }
}

export function Layout({ children }: { children?: React.ReactNode }) {
  const nonce = useNonce()
  const data = useRouteLoaderData<RootLoader>('root')
  const locale = data?.selectedLocale
  const hreflangLinks = data ? buildHreflangLinks(data.urlOrigin, data.urlPathname, locale) : []

  return (
    <html lang={ locale ? `${locale.language.toLowerCase()}-${locale.country}` : 'en' }>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Marcellus&family=Merriweather:wght@300;400;700&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href={ baseStyles }></link>
        { hreflangLinks.map(({ hrefLang, href }) => (
          <link key={ hrefLang } rel="alternate" hrefLang={ hrefLang } href={ href } />
        )) }
        <Meta />
        <Links />
      </head>
      <body>
        { children }
        <ScrollRestoration nonce={ nonce } />
        <Scripts nonce={ nonce } />
      </body>
    </html>
  )
}

const DevAgentation = import.meta.env.DEV
  ? lazy(() => import('agentation').then(m => ({ default: m.Agentation })))
  : () => null

export default function App() {
  const data = useRouteLoaderData<RootLoader>('root')

  if (!data) {
    return <Outlet />
  }

  return (
    <Analytics.Provider
      cart={ data.cart }
      shop={ data.shop }
      consent={ data.consent }
    >
      <DevAgentation />

      <PageLayout { ...data }>
        <Outlet />
      </PageLayout>
    </Analytics.Provider>
  )
}

/**
 * 为所有支持的 locale 生成 hreflang alternate 链接
 *
 * 输出包含各 locale 的 alternate 以及一个 `x-default` 指向默认 locale
 */
function buildHreflangLinks(
  origin: string,
  pathname: string,
  currentLocale?: I18nLocale,
) {
  // 去掉当前 locale 前缀，得到裸路径
  const prefix = currentLocale?.pathPrefix ?? ''
  const barePath = prefix && pathname.toLowerCase().startsWith(prefix.toLowerCase())
    ? pathname.slice(prefix.length) || '/'
    : pathname

  return [
    ...SUPPORTED_LOCALES.map(l => ({
      hrefLang: `${l.language.toLowerCase()}-${l.country}`,
      href: `${origin}${l.pathPrefix}${barePath === '/' ? '' : barePath}`,
    })),
    {
      hrefLang: 'x-default',
      href: `${origin}${barePath === '/' ? '' : barePath}` || origin,
    },
  ]
}

export function ErrorBoundary() {
  const error = useRouteError()
  let errorMessage = 'Unknown error'
  let errorStatus = 500

  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data
    errorStatus = error.status
  }
  else if (error instanceof Error) {
    errorMessage = error.message
  }

  return (
    <div className="route-error">
      <h1>Oops</h1>
      <h2>{ errorStatus }</h2>
      { errorMessage && (
        <fieldset>
          <pre>{ errorMessage }</pre>
        </fieldset>
      ) }
    </div>
  )
}
