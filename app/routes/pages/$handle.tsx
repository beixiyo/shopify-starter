import type { Route } from './+types/$handle'
import { useLoaderData } from 'react-router'
import { redirectIfHandleIsLocalized } from '~/lib/redirect'

export const meta: Route.MetaFunction = ({ data }) => {
  return [{ title: `Hydrogen | ${data?.page.title ?? ''}` }]
}

export async function loader(args: Route.LoaderArgs) {
  // 开始获取非关键数据，不阻塞首字节时间
  const deferredData = loadDeferredData(args)

  // 等待呈现页面初始状态所需的关键数据
  const criticalData = await loadCriticalData(args)

  return { ...deferredData, ...criticalData }
}

/**
 * 加载呈现折页以上内容所需的数据。这是呈现页面所需的关键数据。
 * 如果不可用，整个页面应该返回 400 或 500 错误。
 */
async function loadCriticalData({ context, request, params }: Route.LoaderArgs) {
  if (!params.handle) {
    throw new Error('Missing page handle')
  }

  const [{ page }] = await Promise.all([
    context.storefront.query(PAGE_QUERY, {
      variables: {
        handle: params.handle,
      },
    }),
    // 在此添加其他查询，以便并行加载
  ])

  if (!page) {
    throw new Response('Not Found', { status: 404 })
  }

  // API 句柄可能是本地化的，所以重定向到本地化的句柄
  redirectIfHandleIsLocalized(request, { handle: params.handle, data: page })

  return {
    page,
  }
}

/**
 * 加载呈现折页以下内容所需的数据。此数据将被延迟，并在初始页面加载后获取。
 * 如果不可用，页面应该仍然返回 200。
 * 确保在此处不要抛出任何错误，因为这会导致页面返回 500。
 */
function loadDeferredData({ context }: Route.LoaderArgs) {
  return {}
}

export default function Page() {
  const { page } = useLoaderData<typeof loader>()

  return (
    <div className="page">
      <header>
        <h1>{page.title}</h1>
      </header>
      <main dangerouslySetInnerHTML={ { __html: page.body } } />
    </div>
  )
}

const PAGE_QUERY = `#graphql
  query Page(
    $language: LanguageCode,
    $country: CountryCode,
    $handle: String!
  )
  @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      handle
      id
      title
      body
      seo {
        description
        title
      }
    }
  }
` as const
