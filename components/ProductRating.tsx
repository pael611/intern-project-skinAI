'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { TIMEOUT, API_ENDPOINTS } from '../lib/constants'

interface RatingStats {
  total_ratings: number
  average_rating: number
}

interface ProductRatingProps {
  productId: string
  productName: string
  productBrand?: string
  productTag?: string
  onRatingSubmit?: (rating: number, comment: string) => void
  disabled?: boolean
  compact?: boolean // untuk mode grid yang lebih kecil
}

/**
 * ProductRating Component
 * TC: O(1) for renders, O(1) for state updates
 * SC: O(1) for state size
 */
export default function ProductRating({
  productId,
  productName,
  productBrand,
  productTag,
  onRatingSubmit,
  disabled = false,
  compact = false,
}: ProductRatingProps) {
  const [rating, setRating] = useState<number>(0)
  const [comment, setComment] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [hoveredRating, setHoveredRating] = useState<number>(0)
  const [ratingStats, setRatingStats] = useState<RatingStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  /**
   * Fetch rating stats - memoized untuk mencegah refetch
   * TC: O(1), SC: O(1)
   */
  const fetchRatingStats = useCallback(async () => {
    try {
      setIsLoadingStats(true)
      const response = await fetch(
        `${API_ENDPOINTS.RATINGS}?product_id=${encodeURIComponent(productId)}`,
        { signal: AbortSignal.timeout(TIMEOUT.FETCH) }
      )
      
      if (response.ok) {
        const result = await response.json()
        setRatingStats(result.data)
      }
    } catch (error) {
      console.error('Error fetching rating stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }, [productId])

  /**
   * Effect untuk fetch stats saat component mount
   * TC: O(1), SC: O(1)
   */
  useEffect(() => {
    fetchRatingStats()
  }, [fetchRatingStats])

  /**
   * Memoized star display logic
   * TC: O(1), SC: O(1)
   */
  const starDisplay = useMemo(() => {
    if (!ratingStats || ratingStats.average_rating === 0) {
      return null
    }
    return {
      filledStars: Math.round(ratingStats.average_rating),
      averageDisplay: ratingStats.average_rating.toFixed(1),
    }
  }, [ratingStats])

  /**
   * Handle rating submission dengan optimasi
   * TC: O(1), SC: O(1)
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (rating === 0) {
        alert('Silakan pilih rating bintang terlebih dahulu')
        return
      }

      setIsSubmitting(true)

      try {
        const response = await fetch(API_ENDPOINTS.RATINGS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: productId,
            product_name: productName,
            brand: productBrand,
            tag: productTag,
            rating,
            comment: comment || null,
          }),
          signal: AbortSignal.timeout(TIMEOUT.FETCH),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Gagal mengirim rating')
        }

        // Callback jika provided
        if (onRatingSubmit) {
          await onRatingSubmit(rating, comment)
        }

        // Reset form
        setRating(0)
        setComment('')
        setShowSuccess(true)

        // Refresh stats
        await fetchRatingStats()

        // Hide success message
        const timer = setTimeout(() => setShowSuccess(false), TIMEOUT.TOAST_MESSAGE)
        return () => clearTimeout(timer)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Gagal mengirim rating'
        console.error('Rating error:', error)
        alert(message)
      } finally {
        setIsSubmitting(false)
      }
    },
    [rating, comment, productId, productName, productBrand, productTag, onRatingSubmit, fetchRatingStats]
  )

  /**
   * Memoized comment handler
   * TC: O(n) dimana n = input length, SC: O(1)
   */
  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= 200) {
      setComment(value)
    }
  }, [])

  /**
   * Memoized star rating buttons
   * TC: O(1), SC: O(1)
   */
  const stars = useMemo(() => {
    return [1, 2, 3, 4, 5]
  }, [])

  return compact ? (
    <div className="space-y-1.5">
      {/* Compact Rating Stats */}
      {!isLoadingStats && ratingStats && (
        <div className="flex items-center justify-between rounded-md bg-yellow-50 p-1.5">
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-yellow-700">
              {ratingStats.average_rating > 0 ? starDisplay?.averageDisplay : '-'}
            </span>
            {starDisplay && (
              <div className="flex gap-0.5">
                {stars.map((i) => (
                  <span
                    key={i}
                    className={`text-xs ${
                      i <= starDisplay.filledStars ? 'text-yellow-400' : 'text-neutral-300'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className="text-xs text-neutral-600">({ratingStats.total_ratings})</span>
        </div>
      )}

      {/* Compact Rating Form */}
      <form onSubmit={handleSubmit} className="space-y-1">
        <div className="flex gap-0.5">
          {stars.map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              disabled={disabled}
              className="transition-transform duration-150 hover:scale-125"
              title={`Rate ${star} stars`}
            >
              <span
                className={`text-lg ${
                  star <= (hoveredRating || rating) ? 'text-yellow-400' : 'text-neutral-300'
                }`}
              >
                ★
              </span>
            </button>
          ))}
        </div>

        {rating > 0 && (
          <button
            type="submit"
            disabled={disabled || isSubmitting}
            className="w-full rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:bg-neutral-400 disabled:cursor-not-allowed transition-colors duration-150"
          >
            {isSubmitting ? 'Mengirim...' : 'Kirim'}
          </button>
        )}

        {showSuccess && (
          <div className="rounded-md bg-green-50 p-1 text-xs text-green-700 border border-green-200 text-center">
            ✓ Berhasil
          </div>
        )}
      </form>
    </div>
  ) : (
    <div className="space-y-3 border-t border-neutral-200 pt-4">
      {/* Rating Stats Box - Memoized */}
      {!isLoadingStats && ratingStats && (
        <div className="rounded-lg bg-emerald-50 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-neutral-600">Rating Produk</p>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-lg font-bold text-emerald-800">
                  {ratingStats.average_rating > 0 ? starDisplay?.averageDisplay : '-'}
                </span>
                {starDisplay && (
                  <div className="flex gap-0.5">
                    {stars.map((i) => (
                      <span
                        key={i}
                        className={`text-sm ${
                          i <= starDisplay.filledStars ? 'text-yellow-400' : 'text-neutral-300'
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-neutral-600">dari {ratingStats.total_ratings}</p>
              <p className="text-xs text-neutral-500">pengguna</p>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="rounded-lg bg-green-50 p-2 text-xs text-green-700 border border-green-200">
          ✓ Rating berhasil disimpan
        </div>
      )}

      {/* Rating Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700">Beri Rating</label>
          <div className="flex gap-1">
            {stars.map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                disabled={disabled}
                className="transition-transform duration-150 hover:scale-110"
              >
                <span
                  className={`text-2xl ${
                    star <= (hoveredRating || rating) ? 'text-yellow-400' : 'text-neutral-300'
                  }`}
                >
                  ★
                </span>
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-1 flex items-center text-xs font-medium text-neutral-700">
                {rating}/5
              </span>
            )}
          </div>
        </div>

        <div>
          <label htmlFor={`comment-${productId}`} className="block text-xs font-medium text-neutral-700">
            Komentar
          </label>
          <textarea
            id={`comment-${productId}`}
            value={comment}
            onChange={handleCommentChange}
            disabled={disabled}
            placeholder="Bagikan pengalaman..."
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-neutral-50 disabled:text-neutral-500"
            rows={2}
          />
          <p className="mt-1 text-xs text-neutral-500">{comment.length}/200</p>
        </div>

        <button
          type="submit"
          disabled={disabled || isSubmitting}
          className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:bg-neutral-400 disabled:cursor-not-allowed transition-colors duration-150"
        >
          {isSubmitting ? 'Mengirim...' : 'Kirim Rating'}
        </button>
      </form>
    </div>
  )
}
