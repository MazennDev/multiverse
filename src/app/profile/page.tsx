'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import Image from 'next/image'

interface Profile {
  username: string
  avatar_url: string | null
  bio: string[] | null
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [postCount, setPostCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
          setProfile({
            ...data,
            bio: data.bio ? JSON.parse(data.bio) : Array(4).fill(''),
            avatar_url: data.avatar_url || user.user_metadata.avatar_url
          })
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
          bio: JSON.stringify(profile.bio),
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(`${Date.now()}_${file.name}`, file)

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de télécharger l'avatar. Veuillez réessayer.",
          variant: "destructive",
        })
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(data.path)

        setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null)
      }
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Chargement...</div>
  }

  if (!profile) {
    return <div className="flex justify-center items-center h-screen">Profil non trouvé</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="space-y-6">
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
              <label htmlFor="bio" className="block mb-2">Bio</label>
              {(profile.bio || Array(4).fill('')).map((line, index) => (
                <Input
                  key={index}
                  value={line}
                  onChange={(e) => {
                    const newBio = [...(profile.bio || Array(4).fill(''))]
                    newBio[index] = e.target.value.slice(0, 45)
                    setProfile({ ...profile, bio: newBio })
                  }}
                  maxLength={45}
                  className="mb-2"
                />
              ))}
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
              <div className="relative">
                <Image
                  src={profile.avatar_url || '/default-avatar.png'}
                  alt={profile.username}
                  width={100}
                  height={100}
                  className="rounded-full cursor-pointer"
                  onClick={handleAvatarClick}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{profile.username}</h2>
                {(profile.bio || []).map((line, index) => (
                  <p key={index} className="text-gray-400">{line}</p>
                ))}
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
