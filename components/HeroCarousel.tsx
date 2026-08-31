'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'

export interface BannerItem {
  id: string
  title: string
  subtitle?: string | null
  imageUrl?: string | null
  linkUrl?: string | null
  buttonText?: string | null
  active: boolean
  order: number
}

interface HeroCarouselProps {
  banners: BannerItem[]
}

export function HeroCarousel({ banners }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const count = banners.length

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (count > 1) {
      intervalRef.current = setInterval(() => {
        setCurrent((prev) => (prev + 1) % count)
      }, 5000)
    }
  }, [count])

  useEffect(() => {
    if (!paused) startInterval()
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [paused, startInterval])

  // Keep current index in bounds if banners array changes
  useEffect(() => {
    setCurrent((prev) => (count > 0 ? Math.min(prev, count - 1) : 0))
  }, [count])

  if (count === 0) return null

  function goTo(index: number) {
    setCurrent(index)
    startInterval()
  }

  const banner = banners[current]

  return (
    <div className="w-full rounded-xl overflow-hidden shadow-sm border border-gray-100">
      {/* Image area — pure, no overlays */}
      <div
        className="relative w-full bg-gray-50"
        style={{ paddingBottom: '38%', minHeight: '200px', maxHeight: '460px' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {banners.map((b, index) => (
          <div
            key={b.id}
            aria-hidden={index !== current}
            className="absolute inset-0 w-full h-full"
            style={{
              opacity: index === current ? 1 : 0,
              transition: 'opacity 0.5s ease-in-out',
              zIndex: index === current ? 1 : 0,
            }}
          >
            {b.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={b.imageUrl}
                alt={b.title}
                className="absolute inset-0 w-full h-full"
                style={{ objectFit: 'contain', objectPosition: 'center' }}
              />
            ) : (
              /* No image: show title centered on colored bg */
              <div className="absolute inset-0 flex items-center justify-center bg-indigo-600">
                <span className="text-white text-2xl font-bold px-8 text-center">{b.title}</span>
              </div>
            )}
          </div>
        ))}

        {/* Navigation arrows */}
        {count > 1 && (
          <>
            <button
              onClick={() => goTo((current - 1 + count) % count)}
              aria-label="Anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-gray-700 text-xl flex items-center justify-center shadow-md transition"
            >
              ‹
            </button>
            <button
              onClick={() => goTo((current + 1) % count)}
              aria-label="Siguiente"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-gray-700 text-xl flex items-center justify-center shadow-md transition"
            >
              ›
            </button>
          </>
        )}

        {/* Dot indicators — inside image, bottom center */}
        {count > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => goTo(index)}
                aria-label={`Banner ${index + 1}`}
                className="rounded-full transition-all duration-300"
                style={{
                  width: index === current ? '20px' : '8px',
                  height: '8px',
                  backgroundColor:
                    index === current ? '#4f46e5' : 'rgba(0,0,0,0.25)',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Caption bar — only shown if there's a linkUrl (no title/subtitle display) */}
      {banner.linkUrl && (
        <div className="bg-white px-5 py-3 flex items-center justify-end border-t border-gray-100">
          <Link
            href={banner.linkUrl}
            className="flex-shrink-0 px-4 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-full hover:bg-indigo-700 transition"
          >
            {banner.buttonText || 'Ver más'}
          </Link>
        </div>
      )}
    </div>
  )
}
