import { createHydrogenContext } from '@shopify/hydrogen'
import { CART_QUERY_FRAGMENT } from '~/lib/fragments'
import { getLocaleFromRequest } from '~/lib/i18n'
import { AppSession } from '~/lib/session'

// 定义额外的上下文对象
const additionalContext = {
  // 用于自定义属性、CMS 客户端、第三方 SDK 等的额外上下文。
  // 这些将作为 context.propertyName 和 context.get(propertyContext) 可用
  // 可以添加的复杂对象的示例：
  // cms: await createCMSClient(env),
  // reviews: await createReviewsClient(env),
} as const

// 自动使用额外的上下文类型增强 HydrogenAdditionalContext
type AdditionalContextType = typeof additionalContext

declare global {
  interface HydrogenAdditionalContext extends AdditionalContextType {}
}

/**
 * 为 React Router 7.9.x 创建 Hydrogen 上下文
 * 返回具有混合访问模式的 HydrogenRouterContextProvider
 */
export async function createHydrogenRouterContext(
  request: Request,
  env: Env,
  executionContext: ExecutionContext,
) {
  /**
   * 在工作线程中打开缓存实例和自定义会话实例。
   */
  if (!env?.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is not set')
  }

  const waitUntil = executionContext.waitUntil.bind(executionContext)
  const [cache, session] = await Promise.all([
    caches.open('hydrogen'),
    AppSession.init(request, [env.SESSION_SECRET]),
  ])

  const hydrogenContext = createHydrogenContext(
    {
      env,
      request,
      cache,
      waitUntil,
      session,
      // 或根据区域设置子路径、cookies 或任何其他策略从 URL 路径检测
      i18n: getLocaleFromRequest(request),
      cart: {
        queryFragment: CART_QUERY_FRAGMENT,
      },
    },
    additionalContext,
  )

  return hydrogenContext
}
