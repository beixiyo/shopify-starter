import type { LoaderFunctionArgs } from '@shopify/remix-oxygen'

export async function loader({ params, context }: LoaderFunctionArgs) {
  const { language, country } = context.storefront.i18n

  if (
    params.locale
    && params.locale.toLowerCase() !== `${language}-${country}`.toLowerCase()
  ) {
    // 如果区域设置 URL 参数已定义，但我们仍然处于默认区域设置
    // 那么区域设置参数必然是无效的，发送到 404 页面
    throw new Response(null, { status: 404 })
  }

  return null
}
