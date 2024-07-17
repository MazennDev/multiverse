'use client'

import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Avatar } from './ui/avatar'
import { Button } from './ui/button'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { User as SupabaseUser } from '@supabase/auth-helpers-nextjs'
import { RealtimeChannel } from '@supabase/supabase-js'
import Link from 'next/link'
import { v4 as uuidv4 } from 'uuid'
import { toast } from '@/components/ui/use-toast'
import { PhotoIcon, HeartIcon, ChatBubbleLeftIcon, ShareIcon } from '@heroicons/react/24/outline'
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid'
import PostModal from './PostModal'

interface User extends SupabaseUser {
  username?: string
  avatar_url?: string
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  likes: number;
  comment_count: number;
  user: {
    username: string;
    avatar_url: string;
  };
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_comment_id?: string;
  user: {
    username: string;
    avatar_url: string;
  };
}

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [newPostContent, setNewPostContent] = useState('')
  const [creatingPost, setCreatingPost] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const supabase = createClientComponentClient()
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    fetchPosts()
    fetchCurrentUser()
    setupRealtimeSubscription()
    fetchLikedPosts()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchCurrentUser()
        fetchLikedPosts()
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null)
        setLikedPosts(new Set())
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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, handleUpdatedPost)
      .subscribe()
  
    realtimeChannelRef.current = channel
  }
  
  const handleUpdatedPost = (payload: any) => {
    const updatedPost = payload.new as Post;
    setPosts(currentPosts => 
      currentPosts.map(post => 
        post.id === updatedPost.id ? { ...post, ...updatedPost } : post
      )
    );
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
        .select('id, content, image_url, created_at, user_id, likes, comment_count')
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
      return avatarPath
    }
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
      return avatarPath
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(avatarPath)
    return data?.publicUrl ?? '/default-avatar.png'
  }
  
  

  const fetchLikedPosts = async () => {
    if (!currentUser) return
    const { data, error } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', currentUser.id)
    if (error) {
      console.error('Error fetching liked posts:', error)
    } else {
      setLikedPosts(new Set(data.map(like => like.post_id)))
    }
  }
  const handleComment = (postId: string) => {
    setSelectedPostId(postId)
  }
  const handleShare = (postId: string) => {
    // Implement share functionality
    console.log(`Share post ${postId}`)
  }
  const handleLike = async (postId: string) => {
    if (!currentUser) return
    const isLiked = likedPosts.has(postId)
    try {
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', currentUser.id)
          .eq('post_id', postId)
        setLikedPosts(prev => {
          const newSet = new Set(prev)
          newSet.delete(postId)
          return newSet
        })
        await supabase.rpc('decrement_likes', { post_id: postId })
      } else {
        await supabase
          .from('likes')
          .insert({ user_id: currentUser.id, post_id: postId })
        setLikedPosts(prev => new Set(prev).add(postId))
        await supabase.rpc('increment_likes', { post_id: postId })
      }
    } catch (error) {
      console.error('Error handling like:', error)
    }
  }
  
  

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0])
    }
  }

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${uuidv4()}.${fileExt}`
    const filePath = `${currentUser!.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(filePath, file)

    if (uploadError) {
      throw uploadError
    }

    const { data } = supabase.storage.from('post-images').getPublicUrl(filePath)
    return data.publicUrl
  }

  const MAX_POST_LENGTH = 1000; // Adjust this value as needed

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && !selectedImage) return;
    if (!currentUser) return;
    if (newPostContent.length > MAX_POST_LENGTH) {
      toast({
        title: "Error",
        description: `Your post is too long. Maximum length is ${MAX_POST_LENGTH} characters.`,
        variant: "destructive",
      });
      return;
    }
  
    setCreatingPost(true);
    try {
      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }
  
      const newPost: Partial<Post> = {
        user_id: currentUser.id,
        content: newPostContent.trim(),
        image_url: imageUrl || undefined,
        created_at: new Date().toISOString(),
        likes: 0,
      };
  
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .insert(newPost)
        .select()
        .single();
  
      if (postError) throw postError;
  
      // Fetch user data separately
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', currentUser.id)
        .single();
  
      if (userError) throw userError;
  
      const fullPost: Post = {
        ...postData,
        user: {
          username: userData.username,
          avatar_url: userData.avatar_url,
        },
      };
  
      setPosts(prevPosts => [fullPost, ...prevPosts]);
      setNewPostContent('');
      setSelectedImage(null);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
      toast({
        title: "Success",
        description: "Your post has been created successfully.",
      });
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreatingPost(false);
    }
  };
  


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
                maxLength={MAX_POST_LENGTH}
              />
              {selectedImage && (
                <div className="mt-2">
                  <img
                    src={URL.createObjectURL(selectedImage)}
                    alt="Selected image"
                    className="max-h-40 rounded-lg object-cover"
                  />
                </div>
              )}
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-400">
                  {newPostContent.length}/{MAX_POST_LENGTH}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  ref={imageInputRef}
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="text-gray-400 hover:text-white"
                >
                  <PhotoIcon className="w-6 h-6" />
                </button>
                <Button
                  type="submit"
                  disabled={creatingPost || (!newPostContent.trim() && !selectedImage)}
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
                    <Link href={`/profile/${post.user.username}`}>
                      <span className="font-semibold text-white hover:underline">{post.user.username}</span>
                    </Link>
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
                    <button 
                      onClick={() => handleComment(post.id)}
                      className="flex items-center space-x-1 text-gray-400 hover:text-blue-500"
                    >
                      <ChatBubbleLeftIcon className="w-5 h-5" />
                      <span>{post.comment_count || 0}</span>
                    </button>
                    <button 
                      onClick={() => handleShare(post.id)}
                      className="flex items-center space-x-1 text-gray-400 hover:text-green-500"
                    >
                      <ShareIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {selectedPostId && (
        <PostModal 
          postId={selectedPostId} 
          onClose={() => setSelectedPostId(null)}
          currentUser={currentUser}
          onCommentAdded={(postId) => {
            setPosts(prevPosts => 
              prevPosts.map(post => 
                post.id === postId 
                  ? { ...post, comment_count: (post.comment_count || 0) + 1 } 
                  : post
              )
            )
          }}
        />
      )}
    </div>
  )
}