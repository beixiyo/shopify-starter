import type { RouteConfig } from '@react-router/dev/routes'
import { index, route } from '@react-router/dev/routes'
import { hydrogenRoutes } from '@shopify/hydrogen'

export default hydrogenRoutes([
  route('robots.txt', 'routes/robots.tsx'),

  route(':locale?', 'routes/_locale.tsx', [
    index('routes/home.tsx'),
    route('*', 'routes/catch-all.tsx'),

    // 站点地图
    route('sitemap.xml', 'routes/sitemap.tsx'),
    route('sitemap/:type/:page[.xml]', 'routes/sitemap-pages.tsx'),

    // 产品
    route('products/:handle', 'routes/products/$handle.tsx'),

    // 收藏集
    route('collections', 'routes/collections/_index.tsx'),
    route('collections/all', 'routes/collections/all.tsx'),
    route('collections/:handle', 'routes/collections/$handle.tsx'),

    // 购物车
    route('cart', 'routes/cart/_index.tsx'),
    route('cart/:lines', 'routes/cart/$lines.tsx'),

    // 账户（登录/授权/登出，在布局外）
    route('account/login', 'routes/account/login.tsx'),
    route('account/authorize', 'routes/account/authorize.tsx'),
    route('account/logout', 'routes/account/logout.tsx'),

    // 账户（带布局）
    route('account', 'routes/account/layout.tsx', [
      index('routes/account/_index.tsx'),
      route('profile', 'routes/account/profile.tsx'),
      route('addresses', 'routes/account/addresses.tsx'),
      route('orders', 'routes/account/orders/_index.tsx'),
      route('orders/:id', 'routes/account/orders/$id.tsx'),
      route('*', 'routes/account/catch-all.tsx'),
    ]),

    // 博客
    route('blogs', 'routes/blogs/_index.tsx'),
    route('blogs/:blogHandle', 'routes/blogs/$blogHandle.tsx'),
    route('blogs/:blogHandle/:articleHandle', 'routes/blogs/$blogHandle.$articleHandle.tsx'),

    // 页面
    route('pages/:handle', 'routes/pages/$handle.tsx'),

    // 政策
    route('policies', 'routes/policies/_index.tsx'),
    route('policies/:handle', 'routes/policies/$handle.tsx'),

    // 搜索
    route('search', 'routes/search.tsx'),

    // 折扣
    route('discount/:code', 'routes/discount/$code.tsx'),

    // API 代理
    route('api/:version/graphql.json', 'routes/api/graphql.tsx'),
  ]),
]) satisfies RouteConfig
