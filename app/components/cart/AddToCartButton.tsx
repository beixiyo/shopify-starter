import type { OptimisticCartLineInput } from '@shopify/hydrogen'
import type { FetcherWithComponents } from 'react-router'
import { CartForm } from '@shopify/hydrogen'

export function AddToCartButton({
  analytics,
  children,
  disabled,
  lines,
  onClick,
}: {
  analytics?: unknown
  children: React.ReactNode
  disabled?: boolean
  lines: Array<OptimisticCartLineInput>
  onClick?: () => void
}) {
  return (
    <CartForm route="/cart" inputs={ { lines } } action={ CartForm.ACTIONS.LinesAdd }>
      {(fetcher: FetcherWithComponents<any>) => (
        <>
          <input
            name="analytics"
            type="hidden"
            value={ JSON.stringify(analytics) }
          />
          <button
            type="submit"
            onClick={ onClick }
            disabled={ disabled ?? fetcher.state !== 'idle' }
            className="w-full rounded-lg bg-button py-3 px-6 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {children}
          </button>
        </>
      )}
    </CartForm>
  )
}
