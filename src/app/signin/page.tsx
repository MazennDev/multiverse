'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FaGoogle, FaDiscord } from 'react-icons/fa'
import Spinner from '@/components/ui/spinner'

export default function SignIn() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single()
        
        if (profile?.username) {
          router.push('/')
        } else {
          router.push('/set-username')
        }
      } else {
        setLoading(false)
      }
    }
    checkUser()
  }, [supabase, router])

  const handleSignIn = async (provider: 'google' | 'discord') => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error) {
      console.error('Error:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl font-bold text-white mb-8">Connexion à Multiverse</h1>
      <div className="space-y-4">
        <Button
          onClick={() => handleSignIn('google')}
          className="w-full bg-transparent hover:bg-white hover:bg-opacity-10 transition duration-300"
        >
          <FaGoogle className="mr-2" />
          Se connecter avec Google
        </Button>
        <Button
          onClick={() => handleSignIn('discord')}
          className="w-full bg-transparent hover:bg-white hover:bg-opacity-10 transition duration-300"
        >
          <FaDiscord className="mr-2" />
          Se connecter avec Discord
        </Button>
      </div>
    </div>
  )
}
