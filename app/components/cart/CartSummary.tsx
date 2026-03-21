import type { OptimisticCart } from '@shopify/hydrogen'
import type { CartApiQueryFragment } from 'storefrontapi.generated'
import type { CartLayout } from '~/components/cart/CartMain'
import { CartForm, Money } from '@shopify/hydrogen'
import { useEffect, useId, useRef, useState } from 'react'
import { useFetcher } from 'react-router'

type CartSummaryProps = {
  cart: OptimisticCart<CartApiQueryFragment | null>
  layout: CartLayout
}

export function CartSummary({ cart, layout }: CartSummaryProps) {
  const summaryId = useId()
  const discountsHeadingId = useId()
  const discountCodeInputId = useId()
  const giftCardHeadingId = useId()
  const giftCardInputId = useId()

  return (
    <div
      aria-labelledby={ summaryId }
      className={ `mt-8 border-t border-border pt-8 ${layout === 'aside' ? '' : 'max-w-md ml-auto'}` }
    >
      <h4 id={ summaryId } className="text-lg font-semibold text-text mb-4">Totals</h4>
      <dl className="flex items-center justify-between text-sm">
        <dt className="text-text2">Subtotal</dt>
        <dd className="font-medium text-text">
          {cart?.cost?.subtotalAmount?.amount
            ? <Money data={ cart?.cost?.subtotalAmount } />
            : '-'}
        </dd>
      </dl>
      <CartDiscounts
        discountCodes={ cart?.discountCodes }
        discountsHeadingId={ discountsHeadingId }
        discountCodeInputId={ discountCodeInputId }
      />
      <CartGiftCard
        giftCardCodes={ cart?.appliedGiftCards }
        giftCardHeadingId={ giftCardHeadingId }
        giftCardInputId={ giftCardInputId }
      />
      <CartCheckoutActions checkoutUrl={ cart?.checkoutUrl } />
    </div>
  )
}

function CartCheckoutActions({ checkoutUrl }: { checkoutUrl?: string }) {
  if (!checkoutUrl)
    return null

  return (
    <div className="mt-6">
      <a
        href={ checkoutUrl }
        target="_self"
        className="flex w-full items-center justify-center rounded-lg bg-button py-3 px-6 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        Continue to Checkout &rarr;
      </a>
    </div>
  )
}

function CartDiscounts({
  discountCodes,
  discountsHeadingId,
  discountCodeInputId,
}: {
  discountCodes?: CartApiQueryFragment['discountCodes']
  discountsHeadingId: string
  discountCodeInputId: string
}) {
  const codes: string[]
    = discountCodes
      ?.filter(discount => discount.applicable)
      ?.map(({ code }) => code) || []

  return (
    <section aria-label="Discounts" className="mt-4">
      <dl hidden={ !codes.length }>
        <div className="flex items-center justify-between text-sm">
          <dt id={ discountsHeadingId } className="text-text2">Discounts</dt>
          <UpdateDiscountForm>
            <div
              role="group"
              aria-labelledby={ discountsHeadingId }
              className="flex items-center gap-2"
            >
              <code className="rounded bg-background3 px-2 py-0.5 text-xs font-medium text-text">
                {codes?.join(', ')}
              </code>
              <button
                type="submit"
                aria-label="Remove discount"
                className="text-xs text-text3 hover:text-danger transition-colors"
              >
                Remove
              </button>
            </div>
          </UpdateDiscountForm>
        </div>
      </dl>

      <UpdateDiscountForm discountCodes={ codes }>
        <div className="flex gap-2 mt-3">
          <label htmlFor={ discountCodeInputId } className="sr-only">
            Discount code
          </label>
          <input
            id={ discountCodeInputId }
            type="text"
            name="discountCode"
            placeholder="Discount code"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text3 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <button
            type="submit"
            aria-label="Apply discount code"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-background3"
          >
            Apply
          </button>
        </div>
      </UpdateDiscountForm>
    </section>
  )
}

function UpdateDiscountForm({
  discountCodes,
  children,
}: {
  discountCodes?: string[]
  children: React.ReactNode
}) {
  return (
    <CartForm
      route="/cart"
      action={ CartForm.ACTIONS.DiscountCodesUpdate }
      inputs={ {
        discountCodes: discountCodes || [],
      } }
    >
      {children}
    </CartForm>
  )
}

function CartGiftCard({
  giftCardCodes,
  giftCardHeadingId,
  giftCardInputId,
}: {
  giftCardCodes: CartApiQueryFragment['appliedGiftCards'] | undefined
  giftCardHeadingId: string
  giftCardInputId: string
}) {
  const giftCardCodeInput = useRef<HTMLInputElement>(null)
  const removeButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const previousCardIdsRef = useRef<string[]>([])
  const giftCardAddFetcher = useFetcher({ key: 'gift-card-add' })
  const [removedCardIndex, setRemovedCardIndex] = useState<number | null>(null)

  useEffect(() => {
    if (giftCardAddFetcher.data) {
      if (giftCardCodeInput.current !== null) {
        giftCardCodeInput.current.value = ''
      }
    }
  }, [giftCardAddFetcher.data])

  useEffect(() => {
    const currentCardIds = giftCardCodes?.map(card => card.id) || []

    if (removedCardIndex !== null && giftCardCodes) {
      const focusTargetIndex = Math.min(
        removedCardIndex,
        giftCardCodes.length - 1,
      )
      const focusTargetCard = giftCardCodes[focusTargetIndex]
      const focusButton = focusTargetCard
        ? removeButtonRefs.current.get(focusTargetCard.id)
        : null

      if (focusButton) {
        focusButton.focus()
      }
      else if (giftCardCodeInput.current) {
        giftCardCodeInput.current.focus()
      }

      setRemovedCardIndex(null)
    }

    previousCardIdsRef.current = currentCardIds
  }, [giftCardCodes, removedCardIndex])

  const handleRemoveClick = (cardId: string) => {
    const index = previousCardIdsRef.current.indexOf(cardId)
    if (index !== -1) {
      setRemovedCardIndex(index)
    }
  }

  return (
    <section aria-label="Gift cards" className="mt-4">
      {giftCardCodes && giftCardCodes.length > 0 && (
        <dl>
          <dt id={ giftCardHeadingId } className="text-sm text-text2 mb-2">Applied Gift Card(s)</dt>
          {giftCardCodes.map(giftCard => (
            <dd key={ giftCard.id } className="flex items-center gap-2 text-sm mb-1">
              <RemoveGiftCardForm
                giftCardId={ giftCard.id }
                lastCharacters={ giftCard.lastCharacters }
                onRemoveClick={ () => handleRemoveClick(giftCard.id) }
                buttonRef={ (el: HTMLButtonElement | null) => {
                  if (el) {
                    removeButtonRefs.current.set(giftCard.id, el)
                  }
                  else {
                    removeButtonRefs.current.delete(giftCard.id)
                  }
                } }
              >
                <code className="rounded bg-background3 px-2 py-0.5 text-xs font-medium text-text">
                  ***
                  {giftCard.lastCharacters}
                </code>
                <span className="text-text2">
                  <Money data={ giftCard.amountUsed } />
                </span>
              </RemoveGiftCardForm>
            </dd>
          ))}
        </dl>
      )}

      <AddGiftCardForm fetcherKey="gift-card-add">
        <div className="flex gap-2 mt-3">
          <label htmlFor={ giftCardInputId } className="sr-only">
            Gift card code
          </label>
          <input
            id={ giftCardInputId }
            type="text"
            name="giftCardCode"
            placeholder="Gift card code"
            ref={ giftCardCodeInput }
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text placeholder:text-text3 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <button
            type="submit"
            disabled={ giftCardAddFetcher.state !== 'idle' }
            aria-label="Apply gift card code"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-background3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </div>
      </AddGiftCardForm>
    </section>
  )
}

function AddGiftCardForm({
  fetcherKey,
  children,
}: {
  fetcherKey?: string
  children: React.ReactNode
}) {
  return (
    <CartForm
      fetcherKey={ fetcherKey }
      route="/cart"
      action={ CartForm.ACTIONS.GiftCardCodesAdd }
    >
      {children}
    </CartForm>
  )
}

function RemoveGiftCardForm({
  giftCardId,
  lastCharacters,
  children,
  onRemoveClick,
  buttonRef,
}: {
  giftCardId: string
  lastCharacters: string
  children: React.ReactNode
  onRemoveClick?: () => void
  buttonRef?: (el: HTMLButtonElement | null) => void
}) {
  return (
    <CartForm
      route="/cart"
      action={ CartForm.ACTIONS.GiftCardCodesRemove }
      inputs={ {
        giftCardCodes: [giftCardId],
      } }
    >
      <div className="flex items-center gap-2">
        {children}
        <button
          type="submit"
          aria-label={ `Remove gift card ending in ${lastCharacters}` }
          onClick={ onRemoveClick }
          ref={ buttonRef }
          className="text-xs text-text3 hover:text-danger transition-colors"
        >
          Remove
        </button>
      </div>
    </CartForm>
  )
}
