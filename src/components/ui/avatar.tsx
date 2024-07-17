import React, { useState } from 'react'

interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt, className, ...props }) => {
  const [imageError, setImageError] = useState(false)

  if (imageError || !src) {
    return (
      <div className={`flex items-center justify-center bg-gray-300 text-gray-600 rounded-full ${className}`}>
        {alt.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`rounded-full object-cover ${className}`}
      onError={() => setImageError(true)}
      {...props}
    />
  )
}
