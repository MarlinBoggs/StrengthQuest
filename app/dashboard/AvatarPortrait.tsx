'use client'

import { useState } from 'react'

type Props = {
  src: string
  alt: string
}

export default function AvatarPortrait({ src, alt }: Props) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="absolute bottom-0 right-0 h-full object-contain object-bottom pointer-events-none select-none"
      style={{ maxWidth: '45%', opacity: 0.9, maskImage: 'linear-gradient(to right, transparent 0%, black 25%)' }}
    />
  )
}
