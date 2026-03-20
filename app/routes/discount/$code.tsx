import type { Route } from './+types/$code'
import { redirect } from 'react-router'

/**
 * 自动应用在 URL 上找到的折扣
 * 如果购物车存在，则使用折扣更新购物车，否则创建一个已应用折扣的购物车
 *
 * @example
 * 应用折扣和可选重定向的示例路径（默认为主页）
 * ```js
 * /discount/FREESHIPPING?redirect=/products
 *
 * ```
 */
export async function loader({ request, context, params }: Route.LoaderArgs) {
  const { cart } = context
  const { code } = params

  const url = new URL(request.url)
  const searchParams = new URLSearchParams(url.search)
  let redirectParam
    = searchParams.get('redirect') || searchParams.get('return_to') || '/'

  if (redirectParam.includes('//')) {
    // 避免重定向到外部 URL，防止网络钓鱼攻击
    redirectParam = '/'
  }

  searchParams.delete('redirect')
  searchParams.delete('return_to')

  const redirectUrl = `${redirectParam}?${searchParams}`

  if (!code) {
    return redirect(redirectUrl)
  }

  const result = await cart.updateDiscountCodes([code])
  const headers = cart.setCartId(result.cart.id)

  // 如果域源有端口号 (:3000)，在 303 重定向上使用 set-cookie 将不起作用
  // 如果没有购物车 ID 并且在进行中创建了新的购物车 ID，它将不会在 localhost:3000 上的 cookie 中设置
  return redirect(redirectUrl, {
    status: 303,
    headers,
  })
}
