import type { SelectedOption } from '@shopify/hydrogen/storefront-api-types'
import { useMemo } from 'react'
import { useLocation } from 'react-router'

export function useVariantUrl(
  handle: string,
  selectedOptions?: SelectedOption[],
) {
  const { pathname } = useLocation()

  return useMemo(() => {
    return getVariantUrl({
      handle,
      pathname,
      searchParams: new URLSearchParams(),
      selectedOptions,
    })
  }, [handle, selectedOptions, pathname])
}

const RE_LOCALE_PATHNAME = /(\/[a-zA-Z]{2}-[a-zA-Z]{2}\/)/g

export function getVariantUrl({
  handle,
  pathname,
  searchParams,
  selectedOptions,
}: {
  handle: string
  pathname: string
  searchParams: URLSearchParams
  selectedOptions?: SelectedOption[]
}) {
  RE_LOCALE_PATHNAME.lastIndex = 0
  const match = RE_LOCALE_PATHNAME.exec(pathname)
  const isLocalePathname = match && match.length > 0

  const path = isLocalePathname
    ? `${match![0]}products/${handle}`
    : `/products/${handle}`

  selectedOptions?.forEach((option) => {
    searchParams.set(option.name, option.value)
  })

  const searchString = searchParams.toString()

  return path + (searchString ? `?${searchParams.toString()}` : '')
}
