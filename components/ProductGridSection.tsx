'use client'

import { useState, memo, useCallback } from 'react'
import ProductRating from './ProductRating'

interface Product {
  id_product: string
  nama_product: string
  label: string
  brand: string
  harga: number
  gambar?: string
  link?: string
  created_at: string
}

interface ProductGridSectionProps {
  label: string
  products: Product[]
}

/**
 * Memoized Compact Product Card Component
 * TC: O(1), SC: O(1)
 * Display dalam grid dengan ukuran kompak dan hover effects
 */
const CompactProductCard = memo(function CompactProductCard({
  product,
  isHovered,
  onHover,
  onLeave,
}: {
  product: Product
  isHovered: boolean
  onHover: () => void
  onLeave: () => void
}) {
  return (
    <div
      className="group relative flex h-full flex-col rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition-all duration-200 hover:border-emerald-300 hover:shadow-md"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Image Container */}
      {product.gambar && (
        <div className="relative mb-3 h-32 w-full overflow-hidden rounded-md bg-neutral-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.gambar}
            alt={product.nama_product}
            className={`h-full w-full object-cover transition-transform duration-300 ${
              isHovered ? 'scale-110' : 'scale-100'
            }`}
          />
          {product.link && (
            <a
              href={product.link}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 flex items-center justify-center rounded-md bg-black/0 transition-colors duration-200 group-hover:bg-black/40"
            >
              <span className="opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </span>
            </a>
          )}
        </div>
      )}

      {/* Product Info */}
      <div className="mb-2 flex-1">
        <h4 className="line-clamp-2 text-xs font-semibold leading-tight text-emerald-900">
          {product.nama_product}
        </h4>
        <p className="line-clamp-1 mt-0.5 text-xs text-neutral-600">{product.brand}</p>
        <p className="mt-1.5 text-sm font-bold text-emerald-700">
          Rp{product.harga.toLocaleString('id-ID')}
        </p>
      </div>

      {/* Rating Component - compact version */}
      <div className="mt-2 border-t border-neutral-100 pt-2">
        <ProductRating
          productId={product.id_product}
          productName={product.nama_product}
          productBrand={product.brand}
          productTag={product.label}
          compact={true}
        />
      </div>
    </div>
  )
})

/**
 * ProductGridSection - Client Component
 * Menampilkan semua produk dalam grid responsive
 * TC: O(n) dimana n = products.length
 * SC: O(n) untuk state
 */
export default function ProductGridSection({ label, products }: ProductGridSectionProps) {
  const [hoveredProductId, setHoveredProductId] = useState<string | null>(null)

  // Early return optimization
  if (products.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-emerald-900">
          Untuk:{' '}
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
            {label}
          </span>
        </h3>
        <span className="text-xs font-medium text-neutral-500">
          {products.length} produk
        </span>
      </div>

      {/* Responsive Grid - 2 cols on mobile, 3 on tablet, 4 on desktop */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {products.map((product) => (
          <CompactProductCard
            key={product.id_product}
            product={product}
            isHovered={hoveredProductId === product.id_product}
            onHover={() => setHoveredProductId(product.id_product)}
            onLeave={() => setHoveredProductId(null)}
          />
        ))}
      </div>
    </div>
  )
}
