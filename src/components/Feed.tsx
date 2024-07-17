'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/auth-helpers-nextjs'
import { Avatar } from './ui/avatar'
import { Button } from './ui/button'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ExtendedUser extends User {
  username?: string
  avatar_url?: string
}

interface Post {
  id: string
  user_id: string
  content: string
  created_at: string
  profiles: {
    username: string
    avatar_url: string | null
  }[] | null
}

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [newPostContent, setNewPostContent] = useState('')
  const [creatingPost, setCreatingPost] = useState(false)
  const [currentUser, setCurrentUser] = useState<ExtendedUser | null>(null)
  const supabase = createClientComponentClient()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchPosts()
    fetchCurrentUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchCurrentUser()
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single()
      if (!error && data) {
        setCurrentUser({
          ...user,
          username: data.username || user.email?.split('@')[0] || 'User',
          avatar_url: data.avatar_url || undefined
        })
      } else {
        console.error('Error fetching user profile:', error)
        setCurrentUser({
          ...user,
          username: user.email?.split('@')[0] || 'User',
          avatar_url: undefined
        })
      }
    } else {
      setCurrentUser(null)
    }
  }

  const fetchPosts = async () => {
    try {
      setLoading(true)
      let { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles(username, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      if (data) {
        setPosts(data as Post[])
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPostContent.trim() || !currentUser) return

    setCreatingPost(true)
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({ content: newPostContent, user_id: currentUser.id })
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles(username, avatar_url)
        `)
        .single()

      if (error) throw error

      if (data) {
        setPosts(prevPosts => [data as Post, ...prevPosts])
        setNewPostContent('')
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto'
        }
      }
    } catch (error) {
      console.error('Erreur lors de la création du post:', error)
    } finally {
      setCreatingPost(false)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewPostContent(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  const getAvatarUrl = (avatarPath: string | null | undefined) => {
    if (!avatarPath) return '/default-avatar.png'
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(avatarPath)
    return data.publicUrl
  }

  return (
    <div className="max-w-2xl mx-auto">
      {currentUser && (
        <form onSubmit={createPost} className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-4">
            <Avatar
              src={getAvatarUrl(currentUser.avatar_url)}
              alt={currentUser.username || ''}
              className="w-10 h-10"
            />
            <div className="flex-grow">
              <textarea
                ref={textareaRef}
                value={newPostContent}
                onChange={handleTextareaChange}
                placeholder="Quoi de neuf ?"
                className="w-full p-2 bg-transparent text-white resize-none overflow-hidden focus:outline-none"
                rows={1}
                style={{minHeight: '2.5rem'}}
              />
              <div className="flex justify-end mt-2">
                <Button
                  type="submit"
                  disabled={creatingPost || !newPostContent.trim()}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded-full text-sm"
                >
                  {creatingPost ? 'Publication...' : 'Publier'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
      {loading ? (
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 shadow-md">
              <div className="flex items-start space-x-3">
                <Avatar
                  src={getAvatarUrl(post.profiles?.[0]?.avatar_url)}
                  alt={post.profiles?.[0]?.username || 'User'}
                  className="w-10 h-10"
                />
                <div className="flex-grow">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white">{post.profiles?.[0]?.username || 'Unknown User'}</span>
                    <span className="text-sm text-gray-400">
                      · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                  <p className="text-gray-200 mt-1">{post.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
