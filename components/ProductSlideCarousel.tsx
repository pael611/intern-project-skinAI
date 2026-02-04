'use client'

import { useState, memo, useCallback, useMemo } from 'react'
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

interface ProductSlideCarouselProps {
  products: Product[]
}

/**
 * Memoized Product Slide Card Component
 * TC: O(1), SC: O(1)
 */
const ProductSlideCard = memo(function ProductSlideCard({
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
      className="relative flex h-96 flex-shrink-0 w-80 flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-lg transition-all duration-300 hover:shadow-2xl hover:border-emerald-300"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Image Container */}
      {product.gambar && (
        <div className="relative h-48 w-full overflow-hidden bg-neutral-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.gambar}
            alt={product.nama_product}
            className={`h-full w-full object-cover transition-transform duration-500 ${
              isHovered ? 'scale-110' : 'scale-100'
            }`}
          />
          {/* Overlay Label Badge */}
          <div className="absolute left-0 top-0 rounded-br-lg bg-emerald-600 px-3 py-1">
            <span className="text-xs font-semibold text-white">{product.label}</span>
          </div>

          {/* Link Icon on Hover */}
          {product.link && (
            <a
              href={product.link}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-white opacity-0 shadow-md transition-all duration-300 hover:bg-emerald-50 group-hover:opacity-100"
              title="Buka produk"
            >
              <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      )}

      {/* Product Info */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <h3 className="line-clamp-2 text-lg font-bold text-emerald-900">
            {product.nama_product}
          </h3>
          <p className="mt-1 text-sm text-neutral-600">{product.brand}</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            Rp{product.harga.toLocaleString('id-ID')}
          </p>
        </div>

        {/* Link Button */}
        {product.link && (
          <a
            href={product.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 block rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            Lihat Produk →
          </a>
        )}
      </div>

      {/* Rating Component */}
      <div className="border-t border-neutral-200 p-4">
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
 * Navigation Button
 * TC: O(1), SC: O(1)
 */
const NavButton = memo(function NavButton({
  direction,
  onClick,
  disabled,
}: {
  direction: 'prev' | 'next'
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`absolute ${
        direction === 'prev' ? '-left-5 sm:-left-4' : '-right-5 sm:-right-4'
      } top-1/3 -translate-y-1/2 rounded-full bg-emerald-600 p-3 text-white shadow-lg transition-all hover:bg-emerald-700 disabled:bg-neutral-300 disabled:cursor-not-allowed`}
      aria-label={direction === 'prev' ? 'Produk sebelumnya' : 'Produk selanjutnya'}
    >
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={direction === 'prev' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
        />
      </svg>
    </button>
  )
})

/**
 * ProductSlideCarousel - Client Component
 * Menampilkan produk dalam horizontal slide view
 * TC: O(n) dimana n = products.length
 * SC: O(1) state size
 */
export default function ProductSlideCarousel({ products }: ProductSlideCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hoveredProductId, setHoveredProductId] = useState<string | null>(null)

  const itemsPerView = 3
  const maxIndex = Math.max(0, products.length - itemsPerView)

  // Memoized callbacks - BEFORE early return
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1))
  }, [maxIndex])

  // Visible products - memoized untuk optimasi render
  const visibleProducts = useMemo(() => {
    return products.slice(currentIndex, currentIndex + itemsPerView)
  }, [currentIndex, products, itemsPerView])

  // Progress percentage
  const progressPercentage = useMemo(() => {
    return maxIndex === 0 ? 0 : (currentIndex / maxIndex) * 100
  }, [currentIndex, maxIndex])

  // Early return optimization - AFTER hooks
  if (products.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Header with Info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-emerald-900">Produk yang Direkomendasikan</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Berdasarkan kondisi kulit yang Anda prediksi
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs font-medium text-neutral-500">
            {currentIndex + 1} - {Math.min(currentIndex + itemsPerView, products.length)} dari {products.length}
          </div>
        </div>
      </div>

      {/* Carousel Container */}
      <div className="relative">
        {/* Navigation Buttons */}
        <NavButton
          direction="prev"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
        />
        <NavButton
          direction="next"
          onClick={goToNext}
          disabled={currentIndex >= maxIndex}
        />

        {/* Scrollable Container */}
        <div className="overflow-hidden px-4 sm:px-8">
          <div className="flex gap-4 transition-transform duration-500 ease-out">
            {visibleProducts.map((product) => (
              <ProductSlideCard
                key={product.id_product}
                product={product}
                isHovered={hoveredProductId === product.id_product}
                onHover={() => setHoveredProductId(product.id_product)}
                onLeave={() => setHoveredProductId(null)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <span className="text-xs font-medium text-neutral-600 whitespace-nowrap">
          {progressPercentage === 0 ? '0' : Math.round(progressPercentage)}%
        </span>
      </div>

      {/* Dot Indicators */}
      <div className="flex justify-center gap-2 flex-wrap">
        {products.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(Math.min(index, maxIndex))}
            className={`transition-all ${
              index >= currentIndex && index < currentIndex + itemsPerView
                ? 'w-3 h-3 bg-emerald-600'
                : 'w-2 h-2 bg-neutral-300 hover:bg-neutral-400'
            } rounded-full`}
            aria-label={`Ke produk ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
