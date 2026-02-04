/**
 * Utility functions untuk optimasi
 * Time Complexity & Space Complexity
 */

/**
 * Extract user initials dari email
 * TC: O(n) dimana n = email length, SC: O(1)
 * @param email - User email
 * @returns 2-char initials in uppercase
 */
export function getEmailInitials(email: string): string {
  return email
    .split('@')[0]
    .split(/[._-]/)
    .map((s) => s.charCodeAt(0))
    .slice(0, 2)
    .map((code) => String.fromCharCode(code).toUpperCase())
    .join('')
}

/**
 * Extract unique values from array
 * TC: O(n), SC: O(n)
 * @param array - Array of items
 * @param accessor - Function untuk extract value
 * @returns Array of unique values
 */
export function getUnique<T, K>(array: T[], accessor: (item: T) => K): K[] {
  return Array.from(new Set(array.map(accessor).filter(Boolean)))
}

/**
 * Format currency ke Rupiah
 * TC: O(n) dimana n = digit count, SC: O(n)
 * @param amount - Number to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format tanggal ke format lokal
 * TC: O(1), SC: O(1)
 * @param date - Date string
 * @returns Formatted date string
 */
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Calculate confidence percentage
 * TC: O(1), SC: O(1)
 * @param confidence - Decimal confidence value (0-1)
 * @returns Percentage value (0-100)
 */
export function getConfidencePercentage(confidence: number): number {
  return Math.round(Math.min(100, Math.max(0, confidence * 100)))
}

/**
 * Debounce function untuk event handling
 * TC: O(1), SC: O(1)
 * @param func - Function to debounce
 * @param wait - Delay in ms
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return function (...args: Parameters<T>) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Check if array is empty with type guard
 * TC: O(1), SC: O(1)
 */
export function isEmpty<T>(array: T[]): array is [] {
  return array.length === 0
}

/**
 * Safely parse JSON dengan fallback
 * TC: O(n), SC: O(n)
 */
export function safeParseJSON<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

/**
 * Paginate array results
 * TC: O(n) worst case, SC: O(p) dimana p = page size
 */
export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number
): { items: T[]; hasMore: boolean; total: number } {
  const start = (page - 1) * pageSize
  const end = start + pageSize
  return {
    items: items.slice(start, end),
    hasMore: end < items.length,
    total: items.length,
  }
}

/**
 * Memoize object untuk membandingkan prop changes
 * TC: O(1), SC: O(1)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function arePropsEqual<T extends Record<string, any>>(
  prev: T,
  next: T,
  keys?: (keyof T)[]
): boolean {
  const keysToCheck = keys || Object.keys(prev)
  return keysToCheck.every((key) => prev[key] === next[key])
}
