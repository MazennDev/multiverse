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
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Check if username already exists
        const { data: existingUser, error: checkError } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username)
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError
        }

        if (existingUser) {
          setError("Ce nom d'utilisateur est déjà pris. Veuillez en choisir un autre.")
          return
        }

        // If username is not taken, proceed with the update
        const { error: updateError } = await supabase
          .from('profiles')
          .upsert({ id: user.id, username })

        if (updateError) throw updateError

        toast({
          title: "Succès",
          description: "Votre nom d'utilisateur a été défini avec succès.",
        })
        router.push('/')
        router.refresh()
      }
    } catch (error) {
      console.error('Error setting username:', error)
      setError("Une erreur s'est produite. Veuillez réessayer.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-gray-800 bg-opacity-50 backdrop-blur-md p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-center text-white">Choisissez votre nom d&apos;utilisateur</h1>
        <form onSubmit={handleSubmit}>
          <Input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nom d'utilisateur"
            className="mb-4"
          />
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <Button type="submit" disabled={loading || !username} className="w-full">
            {loading ? 'Chargement...' : 'Confirmer'}
          </Button>
        </form>
      </div>
    </div>
  )
}
