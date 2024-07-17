'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FaGoogle, FaDiscord } from 'react-icons/fa'

export default function SignIn() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSignIn = async (provider: 'google' | 'discord') => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (error) throw error
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-purple-900 to-blue-900 p-4">
      <h1 className="text-4xl font-bold text-white mb-8">Connexion à Multiverse</h1>
      <div className="space-y-4">
        <Button
          onClick={() => handleSignIn('google')}
          disabled={loading}
          className="w-full"
        >
          <FaGoogle className="mr-2" />
          Se connecter avec Google
        </Button>
        <Button
          onClick={() => handleSignIn('discord')}
          disabled={loading}
          className="w-full"
        >
          <FaDiscord className="mr-2" />
          Se connecter avec Discord
        </Button>
      </div>
    </div>
  )
}
