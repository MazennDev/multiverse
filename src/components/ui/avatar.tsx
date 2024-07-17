import * as React from 'react'

interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt, className, ...props }) => {
  return (
    <img
      src={src}
      alt={alt}
      className={`rounded-full object-cover ${className}`}
      {...props}
    />
  )
}
