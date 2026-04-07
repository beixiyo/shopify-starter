import type { LanguageCode } from '@shopify/hydrogen/storefront-api-types'
import type { ReactNode } from 'react'
import {
  createContext,
  createElement,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { SUPPORTED_LOCALES } from '~/lib/i18n/i18n'
import { useLocale } from '~/lib/i18n/useLocale'

const SESSION_KEY = 'flowtica-locale-hint-dismissed'

/** BCP 47 主语言 → 本站已上架的 Shopify LanguageCode */
const PRIMARY_TO_LANGUAGE: Record<string, LanguageCode> = {
  en: 'EN',
  ja: 'JA',
  zh: 'ZH',
  fr: 'FR',
}

function readBrowserPreferredSupportedLanguage(): LanguageCode | null {
  if (typeof navigator === 'undefined')
    return null

  const candidates = navigator.languages?.length
    ? navigator.languages
    : [navigator.language]

  for (const tag of candidates) {
    const primary = tag?.split('-')[0]?.toLowerCase()
    if (!primary)
      continue
    const code = PRIMARY_TO_LANGUAGE[primary]
    if (code && SUPPORTED_LOCALES.some(l => l.language === code))
      return code
  }
  return null
}

type LocaleMismatchHintValue = {
  showHint: boolean
  dismiss: () => void
}

const LocaleMismatchHintContext = createContext<LocaleMismatchHintValue | null>(null)

/**
 * 提供浏览器语言与当前页面语言不一致时的提示状态（桌面语言下拉 + 移动端菜单共用）
 */
export function LocaleMismatchHintProvider({ children }: { children: ReactNode }) {
  const { language: pageLanguage } = useLocale()
  const [clientReady, setClientReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      setDismissed(sessionStorage.getItem(SESSION_KEY) === '1')
      setClientReady(true)
    })
  }, [])

  const showHint = useMemo(() => {
    if (!clientReady || dismissed)
      return false
    const preferred = readBrowserPreferredSupportedLanguage()
    return preferred != null && preferred !== pageLanguage
  }, [clientReady, dismissed, pageLanguage])

  const dismiss = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, '1')
    setDismissed(true)
  }, [])

  const value = useMemo(
    () => ({ showHint, dismiss }),
    [dismiss, showHint],
  )

  return createElement(LocaleMismatchHintContext, { value }, children)
}

export function useLocaleMismatchHint(): LocaleMismatchHintValue {
  const ctx = use(LocaleMismatchHintContext)
  if (ctx == null) {
    throw new Error(
      'useLocaleMismatchHint must be used within LocaleMismatchHintProvider',
    )
  }
  return ctx
}
