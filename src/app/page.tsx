'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Spinner from '@/components/ui/spinner'
import Feed from '@/components/Feed'
import { Button } from '@/components/ui/button'

export default function Home() {
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single()
          setUsername(profile?.username || null)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [supabase])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    )
  }

  if (!username) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center px-4 py-8 max-w-md w-full">
          <h1 className="text-4xl font-bold mb-6 text-white">Bienvenue sur Multiverse</h1>
          <p className="text-xl text-gray-300 mb-8">Le Multivers, en Site.</p>
          <Button asChild className="w-full bg-blue-500 text-white font-medium py-2 px-4 rounded transition-all duration-200 ease-in-out hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 btn-animate">
            <Link href="/signin">Commencer l&apos;aventure</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex justify-center space-x-4 mb-8">
          <Button asChild className="bg-purple-500 text-white font-medium py-2 px-4 rounded transition-all duration-200 ease-in-out hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 btn-animate">
            <Link href="/profile">Voir mon profil</Link>
          </Button>
          <Button asChild className="bg-red-500 text-white font-medium py-2 px-4 rounded transition-all duration-200 ease-in-out hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 btn-animate">
            <Link href="/friends">Mes amis</Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold mb-6 text-white text-center">Votre Fil d&apos;Actualité</h1>
        <Feed />
      </div>
    </div>
  )
}
