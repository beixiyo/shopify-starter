import { useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { SUPPORTED_LOCALES, LOCALE_LABELS } from '~/lib/i18n/i18n'
import type { I18nLocale } from '~/lib/i18n/i18n'
import { useLocale } from '~/lib/i18n/useLocale'
import { useLocaleMismatchHint } from '~/lib/i18n'

export function stripLocalePrefix(pathname: string, locale: I18nLocale): string {
  if (!locale.pathPrefix) return pathname
  if (pathname.startsWith(locale.pathPrefix)) {
    const stripped = pathname.slice(locale.pathPrefix.length)
    return stripped === '' ? '/' : stripped
  }
  return pathname
}

export function LanguageSelector() {
  const locale = useLocale()
  const { pathname, search, hash } = useLocation()
  const [open, setOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentLabel = LOCALE_LABELS[locale.language] ?? locale.language
  const { showHint, dismiss } = useLocaleMismatchHint()

  const handleEnter = () => {
    timeoutRef.current && clearTimeout(timeoutRef.current)
    setOpen(true)
    if (showHint)
      dismiss()
  }

  const handleLeave = () => {
    timeoutRef.current = setTimeout(setOpen, 150, false)
  }

  return (
    <div
      className="relative hidden md:flex items-center"
      onMouseEnter={ handleEnter }
      onMouseLeave={ handleLeave }
    >
      <button
        className={`flex items-center gap-1 text-sm font-medium transition-colors cursor-pointer bg-transparent border-none p-0 rounded-full ${
          showHint 
            ? 'text-brand animate-pulse hover:text-brand' 
            : 'text-text2 hover:text-text'
        }`}
        aria-expanded={ open }
        aria-label="Select language"
        onClick={() => {
          if (showHint) dismiss()
        }}
      >
        { currentLabel }
        <svg className="w-2.5 h-2.5 mt-0.5 opacity-70" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 10 6">
          <path d="M1 1l4 4 4-4" />
        </svg>
      </button>

      <div
        className={ `
          absolute top-full right-0 pt-1 transition-all duration-150 origin-top z-50
          ${open
      ? 'opacity-100 scale-100 pointer-events-auto'
      : 'opacity-0 scale-95 pointer-events-none'}
        ` }
      >
        <div className="rounded-lg bg-background/80 backdrop-blur-xl shadow-lg border border-border/50 py-1 min-w-[80px]">
          { SUPPORTED_LOCALES.map(l => (
            <a
              key={ l.label }
              href={ `${l.pathPrefix}${stripLocalePrefix(pathname, locale)}${search}${hash}` }
              className={ `
                block px-3 py-1.5 text-sm transition-colors whitespace-nowrap
                ${l.language === locale.language
                  ? 'text-brand font-medium'
                  : 'text-text2 hover:text-text hover:bg-background2/50'}
              ` }
            >
              { l.label }
            </a>
          )) }
        </div>
      </div>
    </div>
  )
}

export function MobileLanguageSwitcher() {
  const locale = useLocale()
  const { pathname, search, hash } = useLocation()
  const { showHint, dismiss } = useLocaleMismatchHint()
  
  return (
    <div className="flex flex-col gap-3 pt-6 mt-6 border-t border-border2/50">
      <span className="text-sm font-medium text-text4 uppercase tracking-wider flex items-center gap-2">
        Language
        {showHint && (
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
        )}
      </span>
      <div className="flex flex-wrap gap-2">
        {SUPPORTED_LOCALES.map(l => (
          <a
            key={l.label}
            href={`${l.pathPrefix}${stripLocalePrefix(pathname, locale)}${search}${hash}`}
            onClick={() => {
              if (showHint) dismiss()
            }}
            className={`
              px-4 py-2 rounded-full text-sm transition-colors border
              ${l.language === locale.language
                ? 'border-brand text-brand bg-brand/5 font-medium'
                : 'border-border2 text-text2 hover:text-text hover:border-text'}
              ${showHint && l.language !== locale.language ? 'animate-pulse border-brand/50 text-brand' : ''}
            `}
          >
            {LOCALE_LABELS[l.language] ?? l.label}
          </a>
        ))}
      </div>
    </div>
  )
}
