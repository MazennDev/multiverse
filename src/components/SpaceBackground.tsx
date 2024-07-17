'use client'

import { useEffect, useRef } from 'react'

const SpaceBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const stars: { x: number; y: number; radius: number; vx: number; vy: number; alpha: number }[] = []

    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.5,
        vx: Math.random() * 0.2 - 0.1,
        vy: Math.random() * 0.2 - 0.1,
        alpha: Math.random()
      })
    }

    let gradientOffset = 0

    function animate() {
      if (!canvas || !ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Create a gradient with dark purple, dark blue, and dark red
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, `rgb(${30 + Math.sin(gradientOffset) * 10}, 0, ${50 + Math.sin(gradientOffset) * 20})`) // Dark purple
      gradient.addColorStop(0.5, `rgb(0, 0, ${40 + Math.sin(gradientOffset + Math.PI/2) * 20})`) // Dark blue
      gradient.addColorStop(1, `rgb(${40 + Math.sin(gradientOffset + Math.PI) * 20}, 0, 0)`) // Dark red
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      stars.forEach(star => {
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`
        ctx.fill()

        star.x += star.vx
        star.y += star.vy
        star.alpha += Math.random() * 0.1 - 0.05

        if (star.alpha < 0) star.alpha = 0
        if (star.alpha > 1) star.alpha = 1

        if (star.x < 0 || star.x > canvas.width) star.vx = -star.vx
        if (star.y < 0 || star.y > canvas.height) star.vy = -star.vy
      })

      gradientOffset += 0.01
      requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full -z-10" />
}

export default SpaceBackground
