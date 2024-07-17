'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Spinner from '@/components/ui/spinner'
import Feed from '@/components/Feed'

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
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-6 text-white">Bienvenue sur Multiverse</h1>
          <p className="text-xl text-gray-300 mb-8">Le Multivers, en Site.</p>
          <Link href="/signin" className="text-blue-300 hover:text-blue-400 transition duration-300">
            Commencer l&apos;aventure
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-white">Votre Fil d&apos;Actualité</h1>
      <Feed />
      <div className="mt-8 space-x-4 text-center">
        <Link href="/profile" className="text-blue-300 hover:text-blue-400 transition duration-300">
          Voir mon profil
        </Link>
        <Link href="/friends" className="text-blue-300 hover:text-blue-400 transition duration-300">
          Mes amis
        </Link>
      </div>
    </div>
  )
}
