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

interface ProductCarouselProps {
  label: string
  products: Product[]
}

/**
 * Memoized Product Card Component
 * TC: O(1), SC: O(1)
 * Prevents re-render ketika parent props tidak berubah
 */
const ProductCard = memo(function ProductCard({
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
    <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
      {product.gambar && (
        <div
          className="group relative mb-4 h-64 w-full overflow-hidden rounded-lg bg-neutral-100"
          onMouseEnter={onHover}
          onMouseLeave={onLeave}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.gambar}
            alt={product.nama_product}
            className={`h-full w-full object-cover transition-transform duration-300 ${
              isHovered ? 'scale-110' : 'scale-100'
            }`}
          />
        </div>
      )}
      <div className="mb-3">
        <h4 className="font-semibold text-emerald-900">{product.nama_product}</h4>
        <p className="text-sm text-neutral-600">{product.brand}</p>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <span className="text-lg font-bold text-emerald-800">
          Rp{product.harga.toLocaleString('id-ID')}
        </span>
      </div>

      {product.link && (
        <a
          href={product.link}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 block rounded-lg bg-emerald-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
        >
          Lihat Produk
        </a>
      )}

      <ProductRating
        productId={product.id_product}
        productName={product.nama_product}
        productBrand={product.brand}
        productTag={product.label}
      />
    </div>
  )
})

/**
 * Memoized Navigation Button
 * TC: O(1), SC: O(1)
 */
const NavButton = memo(function NavButton({
  direction,
  onClick,
  ariaLabel,
}: {
  direction: 'prev' | 'next'
  onClick: () => void
  ariaLabel: string
}) {
  return (
    <button
      onClick={onClick}
      className={`absolute ${
        direction === 'prev' ? 'left-0 -translate-x-5' : 'right-0 translate-x-5'
      } top-1/2 -translate-y-1/2 rounded-full bg-emerald-600 p-2 text-white hover:bg-emerald-700 transition-colors shadow-sm`}
      aria-label={ariaLabel}
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
 * ProductCarousel - Client Component
 * TC: O(n) dimana n = products.length
 * SC: O(1) state size
 */
export default function ProductCarousel({ label, products }: ProductCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hoveredImageIndex, setHoveredImageIndex] = useState<number | null>(null)

  // Memoized callbacks - TC: O(1), SC: O(1)
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? products.length - 1 : prev - 1))
  }, [products.length])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === products.length - 1 ? 0 : prev + 1))
  }, [products.length])

  const handleDotClick = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  // Early return optimization
  if (products.length === 0) {
    return null
  }

  const currentProduct = products[currentIndex]
  const isSingleProduct = products.length === 1

  return (
    <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-bold text-emerald-900">
          Produk untuk: <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">{label}</span>
        </h3>
        {!isSingleProduct && (
          <span className="text-sm text-neutral-600">
            {currentIndex + 1} / {products.length}
          </span>
        )}
      </div>

      {isSingleProduct ? (
        // Single product view - no carousel
        <ProductCard
          product={currentProduct}
          isHovered={hoveredImageIndex === 0}
          onHover={() => setHoveredImageIndex(0)}
          onLeave={() => setHoveredImageIndex(null)}
        />
      ) : (
        // Carousel view
        <>
          <div className="relative">
            <ProductCard
              product={currentProduct}
              isHovered={hoveredImageIndex === currentIndex}
              onHover={() => setHoveredImageIndex(currentIndex)}
              onLeave={() => setHoveredImageIndex(null)}
            />

            <NavButton direction="prev" onClick={goToPrevious} ariaLabel="Previous product" />
            <NavButton direction="next" onClick={goToNext} ariaLabel="Next product" />
          </div>

          {/* Dot Indicators - TC: O(n), SC: O(n) */}
          <div className="mt-4 flex justify-center gap-2">
            {products.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={`rounded-full transition-all ${
                  index === currentIndex
                    ? 'w-6 h-2 bg-emerald-600'
                    : 'w-2 h-2 bg-emerald-200 hover:bg-emerald-400'
                }`}
                aria-label={`Go to product ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
