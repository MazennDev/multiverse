'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/use-toast'
import Image from 'next/image'
import Spinner from '@/components/ui/spinner'

interface Profile {
  username: string
  avatar_url: string | null
  bio: string
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
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('username, avatar_url, bio')
            .eq('id', user.id)
            .single()

          if (error) throw error

          setProfile({
            ...data,
            bio: data.bio || '',
            avatar_url: data.avatar_url || user.user_metadata.avatar_url
          })

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
      } catch (error) {
        console.error('Error fetching profile:', error)
        toast({
          title: "Erreur",
          description: "Impossible de charger le profil. Veuillez réessayer.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    getProfile()
  }, [supabase])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
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

        if (error) throw error

        toast({
          title: "Succès",
          description: "Votre profil a été mis à jour avec succès.",
        })
        setEditing(false)
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le profil. Veuillez réessayer.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not found')
  
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}${Math.random()}.${fileExt}`
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('avatars')
          .upload(fileName, file)
  
        if (uploadError) throw uploadError
  
        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(uploadData.path)
  
        const publicUrl = data.publicUrl
  
        setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null)
  
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id)
  
        if (updateError) throw updateError
  
        toast({
          title: "Succès",
          description: "Votre avatar a été mis à jour avec succès.",
        })
      } catch (error) {
        console.error('Error uploading avatar:', error)
        toast({
          title: "Erreur",
          description: "Impossible de télécharger l'avatar. Veuillez réessayer.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
  }  

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    )
  }

  if (!profile) {
    return <div className="flex justify-center items-center h-screen">Profil non trouvé</div>
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="bg-gray-800 bg-opacity-50 backdrop-blur-md rounded-3xl shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">Profil</h1>
        {editing ? (
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="flex flex-col items-center mb-4">
              <div className="relative mb-4">
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
                <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-2 cursor-pointer" onClick={handleAvatarClick}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              </div>
              <div className="w-full">
                <label htmlFor="username" className="block mb-2 text-center">Nom d'utilisateur</label>
                <Input
                  id="username"
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  className="rounded-full text-center"
                />
              </div>
            </div>
            <div>
              <label htmlFor="bio" className="block mb-2 text-center">Bio</label>
              <textarea
                id="bio"
                value={profile.bio}
                onChange={(e) => {
                  const lines = e.target.value.split('\n').slice(0, 4)
                  const newBio = lines.map(line => line.slice(0, 45)).join('\n')
                  setProfile({ ...profile, bio: newBio })
                }}
                maxLength={184} // 4 lines * 45 characters + 4 newline characters
                rows={4}
                className="w-full p-2 bg-gray-700 text-white rounded-2xl resize-none text-center"
                placeholder="Écrivez votre bio ici (4 lignes max, 45 caractères par ligne)"
              />
            </div>
            <div className="flex space-x-4">
              <Button type="submit" disabled={loading} className="flex-1 rounded-full">
                {loading ? 'Mise à jour...' : 'Mettre à jour le profil'}
              </Button>
              <Button type="button" onClick={() => setEditing(false)} variant="outline" className="flex-1 rounded-full">
                Annuler
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <Image
                src={profile.avatar_url || '/default-avatar.png'}
                alt={profile.username}
                width={100}
                height={100}
                className="rounded-full"
              />
              <h2 className="text-2xl font-bold text-center">{profile.username}</h2>
              <pre className="text-gray-400 mt-2 whitespace-pre-wrap font-sans text-center w-full">{profile.bio || 'Aucune bio'}</pre>
            </div>
            <div className="flex justify-between text-center">
              <div>
                <p className="font-bold text-2xl">{followerCount}</p>
                <p className="text-gray-400">Abonnés</p>
              </div>
              <div>
                <p className="font-bold text-2xl">{followingCount}</p>
                <p className="text-gray-400">Abonnements</p>
              </div>
              <div>
                <p className="font-bold text-2xl">{postCount}</p>
                <p className="text-gray-400">Publications</p>
              </div>
            </div>
            <Button onClick={() => setEditing(true)} className="w-full rounded-full">
              Modifier le profil
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
