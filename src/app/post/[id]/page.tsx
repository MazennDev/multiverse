'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Post, User } from '@/types'
import PostModal from '@/components/PostModal'
import { useRouter } from 'next/navigation'
import Spinner from '@/components/ui/spinner'

export default function PostPage() {
  const params = useParams()
  const postId = params.id as string
  const [post, setPost] = useState<Post | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    const fetchPost = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, user:profiles(*)')
        .eq('id', postId)
        .single()

      if (error) {
        console.error('Error fetching post:', error)
        router.push('/') // Redirect to home if post not found
      } else {
        setPost(data)
      }
    }

    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (error) {
          console.error('Error fetching user profile:', error)
        } else {
          setCurrentUser({ ...user, ...data })
        }
      }
    }

    fetchPost()
    fetchCurrentUser()
  }, [postId, supabase, router])

  if (!post) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex justify-center items-center min-h-screen">
      <PostModal
        postId={postId}
        onClose={() => router.push('/')}
        currentUser={currentUser}
        onCommentAdded={() => {
          // Refresh the post data if needed
          setPost(prevPost => prevPost ? { ...prevPost, comment_count: (prevPost.comment_count || 0) + 1 } : null)
        }}
        onPostDeleted={() => {
          router.push('/')
        }}
        onPostEdited={(postId, newContent) => {
          setPost(prevPost => prevPost ? { ...prevPost, content: newContent } : null)
        }}
        isStandalone={true}
      />
    </div>
  )
}
