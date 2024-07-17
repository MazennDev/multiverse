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
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">Multiverse</Link>
        <div>
          <Link href="/" className="mr-4">Accueil</Link>
          {username ? (
            <>
              <Link href="/dashboard" className="mr-4">Tableau de bord</Link>
              <span className="mr-4">{username}</span>
              <button onClick={handleSignOut}>Déconnexion</button>
            </>
          ) : (
            <Link href="/signin">Connexion</Link>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
