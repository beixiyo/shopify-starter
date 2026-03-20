import type { ReactNode } from 'react'
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useState,
} from 'react'

type AsideType = 'search' | 'cart' | 'mobile' | 'closed'
type AsideContextValue = {
  type: AsideType
  open: (mode: AsideType) => void
  close: () => void
}

/**
 * 带有遮盖层的侧边栏组件
 * @example
 * ```jsx
 * <Aside type="search" heading="SEARCH">
 *  <input type="search" />
 *  ...
 * </Aside>
 * ```
 */
export function Aside({
  children,
  heading,
  type,
}: {
  children?: React.ReactNode
  type: AsideType
  heading: React.ReactNode
}) {
  const { type: activeType, close } = useAside()
  const expanded = type === activeType
  const id = useId()

  useEffect(() => {
    const abortController = new AbortController()
    if (expanded) {
      document.addEventListener(
        'keydown',
        (event: KeyboardEvent) => {
          if (event.key === 'Escape')
            close()
        },
        { signal: abortController.signal },
      )
    }
    return () => abortController.abort()
  }, [close, expanded])

  return (
    <div
      aria-modal
      role="dialog"
      aria-labelledby={ id }
      className={ `
        fixed inset-0 z-50 transition-opacity duration-300
        ${expanded
      ? 'opacity-100 pointer-events-auto visible'
      : 'opacity-0 pointer-events-none invisible'
    }
      ` }
    >
      {/* Backdrop */}
      <button
        className="absolute inset-0 w-full h-full bg-black/30 border-none cursor-default"
        onClick={ close }
        tabIndex={ -1 }
        aria-label="Close"
      />

      {/* Panel */}
      <aside
        className={ `
          absolute top-0 right-0 h-full w-[min(400px,100vw)]
          bg-background shadow-card
          transition-transform duration-200 ease-in-out
          ${expanded ? 'translate-x-0' : 'translate-x-full'}
        ` }
      >
        <header className="flex items-center justify-between h-16 px-5 border-b border-border">
          <h3 id={ id } className="text-sm font-semibold tracking-wide">
            {heading}
          </h3>
          <button
            className="text-xl text-text3 hover:text-text transition-colors"
            onClick={ close }
            aria-label="Close"
          >
            &times;
          </button>
        </header>
        <main className="p-4 overflow-y-auto h-[calc(100%-4rem)]">
          {children}
        </main>
      </aside>
    </div>
  )
}

const AsideContext = createContext<AsideContextValue | null>(null)

Aside.Provider = function AsideProvider({ children }: { children: ReactNode }) {
  const [type, setType] = useState<AsideType>('closed')

  return (
    <AsideContext.Provider
      value={ {
        type,
        open: setType,
        close: () => setType('closed'),
      } }
    >
      {children}
    </AsideContext.Provider>
  )
}

export function useAside() {
  const aside = useContext(AsideContext)
  if (!aside) {
    throw new Error('useAside must be used within an AsideProvider')
  }
  return aside
}
