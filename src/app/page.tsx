'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function Home() {
  const [username, setUsername] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single()
        setUsername(profile?.username || null)
      } else {
        setUsername(null)
      }
    }

    getUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        getUser()
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-6 text-white">Bienvenue sur Multiverse</h1>
        <p className="text-xl text-gray-300 mb-8">Le Multivers, en Site.</p>
        {username ? (
          <div className="space-x-4">
            <Link href="/profile" className="text-blue-300 hover:text-blue-400 transition duration-300">
              Voir mon profil
            </Link>
            <Link href="/friends" className="text-blue-300 hover:text-blue-400 transition duration-300">
              Mes amis
            </Link>
          </div>
        ) : (
          <Link href="/signin" className="text-blue-300 hover:text-blue-400 transition duration-300">
            Commencer l&apos;aventure
          </Link>
        )}
      </div>
    </div>
  )
}
