import './globals.css'
import type { Metadata } from 'next'
import { Exo_2 } from 'next/font/google'
import { Toaster } from "@/components/ui/toaster"

const exo2 = Exo_2({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Multiverse',
  description: 'Une plateforme sociale pour les amis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={exo2.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
