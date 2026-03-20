import type { Route } from './+types/robots'

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const body = robotsTxtData({ url: url.origin })

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',

      'Cache-Control': `max-age=${60 * 60 * 24}`,
    },
  })
}

function robotsTxtData({ url }: { url?: string }) {
  const sitemapUrl = url ? `${url}/sitemap.xml` : undefined

  return `
User-agent: *
${generalDisallowRules({ sitemapUrl })}

# Google adsbot 忽略 robots.txt 除非特别命名！
User-agent: adsbot-google
Disallow: /cart
Disallow: /account
Disallow: /search
Allow: /search/
Disallow: /search/?*

User-agent: Nutch
Disallow: /

User-agent: AhrefsBot
Crawl-delay: 10
${generalDisallowRules({ sitemapUrl })}

User-agent: AhrefsSiteAudit
Crawl-delay: 10
${generalDisallowRules({ sitemapUrl })}

User-agent: MJ12bot
Crawl-Delay: 10

User-agent: Pinterest
Crawl-delay: 1
`.trim()
}

/**
 * 此函数生成不允许规则，这些规则通常遵循 Shopify 的
 * 在线商店对其 robots.txt 的默认设置
 */
function generalDisallowRules({ sitemapUrl }: { sitemapUrl?: string }) {
  return `Disallow: /cart
Disallow: /account
Disallow: /collections/*sort_by*
Disallow: /*/collections/*sort_by*
Disallow: /collections/*+*
Disallow: /collections/*%2B*
Disallow: /collections/*%2b*
Disallow: /*/collections/*+*
Disallow: /*/collections/*%2B*
Disallow: /*/collections/*%2b*
Disallow: /*/collections/*filter*&*filter*
Disallow: /blogs/*+*
Disallow: /blogs/*%2B*
Disallow: /blogs/*%2b*
Disallow: /*/blogs/*+*
Disallow: /*/blogs/*%2B*
Disallow: /*/blogs/*%2b*
Disallow: /policies/
Disallow: /search
Allow: /search/
Disallow: /search/?*
${sitemapUrl ? `Sitemap: ${sitemapUrl}` : ''}`
}
