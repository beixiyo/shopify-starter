import type {
  CountryCode as CustomerCountryCode,
  LanguageCode as CustomerLanguageCode,
} from '@shopify/hydrogen/customer-account-api-types'
import type {
  CountryCode as StorefrontCountryCode,
  LanguageCode as StorefrontLanguageCode,
} from '@shopify/hydrogen/storefront-api-types'

type LanguageCode = CustomerLanguageCode & StorefrontLanguageCode
type CountryCode = CustomerCountryCode & StorefrontCountryCode

export type I18nLocale = {
  language: LanguageCode
  country: CountryCode
  pathPrefix: string
  /** 用于 `<html lang>` 的 BCP 47 标签，如 `en-US`、`fr-CA` */
  label: string
}

/**
 * 默认 locale — 不带 URL 前缀
 *
 * 当 URL 无 locale 前缀时回退到此值
 */
export const DEFAULT_LOCALE: I18nLocale = {
  language: 'EN',
  country: 'US',
  pathPrefix: '',
  label: 'English (US)',
}

/**
 * 支持的 locale 列表
 *
 * 对应 Shopify Markets 中已激活的市场。
 * 新增市场时只需在此追加一项，路由和选择器会自动识别
 */
export const SUPPORTED_LOCALES: I18nLocale[] = [
  DEFAULT_LOCALE,
  { language: 'EN', country: 'CA', pathPrefix: '/EN-CA', label: 'English (Canada)' },
  { language: 'FR', country: 'CA', pathPrefix: '/FR-CA', label: 'Français (Canada)' },
  { language: 'FR', country: 'FR', pathPrefix: '/FR-FR', label: 'Français (France)' },
  { language: 'ZH', country: 'CN', pathPrefix: '/ZH-CN', label: '中文 (中国)' },
  { language: 'JA', country: 'JP', pathPrefix: '/JA-JP', label: '日本語' },
]

export const LOCALE_LABELS: Record<string, string> = {
  EN: 'EN',
  JA: 'JP',
  ZH: 'CN',
  FR: 'FR',
}

const RE_LOCALE_PREFIX = /^[A-Z]{2}-[A-Z]{2}$/i
const RE_DATA_SUFFIX = /\.data$/

/**
 * 从 URL 首段解析 locale 前缀
 *
 * React Router 的 `.data` 后缀需要先去除再匹配
 */
function getFirstPathPart(url: URL): string | null {
  return (
    url.pathname
      .split('/')
      .at(1)
      ?.replace(RE_DATA_SUFFIX, '')
      ?.toUpperCase() ?? null
  )
}

/**
 * 从请求 URL 解析 locale
 *
 * 规则：`/{LANGUAGE}-{COUNTRY}/...` → 匹配到 `SUPPORTED_LOCALES` 中的项则使用，否则回退 `DEFAULT_LOCALE`
 */
export function getLocaleFromRequest(request: Request): I18nLocale {
  const firstPathPart = getFirstPathPart(new URL(request.url))

  if (firstPathPart == null || !RE_LOCALE_PREFIX.test(firstPathPart)) {
    return DEFAULT_LOCALE
  }

  const pathPrefix = `/${firstPathPart}`
  const matched = SUPPORTED_LOCALES.find(
    l => l.pathPrefix.toUpperCase() === pathPrefix.toUpperCase(),
  )

  if (matched)
    return matched

  // URL 格式合法但不在支持列表 → 仍然解析，由 _locale.tsx 校验并 404
  type FromUrl = [LanguageCode, CountryCode]
  const [language, country] = firstPathPart.split('-') as FromUrl
  return { language, country, pathPrefix, label: `${language}-${country}` }
}

/**
 * 为给定 locale 生成带前缀的路径
 *
 * @example
 * ```ts
 * localePath('/products/foo', frCA) // → '/FR-CA/products/foo'
 * localePath('/products/foo', DEFAULT_LOCALE) // → '/products/foo'
 * ```
 */
export function localePath(path: string, locale: I18nLocale): string {
  return `${locale.pathPrefix}${path.startsWith('/') ? path : `/${path}`}`
}
