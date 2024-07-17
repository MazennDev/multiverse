'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import Image from 'next/image'

interface Profile {
  username: string
  avatar_url: string | null
  bio: string | null
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [postCount, setPostCount] = useState(0)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url, bio')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error fetching profile:', error)
        } else {
          setProfile(data)
        }

        // Fetch counts
        const [{ count: followers }, { count: following }, { count: posts }] = await Promise.all([
          supabase.from('followers').select('*', { count: 'exact' }).eq('following_id', user.id),
          supabase.from('followers').select('*', { count: 'exact' }).eq('follower_id', user.id),
          supabase.from('posts').select('*', { count: 'exact' }).eq('user_id', user.id)
        ])
        setFollowerCount(followers || 0)
        setFollowingCount(following || 0)
        setPostCount(posts || 0)
      }
      setLoading(false)
    }

    getProfile()
  }, [supabase])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (user && profile) {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: profile.username,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
        })
        .eq('id', user.id)

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour le profil. Veuillez réessayer.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Succès",
          description: "Votre profil a été mis à jour avec succès.",
        })
        setEditing(false)
      }
    }

    setLoading(false)
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Chargement...</div>
  }

  if (!profile) {
    return <div className="flex justify-center items-center h-screen">Profil non trouvé</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="bg-gray-800 bg-opacity-50 backdrop-blur-md rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">Profil</h1>
        {editing ? (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label htmlFor="username" className="block mb-2">Nom d'utilisateur</label>
              <Input
                id="username"
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="avatar" className="block mb-2">URL de l'avatar</label>
              <Input
                id="avatar"
                value={profile.avatar_url || ''}
                onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
            <div>
              <label htmlFor="bio" className="block mb-2">Bio</label>
              <Textarea
                id="bio"
                value={profile.bio || ''}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              />
            </div>
            <div className="flex space-x-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Mise à jour...' : 'Mettre à jour le profil'}
              </Button>
              <Button type="button" onClick={() => setEditing(false)} variant="outline" className="flex-1">
                Annuler
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              {profile.avatar_url && (
                <Image
                  src={profile.avatar_url}
                  alt={profile.username}
                  width={100}
                  height={100}
                  className="rounded-full"
                />
              )}
              <div>
                <h2 className="text-2xl font-bold">{profile.username}</h2>
                <p className="text-gray-400">{profile.bio || 'Aucune bio'}</p>
              </div>
            </div>
            <div className="flex justify-between text-center">
              <div>
                <p className="font-bold">{followerCount}</p>
                <p className="text-gray-400">Abonnés</p>
              </div>
              <div>
                <p className="font-bold">{followingCount}</p>
                <p className="text-gray-400">Abonnements</p>
              </div>
              <div>
                <p className="font-bold">{postCount}</p>
                <p className="text-gray-400">Publications</p>
              </div>
            </div>
            <Button onClick={() => setEditing(true)} className="w-full">
              Modifier le profil
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
