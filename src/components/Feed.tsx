'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/auth-helpers-nextjs'
import { Avatar } from './ui/avatar'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
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
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const supabase = createClientComponentClient()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchPosts()
    fetchCurrentUser()
  }, [])

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
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
          user:profiles(username, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      if (data) {
        const formattedPosts: Post[] = data.map(post => ({
          ...post,
          user: post.user[0]
        }))
        setPosts(formattedPosts)
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const createPost = async () => {
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
          user:profiles(username, avatar_url)
        `)
        .single()

      if (error) throw error

      if (data) {
        const newPost: Post = {
          ...data,
          user: data.user[0]
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
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-4">
            <Avatar
              src={currentUser.user_metadata.avatar_url || '/default-avatar.png'}
              alt={currentUser.user_metadata.username}
              className="w-12 h-12"
            />
            <div className="flex-grow">
              <Textarea
                ref={textareaRef}
                value={newPostContent}
                onChange={handleTextareaChange}
                placeholder="Quoi de neuf ?"
                className="w-full mb-2 bg-gray-700/50 text-white resize-none overflow-hidden"
                rows={1}
              />
              <div className="flex justify-end">
                <Button
                  onClick={createPost}
                  disabled={creatingPost || !newPostContent.trim()}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full"
                >
                  {creatingPost ? 'Publication...' : 'Publier'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {loading ? (
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post.id} className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-4 shadow-md">
              <div className="flex items-start space-x-3">
                <Avatar
                  src={post.user.avatar_url || '/default-avatar.png'}
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
