'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/auth-helpers-nextjs'
import { Avatar } from './ui/avatar'
import { Button } from './ui/button'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

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
  const supabase = createClientComponentClient()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchPosts()
    fetchCurrentUser()
  }, [])

  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<{ username: string, avatar_url: string } | null>(null)

const fetchCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  setCurrentUser(user)
  if (user) {
    const { data, error } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single()
    if (!error && data) {
      setCurrentUserProfile(data)
    }
  }
}


  const fetchPosts = async () => {
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
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', post.user_id)
            .single()
  
          if (userError) throw userError
  
          return {
            ...post,
            user: userData
          }
        }))
  
        setPosts(postsWithUsers)
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des posts:', error)
    } finally {
      setLoading(false)
    }
  }
  

  const getAvatarUrl = (avatarPath: string | null) => {
    if (!avatarPath) return '/default-avatar.png'
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath
    }
    const supabase = createClientComponentClient()
    const { data } = supabase.storage.from('avatars').getPublicUrl(avatarPath)
    return data.publicUrl
  }
  

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPostContent.trim() || !currentUser) return

    setCreatingPost(true)
    try {
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert({ content: newPostContent, user_id: currentUser.id })
        .select('id, content, created_at, user_id')
        .single()

      if (postError) throw postError

      if (postData) {
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', currentUser.id)
          .single()

        if (userError) throw userError

        const newPost: Post = {
          ...postData,
          user: {
            username: userData.username,
            avatar_url: userData.avatar_url
          }
        }

        setPosts(prevPosts => [newPost, ...prevPosts])
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

  return (
    <div className="max-w-2xl mx-auto">
      {currentUser && (
        <form onSubmit={createPost} className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-4">
            <Avatar
                src={currentUserProfile ? getAvatarUrl(currentUserProfile.avatar_url) : '/default-avatar.png'}
                alt={currentUserProfile?.username || ''}
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
                  src={getAvatarUrl(post.user.avatar_url)}
                  alt={post.user.username}
                  className="w-10 h-10"
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