'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import Spinner from '@/components/ui/spinner'
import Feed from '@/components/Feed'
import { Button } from '@/components/ui/button'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    fetchUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setUser(session?.user ?? null)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center px-4 py-8 max-w-md w-full">
          <h1 className="text-4xl font-bold mb-6 text-white">Bienvenue sur Multiverse</h1>
          <p className="text-xl text-gray-300 mb-8">Le Multivers, en Site.</p>
          <Button asChild className="w-full bg-blue-500/10 dark:bg-blue-500/10 text-blue-700 dark:text-blue-200 font-medium py-2 px-4 rounded transition-all duration-200 ease-in-out hover:bg-blue-500/20 dark:hover:bg-blue-500/20 hover:text-blue-800 dark:hover:text-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 btn-animate">
            <Link href="/signin">Commencer l&apos;aventure</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6 text-white text-center">Multivers</h1>
      <p className="text-xl text-gray-300 mb-8">Le Multivers, en Site.</p>
        <div className="flex justify-center space-x-4 mb-8">
          <Button asChild className="bg-indigo-500/10 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-200 font-medium py-2 px-4 rounded transition-all duration-200 ease-in-out hover:bg-indigo-500/20 dark:hover:bg-indigo-500/20 hover:text-indigo-800 dark:hover:text-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 btn-animate">
            <Link href="/profile">Voir mon profil</Link>
          </Button>
          <Button asChild className="bg-red-500/10 dark:bg-red-500/10 text-red-700 dark:text-red-200 font-medium py-2 px-4 rounded transition-all duration-200 ease-in-out hover:bg-red-500/20 dark:hover:bg-red-500/20 hover:text-red-800 dark:hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-red-500/50 btn-animate">
            <Link href="/friends">Mes amis</Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold mb-6 text-white text-center">Feed</h1>
        <Feed />
      </div>
    </div>
  )
}
