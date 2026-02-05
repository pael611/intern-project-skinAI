'use client'

import { useState, memo, useCallback, useMemo, useEffect, useRef } from 'react'
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
 * Memoized Product Slide Card Component dengan Responsive Design
 * TC: O(1), SC: O(1)
 */
const ProductSlideCard = memo(function ProductSlideCard({
  product,
  isHovered,
  onHover,
  onLeave,
  cardWidth,
}: {
  product: Product
  isHovered: boolean
  onHover: () => void
  onLeave: () => void
  cardWidth: string
}) {
  return (
    <div
      className={`relative flex flex-shrink-0 ${cardWidth} min-h-96 flex-col overflow-hidden rounded-2xl border-2 border-emerald-100 bg-white shadow-lg transition-all duration-300 hover:shadow-2xl hover:border-emerald-400 hover:-translate-y-1 light:border-emerald-800/30 light:bg-neutral-900 light:hover:border-emerald-500`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Image Container */}
      <div className="relative h-40 w-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-neutral-200 to-neutral-300 light:from-neutral-700 light:to-neutral-800">
        {product.gambar ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.gambar}
              alt={product.nama_product}
              className={`h-full w-full object-cover transition-transform duration-500 ease-out ${
                isHovered ? 'scale-110' : 'scale-100'
              }`}
              loading="lazy"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <svg className="h-12 w-12 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Label Badge */}
        <div className="absolute right-2 top-2 rounded-lg bg-emerald-600/90 backdrop-blur-sm px-3 py-1">
          <span className="text-xs font-bold text-white">{product.label}</span>
        </div>
      </div>

      {/* Product Info */}
      <div className="flex flex-1 flex-col justify-between p-3 sm:p-4">
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-base font-bold text-emerald-900 light:text-emerald-100 sm:text-lg">
            {product.nama_product}
          </h3>
          <p className="mt-1 line-clamp-1 text-xs text-neutral-600 light:text-neutral-400 sm:text-sm">{product.brand}</p>
          <p className="mt-2 text-lg font-bold text-emerald-700 light:text-emerald-300 sm:text-xl">
            Rp{product.harga.toLocaleString('id-ID')}
          </p>
        </div>

        {/* Link Button */}
        {product.link && (
          <a
            href={product.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 block rounded-lg bg-emerald-600 px-3 py-2 text-center text-xs font-medium text-white transition-all duration-200 hover:bg-emerald-700 active:scale-95 light:bg-emerald-700 light:hover:bg-emerald-600 sm:text-sm"
          >
            Lihat Produk →
          </a>
        )}
      </div>

      {/* Rating Component */}
      <div className="border-t border-neutral-200 p-3 light:border-neutral-700">
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
 * Navigation Button dengan Mobile Support
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
      className={`absolute ${direction === 'prev' ? 'left-0 sm:left-2' : 'right-0 sm:right-2'} top-1/3 -translate-y-1/2 rounded-full bg-emerald-600 p-2.5 sm:p-3 text-white shadow-lg transition-all duration-200 hover:bg-emerald-700 active:scale-95 disabled:bg-neutral-300 disabled:cursor-not-allowed z-10 light:bg-emerald-700 light:hover:bg-emerald-600`}
      aria-label={direction === 'prev' ? 'Produk sebelumnya' : 'Produk selanjutnya'}
    >
      <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
          d={direction === 'prev' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}
        />
      </svg>
    </button>
  )
})

/**
 * ProductSlideCarousel - Client Component dengan Responsive & Interactive Features
 * Responsive items per view (1 mobile, 2 tablet, 3 desktop), keyboard nav, touch swipe
 * TC: O(n) dimana n = products.length
 * SC: O(1) state size
 */
export default function ProductSlideCarousel({ products }: ProductSlideCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hoveredProductId, setHoveredProductId] = useState<string | null>(null)
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  // Responsive items per view
  const itemsPerView = useMemo(() => {
    switch (screenSize) {
      case 'mobile':
        return 1
      case 'tablet':
        return 2
      default:
        return 3
    }
  }, [screenSize])

  const cardWidth = useMemo(() => {
    switch (screenSize) {
      case 'mobile':
        return 'w-full sm:w-80'
      case 'tablet':
        return 'w-80'
      default:
        return 'w-80'
    }
  }, [screenSize])

  const maxIndex = Math.max(0, products.length - itemsPerView)

  // Detect screen size
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 768) setScreenSize('mobile')
        else if (window.innerWidth < 1024) setScreenSize('tablet')
        else setScreenSize('desktop')
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Memoized callbacks
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1))
  }, [maxIndex])

  const goToIndex = useCallback(
    (index: number) => {
      setCurrentIndex(Math.min(index, maxIndex))
    },
    [maxIndex]
  )

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious()
      if (e.key === 'ArrowRight') goToNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToPrevious, goToNext])

  // Touch support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX
    handleSwipe()
  }

  const handleSwipe = useCallback(() => {
    const swipeThreshold = 50
    const diff = touchStartX.current - touchEndX.current

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        goToNext()
      } else {
        goToPrevious()
      }
    }
  }, [goToNext, goToPrevious])

  // Visible products - memoized
  const visibleProducts = useMemo(() => {
    return products.slice(currentIndex, currentIndex + itemsPerView)
  }, [currentIndex, products, itemsPerView])

  // Progress percentage - memoized
  const progressPercentage = useMemo(() => {
    return maxIndex === 0 ? 0 : (currentIndex / maxIndex) * 100
  }, [currentIndex, maxIndex])

  // Visible indices for dot indicators - memoized
  const visibleIndices = useMemo(() => {
    return products
      .map((_, i) => i)
      .filter((i) => i >= currentIndex && i < currentIndex + itemsPerView)
  }, [currentIndex, itemsPerView, products.length])

  // Early return - after all hooks
  if (products.length === 0) {
    return null
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Info */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-emerald-900 light:text-emerald-100 sm:text-3xl">Produk Rekomendasi</h2>
          <p className="mt-1 text-sm text-neutral-600 light:text-neutral-400">Berdasarkan kondisi kulit Anda</p>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-neutral-100 px-3 py-2 light:bg-neutral-800">
          <span className="text-xs font-medium text-neutral-700 light:text-neutral-300">Navigasi:</span>
          <span className="font-mono text-sm font-bold text-emerald-600 light:text-emerald-400">
            {currentIndex + 1}-{Math.min(currentIndex + itemsPerView, products.length)}/{products.length}
          </span>
        </div>
      </div>

      {/* Carousel Container */}
      <div
        className="relative rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 p-3 sm:p-6 light:from-neutral-900 light:to-neutral-800"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Navigation Buttons */}
        {products.length > itemsPerView && (
          <>
            <NavButton direction="prev" onClick={goToPrevious} disabled={currentIndex === 0} />
            <NavButton direction="next" onClick={goToNext} disabled={currentIndex >= maxIndex} />
          </>
        )}

        {/* Scrollable Container */}
        <div className="overflow-hidden rounded-2xl">
          <div className="flex gap-3 sm:gap-4 transition-transform duration-500 ease-out">
            {visibleProducts.map((product) => (
              <ProductSlideCard
                key={product.id_product}
                product={product}
                isHovered={hoveredProductId === product.id_product}
                onHover={() => setHoveredProductId(product.id_product)}
                onLeave={() => setHoveredProductId(null)}
                cardWidth={cardWidth}
              />
            ))}
          </div>
        </div>

        {/* Touch Swipe Indicator on Mobile */}
        {products.length > itemsPerView && screenSize === 'mobile' && (
          <div className="mt-4 text-center text-xs text-neutral-500 light:text-neutral-400">
            ← Geser untuk navigasi →
          </div>
        )}
      </div>     
      {/* Enhanced Dot Indicators */}
      <div className="flex justify-center gap-1.5 flex-wrap rounded-lg bg-transparent p-3 light:bg-neutral-800">
        {products.map((_, index) => {
          const isVisible = visibleIndices.includes(index)
          const isFirst = index === visibleIndices[0]

          return (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              className={`transition-all duration-300 rounded-full ${
                isFirst && isVisible
                  ? 'w-8 h-3 bg-emerald-600 light:bg-emerald-500'
                  : isVisible
                    ? 'w-3 h-3 bg-emerald-400 hover:bg-emerald-500 light:bg-emerald-700 light:hover:bg-emerald-600'
                    : 'w-2 h-2 bg-neutral-300 hover:bg-neutral-400 light:bg-neutral-600 light:hover:bg-neutral-500'
              }`}
              aria-label={`Ke produk ${index + 1}`}
            />
          )
        })}
      </div>
    </div>
  )
}
