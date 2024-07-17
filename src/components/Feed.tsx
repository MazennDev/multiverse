'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Spinner from './ui/spinner'

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
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non trouvé')

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
        .limit(10)

      if (error) throw error

      if (data) {
        const formattedPosts: Post[] = data.map(post => ({
          ...post,
          user: post.user[0] // Access the first (and only) user object in the array
        }))
        setPosts(formattedPosts)
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des posts:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Spinner />
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div key={post.id} className="bg-gray-800 rounded-lg p-4 shadow-md">
          <div className="flex items-center mb-2">
            <img
              src={post.user.avatar_url || '/default-avatar.png'}
              alt={post.user.username}
              className="w-10 h-10 rounded-full mr-3"
            />
            <div>
              <p className="font-semibold">{post.user.username}</p>
              <p className="text-xs text-gray-400">
                {new Date(post.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <p className="text-gray-200">{post.content}</p>
        </div>
      ))}
    </div>
  )
}
