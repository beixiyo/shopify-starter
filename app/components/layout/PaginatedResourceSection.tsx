import { Pagination } from '@shopify/hydrogen'
import * as React from 'react'

/**
 * <PaginatedResourceSection > is a component that encapsulate how the previous and next behaviors throughout your application.
 */
export function PaginatedResourceSection<NodesType>({
  connection,
  children,
  resourcesClassName,
}: {
  connection: React.ComponentProps<typeof Pagination<NodesType>>['connection']
  children: React.FunctionComponent<{ node: NodesType, index: number }>
  resourcesClassName?: string
}) {
  return (
    <Pagination connection={ connection }>
      {({ nodes, isLoading, PreviousLink, NextLink }) => {
        const resourcesMarkup = nodes.map((node, index) =>
          children({ node, index }),
        )

        return (
          <div>
            <PreviousLink>
              {isLoading
                ? 'Loading...'
                : (
                    <span className="flex items-center justify-center gap-2 py-4 text-sm text-text2 hover:text-text transition-colors cursor-pointer">
                      <span>↑</span>
                      Load previous
                    </span>
                  )}
            </PreviousLink>
            {resourcesClassName
              ? (
                  <div className={ resourcesClassName }>{resourcesMarkup}</div>
                )
              : (
                  resourcesMarkup
                )}
            <NextLink>
              {isLoading
                ? 'Loading...'
                : (
                    <span className="flex items-center justify-center gap-2 py-6 text-sm font-medium text-text2 hover:text-text transition-colors cursor-pointer">
                      Load more
                      <span>↓</span>
                    </span>
                  )}
            </NextLink>
          </div>
        )
      }}
    </Pagination>
  )
}
