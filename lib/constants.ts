// Constants untuk aplikasi
export const PAGINATION = {
  HISTORY_PER_PAGE: 8,
  MAX_PRODUCTS_PER_REQUEST: 200,
  PRODUCTS_PER_LABEL: 20,
} as const

export const TIMEOUT = {
  FETCH: 10000,
  TOAST_MESSAGE: 3000,
} as const

export const REGEX = {
  EMAIL_DOMAIN: /@[^.]+/,
  NAME_SEPARATOR: /[._-]/,
} as const

export const CSS_CLASSES = {
  BUTTON_PRIMARY: 'rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 transition-colors',
  BUTTON_SECONDARY: 'rounded-lg border border-emerald-200 px-4 py-2 text-emerald-800 hover:bg-emerald-50',
  CARD_CONTAINER: 'rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm',
  TABLE_CELL: 'px-4 py-3',
} as const

export const API_ENDPOINTS = {
  RATINGS: '/api/ratings',
  PRODUCTS: '/api/products',
  PREDICTIONS: '/api/predictions',
} as const
