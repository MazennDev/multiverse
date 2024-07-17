'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'

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
        toast({
          title: "Erreur",
          description: "Impossible de définir le nom d'utilisateur. Veuillez réessayer.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Succès",
          description: "Votre nom d'utilisateur a été défini avec succès.",
        })
        router.push('/')
        router.refresh() // Force a refresh to update the Navbar
      }
    }

    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="card w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">Choisissez votre nom d&apos;utilisateur</h1>
        <form onSubmit={handleSubmit}>
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
    </div>
  )
}
