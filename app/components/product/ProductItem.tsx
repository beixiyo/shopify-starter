import type {
  CollectionItemFragment,
  ProductItemFragment,
  RecommendedProductFragment,
} from 'storefrontapi.generated'
import { Image, Money } from '@shopify/hydrogen'
import { Link } from 'react-router'
import { useVariantUrl } from '~/lib/variants'

export function ProductItem({
  product,
  loading,
}: {
  product:
    | CollectionItemFragment
    | ProductItemFragment
    | RecommendedProductFragment
  loading?: 'eager' | 'lazy'
}) {
  const variantUrl = useVariantUrl(product.handle)
  const image = product.featuredImage

  return (
    <Link
      key={ product.id }
      prefetch="intent"
      to={ variantUrl }
      className="group block hover:no-underline"
    >
      {image && (
        <div className="overflow-hidden rounded-xl bg-background3">
          <Image
            alt={ image.altText || product.title }
            aspectRatio="1/1"
            data={ image }
            loading={ loading }
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
      <h4 className="mt-3 text-sm font-medium text-text group-hover:text-brand transition-colors">
        {product.title}
      </h4>
      <p className="mt-1 text-sm text-text3">
        <Money data={ product.priceRange.minVariantPrice } />
      </p>
    </Link>
  )
}
