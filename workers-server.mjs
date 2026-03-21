/**
 * Hydrogen 自部署 Express 服务器（Worker 模拟方案）
 *
 * 仅用于 production 部署，开发请用 `pnpm dev`
 * 兼容 CF Workers 构建产物（双重部署：Express + Cloudflare）
 */
import { InMemoryCache } from '@shopify/hydrogen'
import compression from 'compression'
import express from 'express'
import morgan from 'morgan'
import 'dotenv/config'

// ─── Polyfills ───────────────────────────────────────────────────────────────

// Cache API — 使用 Hydrogen 官方 InMemoryCache
if (!globalThis.caches) {
  const hydrogenCache = new InMemoryCache()
  globalThis.caches = {
    open: async () => hydrogenCache,
    delete: async () => false,
    has: async () => false,
    keys: async () => [],
    match: async () => undefined,
  }
}

// fetch duplex — Node.js 的 fetch 对有 body 的请求需要 duplex: 'half'
const nativeFetch = globalThis.fetch.bind(globalThis)
globalThis.fetch = (input, init) => {
  if (input instanceof Request && (!init || Object.keys(init).length === 0)) {
    if (input.method !== 'GET' && input.method !== 'HEAD') {
      return nativeFetch(new Request(input, { duplex: 'half' }))
    }
    return nativeFetch(input)
  }
  if (init?.body && !init.duplex) {
    return nativeFetch(input, { ...init, duplex: 'half' })
  }
  return nativeFetch(input, init)
}

// ─── Config ──────────────────────────────────────────────────────────────────

const port = Number(process.env.PORT ?? 3000)

const executionContext = {
  waitUntil: () => {},
  passThroughOnException: () => {},
}

// ─── Worker ──────────────────────────────────────────────────────────────────

const { default: worker } = await import('./dist/server/index.js')

// ─── Express App ─────────────────────────────────────────────────────────────

const app = express()
app.use(compression())
app.disable('x-powered-by')
app.use(morgan('tiny'))
app.use(
  '/assets',
  express.static('dist/client/assets', { immutable: true, maxAge: '1y' }),
)
app.use(express.static('dist/client', { maxAge: '1h' }))

// ─── Request Handler ─────────────────────────────────────────────────────────

app.all('/{*splat}', async (req, res) => {
  try {
    const origin = `${req.protocol}://${req.get('host')}`
    const url = new URL(req.originalUrl || req.url, origin).toString()
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

    const init = { method: req.method, headers }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = await collectBody(req)
    }

    const request = new Request(url, init)
    const response = await worker.fetch(request, process.env, executionContext)

    res.status(response.status)
    response.headers.forEach((value, key) => res.setHeader(key, value))

    if (!response.body) {
      res.end()
      return
    }
    for await (const chunk of response.body) {
      res.write(chunk)
    }
    res.end()
  }
  catch (error) {
    console.error('[SSR Error]', error)
    res.status(500).send('Internal Server Error')
  }
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function collectBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

// ─── Start ───────────────────────────────────────────────────────────────────

const server = app.listen(port, () => {
  console.log(`\n  Hydrogen Worker-compat server`)
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
