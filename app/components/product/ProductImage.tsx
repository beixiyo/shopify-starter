import type { ProductVariantFragment } from 'storefrontapi.generated'
import { Image } from '@shopify/hydrogen'

export function ProductImage({
  image,
}: {
  image: ProductVariantFragment['image']
}) {
  if (!image) {
    return <div className="aspect-square rounded-xl bg-background3" />
  }
  return (
    <div className="overflow-hidden rounded-xl bg-background3">
      <Image
        alt={ image.altText || 'Product Image' }
        aspectRatio="1/1"
        data={ image }
        key={ image.id }
        sizes="(min-width: 768px) 50vw, 100vw"
        className="w-full h-full object-cover"
      />
    </div>
  )
}
