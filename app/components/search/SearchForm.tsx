import type { FormProps } from 'react-router'
import { useEffect, useRef } from 'react'
import { Form } from 'react-router'

type SearchFormProps = Omit<FormProps, 'children'> & {
  children: (args: {
    inputRef: React.RefObject<HTMLInputElement | null>
  }) => React.ReactNode
}

/**
 * 搜索表单组件，将搜索请求发送到 `/search` 路由。
 * @example
 * ```tsx
 * <SearchForm>
 *  {({inputRef}) => (
 *    <>
 *      <input
 *        ref={inputRef}
 *        type="search"
 *        defaultValue={term}
 *        name="q"
 *        placeholder="搜索…"
 *      />
 *      <button type="submit">搜索</button>
 *   </>
 *  )}
 *  </SearchForm>
 */
export function SearchForm({ children, ...props }: SearchFormProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useFocusOnCmdK(inputRef)

  if (typeof children !== 'function') {
    return null
  }

  return (
    <Form method="get" { ...props }>
      { children({ inputRef }) }
    </Form>
  )
}

/**
 * 在按下 cmd+k 时将焦点设置到输入框
 */
function useFocusOnCmdK(inputRef: React.RefObject<HTMLInputElement | null>) {
  // 当按下 cmd+k 时将焦点设置到输入框
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && event.metaKey) {
        event.preventDefault()
        inputRef.current?.focus()
      }

      if (event.key === 'Escape') {
        inputRef.current?.blur()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [inputRef])
}
