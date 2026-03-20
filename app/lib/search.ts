import type {
  PredictiveSearchQuery,
  RegularSearchQuery,
} from 'storefrontapi.generated'

type ResultWithItems<Type extends 'predictive' | 'regular', Items> = {
  type: Type
  term: string
  error?: string
  result: { total: number, items: Items }
}

export type RegularSearchReturn = ResultWithItems<
  'regular',
  RegularSearchQuery
>
export type PredictiveSearchReturn = ResultWithItems<
  'predictive',
  NonNullable<PredictiveSearchQuery['predictiveSearch']>
>

/**
 * 返回预测搜索结果的空状态以重置搜索状态。
 */
export function getEmptyPredictiveSearchResult(): PredictiveSearchReturn['result'] {
  return {
    total: 0,
    items: {
      articles: [],
      collections: [],
      products: [],
      pages: [],
      queries: [],
    },
  }
}

interface UrlWithTrackingParams {
  /** 将追踪参数追加到的基础 URL。 */
  baseUrl: string
  /** Storefront API 返回的追踪参数。 */
  trackingParams?: string | null
  /** 要追加到 URL 的任何其他查询参数。 */
  params?: Record<string, string>
  /** 要追加到 URL 的搜索词。 */
  term: string
}

/**
 * 将追踪参数追加到 URL 的实用函数。追踪参数由 Shopify 内部使用，
 * 用于增强搜索结果和管理员仪表盘。
 * @example
 * ```ts
 * const baseUrl = 'www.example.com';
 * const trackingParams = 'utm_source=shopify&utm_medium=shopify_app&utm_campaign=storefront';
 * const params = { foo: 'bar' };
 * const term = 'search term';
 * const url = urlWithTrackingParams({ baseUrl, trackingParams, params, term });
 * console.log(url);
 * // 输出: 'https://www.example.com?foo=bar&q=search%20term&utm_source=shopify&utm_medium=shopify_app&utm_campaign=storefront'
 * ```
 */
export function urlWithTrackingParams({
  baseUrl,
  trackingParams,
  params: extraParams,
  term,
}: UrlWithTrackingParams) {
  let search = new URLSearchParams({
    ...extraParams,
    q: encodeURIComponent(term),
  }).toString()

  if (trackingParams) {
    search = `${search}&${trackingParams}`
  }

  return `${baseUrl}?${search}`
}
