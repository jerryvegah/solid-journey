"use client"

import Image from 'next/image'
import { useEffect, useState } from 'react'

type Props = {
  images: string[]
  intervalMs?: number
}

export default function GalleryCarousel({ images, intervalMs = 2000 }: Props) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!images || images.length === 0) return
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length)
    }, intervalMs)
    return () => clearInterval(id)
  }, [images, intervalMs])

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <div className="relative h-52 md:h-72 rounded overflow-hidden">
        {images.map((src, i) => (
          <div key={src} className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`} aria-hidden={i !== index}>
            <Image src={src} alt={`Featured ${i + 1}`} fill className="object-cover" priority={i===0} />
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-2 mt-3">
        {images.map((_, i) => (
          <button key={i} onClick={() => setIndex(i)} className={`w-2 h-2 rounded-full ${i === index ? 'bg-[#D4AF37]' : 'bg-gray-300'}`} aria-label={`Go to slide ${i+1}`} />
        ))}
      </div>
    </div>
  )
}
