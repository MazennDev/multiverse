'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'

const Navbar = () => {
  const [username, setUsername] = useState<string | null>(null)
  const router = useRouter()
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
      }
    }
    getUser()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUsername(null)
    router.push('/')
  }

  return (
    <nav className="bg-gray-800 bg-opacity-50 backdrop-blur-md text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">Multiverse</Link>
        <div className="space-x-4">
          <Link href="/">Accueil</Link>
          {username ? (
            <>
              <Link href="/profile">Profil</Link>
              <Link href="/friends">Amis</Link>
              <button onClick={handleSignOut} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded">Déconnexion</button>
            </>
          ) : (
            <Link href="/signin" className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded">Connexion</Link>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
