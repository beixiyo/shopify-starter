import type {
  FeaturedCollectionFragment,
  RecommendedProductsQuery,
} from 'storefrontapi.generated'
import type { Route } from './+types/home'
import { Image } from '@shopify/hydrogen'
import { Suspense } from 'react'
import { Await, Link, useLoaderData } from 'react-router'
import { ProductItem } from '~/components/product/ProductItem'

export const meta: Route.MetaFunction = () => {
  return [{ title: 'Flowtica | Home' }]
}

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args)
  const criticalData = await loadCriticalData(args)
  return { ...deferredData, ...criticalData }
}

async function loadCriticalData({ context }: Route.LoaderArgs) {
  const [{ collections }] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTION_QUERY),
  ])

  return {
    featuredCollection: collections.nodes[0],
  }
}

function loadDeferredData({ context }: Route.LoaderArgs) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error: Error) => {
      console.error(error)
      return null
    })

  return { recommendedProducts }
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>()
  return (
    <div className="-mt-16">
      <FeaturedCollection collection={ data.featuredCollection } />
      <RecommendedProducts products={ data.recommendedProducts } />
      <CTASection />
    </div>
  )
}

/** Featured Collection hero */
function FeaturedCollection({
  collection,
}: {
  collection: FeaturedCollectionFragment
}) {
  if (!collection)
    return null
  const image = collection?.image

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="mx-auto max-w-[1280px] px-4 md:px-8 lg:px-12">
        <Link
          to={ `/collections/${collection.handle}` }
          className="group block relative overflow-hidden rounded-2xl hover:no-underline"
        >
          {image && (
            <div className="aspect-video md:aspect-21/9">
              <Image
                data={ image }
                sizes="100vw"
                alt={ image.altText || collection.title }
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
            <h2 className="text-2xl md:text-3xl font-semibold text-white">
              {collection.title}
            </h2>
            <span className="inline-block mt-3 text-sm font-medium text-white/80 group-hover:text-white transition-colors">
              Shop Collection &rarr;
            </span>
          </div>
        </Link>
      </div>
    </section>
  )
}

/** Recommended products grid */
function RecommendedProducts({
  products,
}: {
  products: Promise<RecommendedProductsQuery | null>
}) {
  return (
    <section className="py-16 md:py-24 bg-background2">
      <div className="mx-auto max-w-[1280px] px-4 md:px-8 lg:px-12">
        <div className="flex items-end justify-between mb-8 md:mb-12">
          <h2 className="text-[clamp(1.5rem,2vw+0.5rem,2.5rem)] font-semibold text-text leading-tight">
            Recommended Products
          </h2>
          <Link
            to="/collections"
            className="hidden md:inline text-sm font-medium text-text3 hover:text-text transition-colors hover:no-underline"
          >
            View all &rarr;
          </Link>
        </div>

        <Suspense fallback={ <ProductGridSkeleton /> }>
          <Await resolve={ products }>
            {response => (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {response
                  ? response.products.nodes.map(product => (
                      <ProductItem key={ product.id } product={ product } />
                    ))
                  : null}
              </div>
            )}
          </Await>
        </Suspense>

        <Link
          to="/collections"
          className="md:hidden block text-center mt-8 text-sm font-medium text-text3 hover:text-text transition-colors hover:no-underline"
        >
          View all products &rarr;
        </Link>
      </div>
    </section>
  )
}

/** Loading skeleton for product grid */
function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={ i } className="animate-pulse">
          <div className="aspect-square bg-background3 rounded-xl" />
          <div className="mt-3 h-4 bg-background3 rounded w-3/4" />
          <div className="mt-2 h-3 bg-background3 rounded w-1/3" />
        </div>
      ))}
    </div>
  )
}

/** Bottom CTA section */
function CTASection() {
  return (
    <section className="py-16 md:py-24 bg-button">
      <div className="mx-auto max-w-[768px] px-4 md:px-8 text-center">
        <h2 className="text-[clamp(1.5rem,2vw+0.5rem,2.5rem)] font-semibold text-textSpecial leading-tight">
          Your everyday note-taking pen,
          <br />
          made intelligent.
        </h2>
        <p className="mt-6 text-base text-textSpecial/50 max-w-md mx-auto leading-relaxed">
          Privacy is a principle, not a feature. Everything you record or write
          is encrypted and stored securely.
        </p>
        <Link
          to="/products/flowtica-scribe"
          className="inline-block mt-8 px-10 py-4 bg-textSpecial text-button text-sm font-semibold rounded-full hover:opacity-90 transition-opacity hover:no-underline"
        >
          Shop Flowtica Scribe
        </Link>
      </div>
    </section>
  )
}

/* ─── GraphQL Queries ─── */

const FEATURED_COLLECTION_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
` as const

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
` as const
