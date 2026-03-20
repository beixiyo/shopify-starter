import { NonceProvider } from '@shopify/hydrogen'
import { startTransition, StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { HydratedRouter } from 'react-router/dom'

if (!window.location.origin.includes('webcache.googleusercontent.com')) {
  startTransition(() => {
    // 从现有脚本标签中提取 nonce
    const existingNonce
      = document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce

    hydrateRoot(
      document,
      <StrictMode>
        <NonceProvider value={ existingNonce }>
          <HydratedRouter />
        </NonceProvider>
      </StrictMode>,
    )
  })
}
