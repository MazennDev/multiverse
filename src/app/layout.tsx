import './globals.css'
import { Exo_2 } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SpaceBackground from '@/components/SpaceBackground'

const exo2 = Exo_2({ subsets: ['latin'] })

export const metadata = {
  title: 'Multiverse',
  description: 'Le Multivers, en Site.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={`${exo2.className} flex flex-col min-h-screen`}>
        <SpaceBackground />
        <Navbar />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
        <Toaster />
      </body>
    </html>
  )
}
