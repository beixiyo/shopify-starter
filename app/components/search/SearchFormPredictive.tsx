import type { Fetcher, FormProps } from 'react-router'
import type { PredictiveSearchReturn } from '~/lib/search'
import * as React from 'react'
import { useEffect, useRef } from 'react'
import {

  useFetcher,
  useNavigate,
} from 'react-router'
import { useAside } from '~/components/layout/Aside'

type SearchFormPredictiveChildren = (args: {
  fetchResults: (event: React.ChangeEvent<HTMLInputElement>) => void
  goToSearch: () => void
  inputRef: React.MutableRefObject<HTMLInputElement | null>
  fetcher: Fetcher<PredictiveSearchReturn>
}) => React.ReactNode

type SearchFormPredictiveProps = Omit<FormProps, 'children'> & {
  children: SearchFormPredictiveChildren | null
}

export const SEARCH_ENDPOINT = '/search'

/**
 * 搜索表单组件，将搜索请求发送到 `/search` 路由
 */
export function SearchFormPredictive({
  children,
  className = 'predictive-search-form',
  ...props
}: SearchFormPredictiveProps) {
  const fetcher = useFetcher<PredictiveSearchReturn>({ key: 'search' })
  const inputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()
  const aside = useAside()

  /** 重置输入值并模糊输入框 */
  function resetInput(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (inputRef?.current?.value) {
      inputRef.current.blur()
    }
  }

  /** 使用当前输入值导航到搜索页面 */
  function goToSearch() {
    const term = inputRef?.current?.value
    void navigate(SEARCH_ENDPOINT + (term ? `?q=${term}` : ''))
    aside.close()
  }

  /** 基于输入值获取搜索结果 */
  function fetchResults(event: React.ChangeEvent<HTMLInputElement>) {
    void fetcher.submit(
      { q: event.target.value || '', limit: 5, predictive: true },
      { method: 'GET', action: SEARCH_ENDPOINT },
    )
  }

  // 确保传入的输入类型为搜索，因为SearchResults
  // 将基于输入选择元素
  useEffect(() => {
    inputRef?.current?.setAttribute('type', 'search')
  }, [])

  if (typeof children !== 'function') {
    return null
  }

  return (
    <fetcher.Form { ...props } className={ className } onSubmit={ resetInput }>
      {children({ inputRef, fetcher, fetchResults, goToSearch })}
    </fetcher.Form>
  )
}
