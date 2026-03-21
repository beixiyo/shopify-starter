import type { HydrogenRouterContextProvider } from '@shopify/hydrogen'
import type { EntryContext } from 'react-router'
/**
 * Express 自部署专用 SSR 入口
 *
 * 使用 Node.js 原生 renderToPipeableStream + PassThrough，
 * 避免 renderToReadableStream 在 Node.js 上的 abort 竞态问题。
 * Workers / Cloudflare 仍使用 entry.server.tsx（renderToReadableStream）
 */
import { PassThrough } from 'node:stream'
import { createReadableStreamFromReadable } from '@react-router/node'
import { createContentSecurityPolicy } from '@shopify/hydrogen'
import { isbot } from 'isbot'
// @ts-expect-error 从 server.node 导入，绕过 vite alias（react-dom/server → server.browser）
import { renderToPipeableStream } from 'react-dom/server.node'
import { ServerRouter } from 'react-router'

const ABORT_DELAY = 8_000

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: HydrogenRouterContextProvider,
) {
  const isDev = process.env.NODE_ENV === 'development'

  const { nonce, header, NonceProvider } = createContentSecurityPolicy({
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
    ...(isDev && {
      connectSrc: ['\'self\'', 'https://www.react-grab.com'],
      styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://fonts.googleapis.com'],
      fontSrc: ['\'self\'', 'https://fonts.gstatic.com'],
    }),
  })

  const bot = isbot(request.headers.get('user-agent'))

  return new Promise((resolve, reject) => {
    let shellRendered = false

    const { pipe, abort } = renderToPipeableStream(
      <NonceProvider>
        <ServerRouter
          context={ reactRouterContext }
          url={ request.url }
          nonce={ nonce }
        />
      </NonceProvider>,
      {
        nonce,
        [bot ? 'onAllReady' : 'onShellReady']() {
          shellRendered = true
          const body = new PassThrough()
          const stream = createReadableStreamFromReadable(body)

          responseHeaders.set('Content-Type', 'text/html')
          responseHeaders.set('Content-Security-Policy', header)

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          )

          pipe(body)
        },
        onShellError(error: unknown) {
          reject(error)
        },
        onError(error: unknown) {
          responseStatusCode = 500
          if (shellRendered) {
            console.error(error)
          }
        },
      },
    )

    setTimeout(abort, ABORT_DELAY)
  })
}
