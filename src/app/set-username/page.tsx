'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SetUsername() {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, username })

      if (error) {
        console.error('Error setting username:', error)
      } else {
        router.push('/')
        router.refresh() // Force a refresh to update the Navbar
      }
    }

    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-purple-900 to-blue-900 p-4">
      <h1 className="text-4xl font-bold text-white mb-8">Choisissez votre nom d&apos;utilisateur</h1>
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <Input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Nom d'utilisateur"
          className="mb-4"
        />
        <Button type="submit" disabled={loading || !username} className="w-full">
          {loading ? 'Chargement...' : 'Confirmer'}
        </Button>
      </form>
    </div>
  )
}
