import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Avatar } from './ui/avatar';
import { Button } from './ui/button';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { HeartIcon, ChatBubbleLeftIcon, ShareIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

interface PostModalProps {
  postId: string;
  onClose: () => void;
}

export default function PostModal({ postId, onClose }: PostModalProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchPost();
    fetchComments();
    fetchCurrentUser();
  }, [postId]);

  const fetchPost = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*, user:profiles(*)')
      .eq('id', postId)
      .single();
    if (error) {
      console.error('Error fetching post:', error);
    } else {
      setPost(data);
    }
  };

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*, user:profiles(*)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching comments:', error);
    } else {
      setComments(data);
    }
  };

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) {
        console.error('Error fetching user profile:', error);
      } else {
        setCurrentUser({ ...user, ...data });
      }
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newComment.trim()) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          content: newComment.trim(),
        })
        .select('*, user:profiles(*)')
        .single();

      if (error) throw error;

      setComments([...comments, data]);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  if (!post) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Post</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="mb-4">
            <div className="flex items-start space-x-3">
              <Avatar src={post.user.avatar_url} alt={post.user.username} className="w-10 h-10" />
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
              </div>
            </div>
          </div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-2">Comments</h3>
            {comments.map((comment) => (
              <div key={comment.id} className="mb-2">
                <div className="flex items-start space-x-3">
                  <Avatar src={comment.user.avatar_url} alt={comment.user.username} className="w-8 h-8" />
                  <div className="flex-grow">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white">{comment.user.username}</span>
                      <span className="text-sm text-gray-400">
                        · {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    <p className="text-gray-200">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {currentUser && (
            <form onSubmit={handleComment} className="mt-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full p-2 bg-gray-800 text-white rounded-lg"
                rows={3}
              />
              <Button type="submit" className="mt-2">
                Post Comment
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
