/**
 * Hydrogen 自部署 — 官方 Express Recipe 方案
 *
 * 仅用于 production 部署，开发请用 `pnpm dev`
 * 架构：@react-router/express createRequestHandler + createHydrogenContext
 * 无 Worker 模拟，无 globalThis.caches/fetch polyfill
 *
 * 对比：workers-server.mjs 使用 Worker 模拟架构
 */
import { createRequestHandler } from '@react-router/express'
import { createHydrogenContext, InMemoryCache } from '@shopify/hydrogen'
import compression from 'compression'
import express from 'express'
import morgan from 'morgan'
import { createCookieSessionStorage } from 'react-router'
import 'dotenv/config'

// ─── Config ──────────────────────────────────────────────────────────────────

const port = Number(process.env.PORT ?? 3000)
// eslint-disable-next-line antfu/no-top-level-await
const build = await import('./build/server/index.js')

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express()
app.use(compression())
app.disable('x-powered-by')
app.use(morgan('tiny'))
app.use(
  '/assets',
  express.static('build/client/assets', { immutable: true, maxAge: '1y' }),
)
app.use(express.static('build/client', { maxAge: '1h' }))

// ─── Request Handler ─────────────────────────────────────────────────────────

app.all('/{*splat}', async (req, res, next) => {
  try {
    const context = await getLoadContext(req)
    const handler = createRequestHandler({
      build,
      mode: 'production',
      getLoadContext: () => context,
    })
    return handler(req, res, next)
  }
  catch (error) {
    console.error('[SSR Error]', error)
    next(error)
  }
})

// ─── Cart Fragment（与 app/lib/fragments.ts 一致） ───────────────────────────

const CART_QUERY_FRAGMENT = `#graphql
  fragment Money on MoneyV2 { currencyCode amount }
  fragment CartLine on CartLine {
    id quantity
    attributes { key value }
    cost {
      totalAmount { ...Money }
      amountPerQuantity { ...Money }
      compareAtAmountPerQuantity { ...Money }
    }
    merchandise {
      ... on ProductVariant {
        id availableForSale
        compareAtPrice { ...Money }
        price { ...Money }
        requiresShipping title
        image { id url altText width height }
        product { handle title id vendor }
        selectedOptions { name value }
      }
    }
    parentRelationship { parent { id } }
  }
  fragment CartLineComponent on ComponentizableCartLine {
    id quantity
    attributes { key value }
    cost {
      totalAmount { ...Money }
      amountPerQuantity { ...Money }
      compareAtAmountPerQuantity { ...Money }
    }
    merchandise {
      ... on ProductVariant {
        id availableForSale
        compareAtPrice { ...Money }
        price { ...Money }
        requiresShipping title
        image { id url altText width height }
        product { handle title id vendor }
        selectedOptions { name value }
      }
    }
    lineComponents { ...CartLine }
  }
  fragment CartApiQuery on Cart {
    updatedAt id checkoutUrl totalQuantity note
    appliedGiftCards { id lastCharacters amountUsed { ...Money } }
    buyerIdentity {
      countryCode email phone
      customer { id email firstName lastName displayName }
    }
    lines(first: $numCartLines) {
      nodes { ...CartLine }
      nodes { ...CartLineComponent }
    }
    cost {
      subtotalAmount { ...Money }
      totalAmount { ...Money }
      totalDutyAmount { ...Money }
      totalTaxAmount { ...Money }
    }
    attributes { key value }
    discountCodes { code applicable }
  }
`

// ─── Hydrogen Context ────────────────────────────────────────────────────────

async function getLoadContext(req) {
  const env = process.env

  if (!env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is not set')
  }

  const url = new URL(
    req.originalUrl || req.url,
    `${req.protocol}://${req.get('host')}`,
  )
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null)
      continue
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v)
    }
    else {
      headers.set(key, value)
    }
  }
  const request = new Request(url.href, { method: req.method, headers })

  const session = await AppSession.init(request, [env.SESSION_SECRET])
  const i18n = getLocaleFromRequest(request)

  return createHydrogenContext({
    env,
    request,
    cache: new InMemoryCache(),
    waitUntil: null,
    session,
    i18n,
    cart: { queryFragment: CART_QUERY_FRAGMENT },
  })
}

// ─── AppSession（与 app/lib/session.ts 一致） ────────────────────────────────

class AppSession {
  isPending = false
  #sessionStorage
  #session

  constructor(sessionStorage, session) {
    this.#sessionStorage = sessionStorage
    this.#session = session
  }

  static async init(request, secrets) {
    const storage = createCookieSessionStorage({
      cookie: { name: 'session', httpOnly: true, path: '/', sameSite: 'lax', secrets },
    })
    const session = await storage
      .getSession(request.headers.get('Cookie'))
      .catch(() => storage.getSession())
    return new AppSession(storage, session)
  }

  get has() { return this.#session.has }
  get get() { return this.#session.get }
  get flash() { return this.#session.flash }
  get unset() { this.isPending = true; return this.#session.unset }
  get set() { this.isPending = true; return this.#session.set }
  destroy() { return this.#sessionStorage.destroySession(this.#session) }
  commit() { this.isPending = false; return this.#sessionStorage.commitSession(this.#session) }
}

// ─── i18n（与 app/lib/i18n/i18n.ts 一致） ───────────────────────────────────

const DEFAULT_LOCALE = { language: 'EN', country: 'US', pathPrefix: '', label: 'English (US)' }
const SUPPORTED_LOCALES = [
  DEFAULT_LOCALE,
  { language: 'JA', country: 'JP', pathPrefix: '/JA-JP', label: '日本語' },
]

const RE_LOCALE_PREFIX = /^[A-Z]{2}-[A-Z]{2}$/i
const RE_DATA_SUFFIX = /\.data$/

function getLocaleFromRequest(request) {
  const url = new URL(request.url)
  const firstPart = url.pathname.split('/').at(1)?.replace(RE_DATA_SUFFIX, '')?.toUpperCase() ?? null

  if (!firstPart || !RE_LOCALE_PREFIX.test(firstPart))
    return DEFAULT_LOCALE

  const pathPrefix = `/${firstPart}`
  const matched = SUPPORTED_LOCALES.find(l => l.pathPrefix.toUpperCase() === pathPrefix.toUpperCase())
  if (matched)
    return matched

  const [language, country] = firstPart.split('-')
  return { language, country, pathPrefix, label: `${language}-${country}` }
}

// ─── Start ───────────────────────────────────────────────────────────────────

const server = app.listen(port, () => {
  console.log(`\n  Hydrogen Express Recipe (production)`)
  console.log(`  → http://localhost:${port}\n`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const newPort = port + 1
    console.log(`Port ${port} in use, trying ${newPort}...`)
    server.listen(newPort)
  }
  else {
    throw err
  }
})
