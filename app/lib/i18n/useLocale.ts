import type { I18nLocale } from '~/lib/i18n/i18n'
import { useRouteLoaderData } from 'react-router'
import { DEFAULT_LOCALE, localePath } from '~/lib/i18n/i18n'
import { createT } from '~/locales'

/**
 * 在客户端获取当前 locale
 *
 * 依赖 root loader 注入的 `selectedLocale`
 */
export function useLocale(): I18nLocale {
  const data = useRouteLoaderData<{ selectedLocale: I18nLocale }>('root')
  return data?.selectedLocale ?? DEFAULT_LOCALE
}

/**
 * 生成当前 locale 下的链接路径
 *
 * @example
 * ```tsx
 * const lp = useLocalePath()
 * <Link to={lp('/products/foo')}>...</Link>
 * ```
 */
export function useLocalePath() {
  const locale = useLocale()
  return (path: string) => localePath(path, locale)
}

/**
 * 获取当前 locale 的翻译函数
 *
 * @param ns - 默认 namespace，省略后续调用中的前缀
 *
 * @example
 * ```tsx
 * const t = useTranslation('common')
 * t('heroTitle')        // => 等价于 t('common.heroTitle')
 * t('other.key')        // => 仍可跨 namespace 访问
 * ```
 */
export function useTranslation(ns?: string) {
  const locale = useLocale()
  const t = createT(locale.language, locale.country)

  if (!ns)
    return t

  return (key: string): string =>
    key.includes('.') ? t(key) : t(`${ns}.${key}`)
}
