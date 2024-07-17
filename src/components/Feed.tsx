'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Spinner from './ui/spinner'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'

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
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const supabase = createClientComponentClient()
  const observerTarget = useRef(null)

  useEffect(() => {
    fetchPosts()
  }, [page])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(prevPage => prevPage + 1)
        }
      },
      { threshold: 1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current)
      }
    }
  }, [hasMore, loading])

  const fetchPosts = async () => {
    try {
      setLoading(true)
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
        .range(page * 10, (page + 1) * 10 - 1)

      if (error) throw error

      if (data) {
        const formattedPosts: Post[] = data.map(post => ({
          ...post,
          user: post.user[0]
        }))
        setPosts(prevPosts => [...prevPosts, ...formattedPosts])
        setHasMore(data.length === 10)
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const createPost = async () => {
    if (!newPostContent.trim()) return

    setCreatingPost(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Utilisateur non trouvé')

      const { data, error } = await supabase
        .from('posts')
        .insert({ content: newPostContent, user_id: user.id })
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
      }
    } catch (error) {
      console.error('Erreur lors de la création du post:', error)
    } finally {
      setCreatingPost(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-4">
        <Textarea
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          placeholder="Quoi de neuf ?"
          className="w-full mb-2 bg-gray-700/50 text-white"
          rows={3}
        />
        <Button
          onClick={createPost}
          disabled={creatingPost || !newPostContent.trim()}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white"
        >
          {creatingPost ? 'Publication en cours...' : 'Publier'}
        </Button>
      </div>
      {posts.map((post) => (
        <div key={post.id} className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-4 shadow-md">
          <div className="flex items-center mb-2">
            <img
              src={post.user.avatar_url || '/default-avatar.png'}
              alt={post.user.username}
              className="w-10 h-10 rounded-full mr-3"
            />
            <div>
              <p className="font-semibold text-white">{post.user.username}</p>
              <p className="text-xs text-gray-400">
                {new Date(post.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <p className="text-gray-200">{post.content}</p>
        </div>
      ))}
      {loading && <Spinner />}
      <div ref={observerTarget} className="h-10" />
    </div>
  )
}
