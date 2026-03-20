import type { Route } from './+types/$blogHandle.$articleHandle'
import { Image } from '@shopify/hydrogen'
import { useLoaderData } from 'react-router'
import { redirectIfHandleIsLocalized } from '~/lib/redirect'

export const meta: Route.MetaFunction = ({ data }) => {
  return [{ title: `Hydrogen | ${data?.article.title ?? ''} article` }]
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
  const { blogHandle, articleHandle } = params

  if (!articleHandle || !blogHandle) {
    throw new Response('Not found', { status: 404 })
  }

  const [{ blog }] = await Promise.all([
    context.storefront.query(ARTICLE_QUERY, {
      variables: { blogHandle, articleHandle },
    }),
    // 在此添加其他查询，以便并行加载
  ])

  if (!blog?.articleByHandle) {
    throw new Response(null, { status: 404 })
  }

  redirectIfHandleIsLocalized(
    request,
    {
      handle: articleHandle,
      data: blog.articleByHandle,
    },
    {
      handle: blogHandle,
      data: blog,
    },
  )

  const article = blog.articleByHandle

  return { article }
}

/**
 * 加载呈现折页以下内容所需的数据。此数据将被延迟，并在初始页面加载后获取。
 * 如果不可用，页面应该仍然返回 200。
 * 确保在此处不要抛出任何错误，因为这会导致页面返回 500。
 */
function loadDeferredData({ context }: Route.LoaderArgs) {
  return {}
}

export default function Article() {
  const { article } = useLoaderData<typeof loader>()
  const { title, image, contentHtml, author } = article

  const publishedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(article.publishedAt))

  return (
    <div className="article">
      <h1>
        {title}
        <div>
          <time dateTime={ article.publishedAt }>{publishedDate}</time>
          {' '}
          &middot;
          {' '}
          <address>{author?.name}</address>
        </div>
      </h1>

      {image && <Image data={ image } sizes="90vw" loading="eager" />}
      <div
        dangerouslySetInnerHTML={ { __html: contentHtml } }
        className="article"
      />
    </div>
  )
}

// 注：https://shopify.dev/docs/api/storefront/latest/objects/blog#field-blog-articlebyhandle
const ARTICLE_QUERY = `#graphql
  query Article(
    $articleHandle: String!
    $blogHandle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    blog(handle: $blogHandle) {
      handle
      articleByHandle(handle: $articleHandle) {
        handle
        title
        contentHtml
        publishedAt
        author: authorV2 {
          name
        }
        image {
          id
          altText
          url
          width
          height
        }
        seo {
          description
          title
        }
      }
    }
  }
` as const
