'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Avatar } from './ui/avatar'
import { Button } from './ui/button'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { User as SupabaseUser } from '@supabase/auth-helpers-nextjs'
import { RealtimeChannel } from '@supabase/supabase-js'

interface User extends SupabaseUser {
  username?: string
  avatar_url?: string
}

interface Post {
  id: string
  user_id: string
  content: string
  created_at: string
  user: {
    username: string
    avatar_url: string
  }
}

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [newPostContent, setNewPostContent] = useState('')
  const [creatingPost, setCreatingPost] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const supabase = createClientComponentClient()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    fetchPosts()
    fetchCurrentUser()
    setupRealtimeSubscription()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchCurrentUser()
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current)
      }
    }
  }, [])

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, handleNewPost)
      .subscribe()

    realtimeChannelRef.current = channel
  }

  const handleNewPost = async (payload: any) => {
    const newPost = payload.new as Post
    if (newPost.user_id !== currentUser?.id) {
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', newPost.user_id)
        .single()

      if (userError) {
        console.error('Error fetching user data for new post:', userError)
        return
      }

      const fullNewPost: Post = {
        ...newPost,
        user: {
          username: userData.username,
          avatar_url: getAvatarUrl(userData.avatar_url)
        }
      }

      setPosts(currentPosts => [fullNewPost, ...currentPosts])
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single()
        
        if (error) throw error
  
        if (data) {
          setCurrentUser({
            ...user,
            username: data.username || user.email?.split('@')[0] || 'User',
            avatar_url: getAvatarUrl(data.avatar_url)
          })
        } else {
          throw new Error('No profile data found')
        }
      } else {
        setCurrentUser(null)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      // In case of error, set user with default values
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUser({
          ...user,
          username: user.email?.split('@')[0] || 'User',
          avatar_url: getAvatarUrl(undefined)
        })
      }
    }
  }
  
  const fetchPosts = async (retries = 3) => {
    try {
      setLoading(true)
      let { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, content, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(20)
  
      if (postsError) throw postsError
  
      if (postsData) {
        const postsWithUsers = await Promise.all(postsData.map(async (post) => {
          try {
            const { data: userData, error: userError } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', post.user_id)
              .single()
  
            if (userError) throw userError
  
            return {
              ...post,
              user: {
                ...userData,
                avatar_url: getAvatarUrl(userData.avatar_url)
              }
            }
          } catch (error) {
            console.error(`Error fetching user data for post ${post.id}:`, error)
            return {
              ...post,
              user: {
                username: 'Unknown User',
                avatar_url: getAvatarUrl(undefined)
              }
            }
          }
        }))

       setPosts(postsWithUsers)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
      if (retries > 0) {
        console.log(`Retrying fetch posts (${retries} attempts left)`)
        setTimeout(() => fetchPosts(retries - 1), 1000)
      }
    } finally {
      setLoading(false)
    }
  }
  
  const getAvatarUrl = (avatarPath: string | null | undefined) => {
    if (!avatarPath) return '/default-avatar.png'
    if (avatarPath.startsWith('data:image')) {
      return avatarPath // Return the base64 string as is
    }
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(avatarPath)
    return data.publicUrl
  }  
  
  const createPost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPostContent.trim() || !currentUser) return
  
    setCreatingPost(true)
    try {
      const newPost: Post = {
        id: Date.now().toString(), // Temporary ID
        user_id: currentUser.id,
        content: newPostContent,
        created_at: new Date().toISOString(),
        user: {
          username: currentUser.username || '',
          avatar_url: currentUser.avatar_url || ''
        }
      }

      // Optimistically update the UI
      setPosts(prevPosts => [newPost, ...prevPosts])

      // Actually create the post in the database
      const { error: postError } = await supabase
        .from('posts')
        .insert({ content: newPostContent, user_id: currentUser.id })
  
      if (postError) throw postError
  
      setNewPostContent('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('Erreur lors de la création du post:', error)
      // If there's an error, remove the optimistically added post
      setPosts(prevPosts => prevPosts.filter(post => post.id !== Date.now().toString()))
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

  return (
    <div className="max-w-2xl mx-auto">
      {currentUser && (
        <form onSubmit={createPost} className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-4">
            <Avatar
              src={getAvatarUrl(currentUser.avatar_url)}
              alt={currentUser.username || ''}
              className="w-10 h-10"
              onError={(e) => {
                console.error(`Failed to load avatar for ${currentUser.username}`)
                e.currentTarget.src = '/default-avatar.png'
              }}
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
                  src={getAvatarUrl(post.user.avatar_url)}
                  alt={post.user.username}
                  className="w-10 h-10"
                  onError={(e) => {
                    console.error(`Failed to load avatar for ${post.user.username}`);
                    e.currentTarget.src = '/default-avatar.png';
                  }}
                />
                <div className="flex-grow">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-white">{post.user.username}</span>
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
