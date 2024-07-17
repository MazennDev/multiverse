'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { HeartIcon, ChatBubbleLeftIcon, ShareIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import Spinner from '@/components/ui/spinner'

interface Profile {
  id: string
  username: string
  avatar_url: string | null
  bio: string
}

interface Post {
  id: string
  user_id: string
  content: string
  image_url?: string
  created_at: string
  likes: number
  comment_count: number
  user: {
    username: string
    avatar_url: string
  }
}

export default function ProfilePage() {
  const params = useParams()
  const username = params.username as string
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [postCount, setPostCount] = useState(0)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchProfileAndPosts()
    fetchLikedPosts()
  }, [username])

  const fetchProfileAndPosts = async () => {
    try {
      setLoading(true)
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()

      if (profileError) throw profileError

      setProfile(profileData)

      // Fetch user's posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*, user:profiles(username, avatar_url)')
        .eq('user_id', profileData.id)
        .order('created_at', { ascending: false })

      if (postsError) throw postsError

      setPosts(postsData)
      setPostCount(postsData.length)

      // Fetch counts
      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase.from('followers').select('*', { count: 'exact' }).eq('following_id', profileData.id),
        supabase.from('followers').select('*', { count: 'exact' }).eq('follower_id', profileData.id)
      ])
      setFollowerCount(followers || 0)
      setFollowingCount(following || 0)
    } catch (error) {
      console.error('Error fetching profile and posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLikedPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id)
      if (error) {
        console.error('Error fetching liked posts:', error)
      } else {
        setLikedPosts(new Set(data.map(like => like.post_id)))
      }
    }
  }

  const handleLike = async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const isLiked = likedPosts.has(postId)
    try {
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId)
        setLikedPosts(prev => {
          const newSet = new Set(prev)
          newSet.delete(postId)
          return newSet
        })
      } else {
        await supabase
          .from('likes')
          .insert({ user_id: user.id, post_id: postId })
        setLikedPosts(prev => new Set(prev).add(postId))
      }
      const { data } = await supabase
        .from('posts')
        .select('likes')
        .eq('id', postId)
        .single()
      const newLikesCount = isLiked ? (data?.likes || 1) - 1 : (data?.likes || 0) + 1
      await supabase
        .from('posts')
        .update({ likes: newLikesCount })
        .eq('id', postId)
      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId ? { ...post, likes: newLikesCount } : post
        )
      )
    } catch (error) {
      console.error('Error handling like:', error)
    }
  }

  const getAvatarUrl = (avatarPath: string | null | undefined) => {
    if (!avatarPath) return '/default-avatar.png'
    if (avatarPath.startsWith('data:image')) {
      return avatarPath
    }
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(avatarPath)
    return data?.publicUrl || '/default-avatar.png'
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
        <div className="flex flex-col items-center space-y-4 mb-6">
          <img
            src={getAvatarUrl(profile.avatar_url)}
            alt={profile.username}
            className="w-24 h-24 rounded-full object-cover"
          />
          <h2 className="text-2xl font-bold text-center">{profile.username}</h2>
          <pre className="text-gray-400 mt-2 whitespace-pre-wrap font-sans text-center w-full">{profile.bio || 'Aucune bio'}</pre>
        </div>
        <div className="flex justify-center items-start text-center mb-6">
          <div className="w-24">
            <p className="font-bold text-2xl">{followerCount}</p>
            <p className="text-gray-400 text-sm">Abonnés</p>
          </div>
          <div className="w-28 border-x border-gray-600 px-2">
            <p className="font-bold text-2xl">{followingCount}</p>
            <p className="text-gray-400 text-sm">Abonnements</p>
          </div>
          <div className="w-24">
            <p className="font-bold text-2xl">{postCount}</p>
            <p className="text-gray-400 text-sm">Publications</p>
          </div>
        </div>
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-gray-700 bg-opacity-50 rounded-xl p-4 shadow-md">
              <div className="flex items-start space-x-3">
                <img
                  src={getAvatarUrl(post.user.avatar_url)}
                  alt={post.user.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-grow">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white">{post.user.username}</span>
                    <span className="text-sm text-gray-400">
                      · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                  <p className="text-gray-200 mt-1">{post.content}</p>
                  {post.image_url && (
                    <img src={post.image_url} alt="Post image" className="mt-2 rounded-lg max-h-96 w-full object-cover" />
                  )}
                  <div className="flex items-center space-x-4 mt-3">
                    <button
                      onClick={() => handleLike(post.id)}
                      className="flex items-center space-x-1 text-gray-400 hover:text-red-500"
                    >
                      {likedPosts.has(post.id) ? (
                        <HeartSolidIcon className="w-5 h-5 text-red-500" />
                      ) : (
                        <HeartIcon className="w-5 h-5" />
                      )}
                      <span>{post.likes}</span>
                    </button>
                    <button className="flex items-center space-x-1 text-gray-400 hover:text-blue-500">
                      <ChatBubbleLeftIcon className="w-5 h-5" />
                      <span>{post.comment_count}</span>
                    </button>
                    <button className="flex items-center space-x-1 text-gray-400 hover:text-green-500">
                      <ShareIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
