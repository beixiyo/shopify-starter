/**
 * 基于 JSON 文件的 i18n 资源加载
 *
 * 使用 `import.meta.glob` 同步导入所有 locale JSON，
 * 配合 VSCode i18n Ally 插件实现 key 提示、跳转、翻译预览
 *
 * @see https://github.com/lokalise/i18n-ally
 */

const DEFAULT_LOCALE_KEY = 'en-US'

/**
 * 用 import.meta.glob 一次性加载所有 locale 的 JSON 文件
 *
 * 路径格式: `./{locale}/{namespace}.json`
 */
const localeModules = import.meta.glob<Record<string, string>>(
  './**/*.json',
  { eager: true, import: 'default' },
)

/**
 * 解析后的资源结构: `{ 'en-US': { common: { key: value } }, ... }`
 */
const resources = buildResources(localeModules)

function buildResources(modules: Record<string, Record<string, string>>) {
  const result: Record<string, Record<string, Record<string, string>>> = {}

  for (const [filePath, content] of Object.entries(modules)) {
    // filePath: './en-US/common.json'
    const parts = filePath.replace('./', '').replace('.json', '').split('/')
    if (parts.length !== 2)
      continue

    const [locale, namespace] = parts
    result[locale] ??= {}
    result[locale][namespace] = content
  }

  return result
}

/**
 * 创建指定 locale 的翻译函数
 *
 * @example
 * ```ts
 * const t = createT('en', 'US')
 * t('common.heroTitle') // => 'Your everyday note-taking pen,...'
 * ```
 */
export function createT(language: string, country: string) {
  const localeKey = `${language.toLowerCase()}-${country}`
  const namespaces = resources[localeKey] ?? resources[DEFAULT_LOCALE_KEY] ?? {}

  /**
   * 通过 `namespace.key` 获取翻译文本，未匹配时返回 key 本身
   *
   * @param key - 格式为 `namespace.key`，如 `common.heroTitle`
   */
  return (key: string): string => {
    const [ns, ...rest] = key.split('.')
    const k = rest.join('.')
    return namespaces[ns]?.[k] ?? key
  }
}
