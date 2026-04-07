/**
 * 订单筛选的字段名常量
 */
export const ORDER_FILTER_FIELDS = {
  NAME: 'name',
  CONFIRMATION_NUMBER: 'confirmation_number',
} as const

/**
 * 用于筛选客户订单的参数，参考: https://shopify.dev/docs/api/customer/latest/queries/customer#returns-Customer.fields.orders.arguments.query
 */
export interface OrderFilterParams {
  /** 订单名称或号码（例如 "#1001" 或 "1001"） */
  name?: string
  /** 订单确认号 */
  confirmationNumber?: string
}

const RE_SANITIZE_VALUE = /[^a-zA-Z0-9_\-]/g
const RE_HASH_PREFIX = /^#/

/**
 * 清理筛选值以防止注入攻击或格式错误的查询。
 * 仅允许字母数字字符、下划线和破折号。
 * @param value - 要清理的输入字符串
 * @returns 清理后的字符串
 */
function sanitizeFilterValue(value: string): string {
  // 仅允许字母数字、下划线和破折号
  // 删除其他任何字符以防止注入
  return value.replace(RE_SANITIZE_VALUE, '')
}

/**
 * 使用客户账户 API 为客户订单筛选构建查询字符串
 * @param filters - 筛选参数
 * @returns 格式化的 GraphQL 查询参数字符串，如果没有筛选条件则返回 undefined
 * @example
 * buildOrderSearchQuery(\{ name: '1001' \}) // 返回 "name:1001"
 * buildOrderSearchQuery(\{ name: '1001', confirmationNumber: 'ABC123' \}) // 返回 "name:1001 AND confirmation_number:ABC123"
 */
export function buildOrderSearchQuery(
  filters: OrderFilterParams,
): string | undefined {
  const queryParts: string[] = []

  if (filters.name) {
    // 如果存在 # 则删除，并去除首尾空格
    const cleanName = filters.name.replace(RE_HASH_PREFIX, '').trim()
    const sanitizedName = sanitizeFilterValue(cleanName)
    if (sanitizedName) {
      queryParts.push(`name:${sanitizedName}`)
    }
  }

  if (filters.confirmationNumber) {
    const cleanConfirmation = filters.confirmationNumber.trim()
    const sanitizedConfirmation = sanitizeFilterValue(cleanConfirmation)
    if (sanitizedConfirmation) {
      queryParts.push(`confirmation_number:${sanitizedConfirmation}`)
    }
  }

  return queryParts.length > 0 ? queryParts.join(' AND ') : undefined
}

/**
 * 从 URLSearchParams 解析订单筛选参数
 * @param searchParams - URL 搜索参数
 * @returns 解析后的筛选参数
 * @example
 * const url = new URL('https://example.com/orders?name=1001&confirmation_number=ABC123');
 * parseOrderFilters(url.searchParams) // 返回 \{ name: '1001', confirmationNumber: 'ABC123' \}
 */
export function parseOrderFilters(
  searchParams: URLSearchParams,
): OrderFilterParams {
  const filters: OrderFilterParams = {}

  const name = searchParams.get(ORDER_FILTER_FIELDS.NAME)
  if (name) {
    filters.name = name
  }

  const confirmationNumber = searchParams.get(
    ORDER_FILTER_FIELDS.CONFIRMATION_NUMBER,
  )
  if (confirmationNumber) {
    filters.confirmationNumber = confirmationNumber
  }

  return filters
}
