import React, { useState, useEffect } from 'react'

interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt, className, onLoad, onError, ...props }) => {
  const [imageError, setImageError] = useState(false)
  const [imageSrc, setImageSrc] = useState(src)

  useEffect(() => {
    setImageSrc(src)
    setImageError(false)
  }, [src])

  const handleError = () => {
    console.error(`Failed to load image: ${imageSrc}`)
    setImageError(true)
    if (onError) onError({} as React.SyntheticEvent<HTMLImageElement, Event>)
  }

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.log(`Successfully loaded image: ${imageSrc}`)
    if (onLoad) onLoad(e)
  }

  if (imageError || !imageSrc) {
    console.log(`Displaying fallback for: ${alt}`)
    return (
      <div className={`flex items-center justify-center bg-gray-300 text-gray-600 rounded-full ${className}`}>
        {alt.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`rounded-full object-cover ${className}`}
      onError={handleError}
      onLoad={handleLoad}
      {...props}
    />
  )
}
