import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Avatar } from './ui/avatar';
import { Button } from './ui/button';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { HeartIcon, ChatBubbleLeftIcon, ShareIcon, XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { Post, Comment, User } from '../types';
import Image from 'next/image';

interface PostModalProps {
  postId: string;
  onClose: () => void;
  currentUser: User | null;
  onCommentAdded: (postId: string) => void;
  onPostDeleted: (postId: string) => void;
  onPostEdited: (postId: string, newContent: string) => void;
  isStandalone?: boolean;
}

const MAX_COMMENT_LENGTH = 1000;

export default function PostModal({ 
  postId, 
  onClose, 
  currentUser, 
  onCommentAdded, 
  onPostDeleted,
  onPostEdited,
  isStandalone = false 
}: PostModalProps) {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingPostContent, setEditingPostContent] = useState('');
  const [isEditingPost, setIsEditingPost] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchPost();
    fetchComments();
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
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      const commentsWithUsers = await Promise.all(commentsData.map(async (comment) => {
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', comment.user_id)
          .single();

        if (userError) throw userError;

        return {
          ...comment,
          user: userData
        };
      }));

      setComments(commentsWithUsers);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleComment = async (e: React.FormEvent, parentCommentId?: string) => {
    e.preventDefault();
    if (!currentUser || !newComment.trim()) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          content: newComment.trim(),
          parent_comment_id: parentCommentId,
        })
        .select()
        .single();

      if (error) throw error;

      const commentWithUser = {
        ...data,
        user: {
          username: currentUser.username,
          avatar_url: currentUser.avatar_url,
        },
      };

      setComments(prevComments => [...prevComments, commentWithUser]);
      setNewComment('');
      setReplyingTo(null);
      onCommentAdded(postId);

      // Update comment count
      if (post) {
        const updatedPost = { ...post, comment_count: (post.comment_count || 0) + 1 };
        setPost(updatedPost);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments(prevComments => prevComments.filter(c => c.id !== commentId));
      
      // Update comment count
      if (post) {
        const updatedPost = { ...post, comment_count: Math.max((post.comment_count || 0) - 1, 0) };
        setPost(updatedPost);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleEditComment = async (commentId: string, newContent: string) => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .update({ content: newContent })
        .eq('id', commentId)
        .select()
        .single();

      if (error) throw error;

      setComments(prevComments =>
        prevComments.map(c =>
          c.id === commentId ? { ...c, content: newContent } : c
        )
      );
      setEditingCommentId(null);
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  const handleDeletePost = async () => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      onPostDeleted(postId);
      onClose();
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleEditPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .update({ content: editingPostContent })
        .eq('id', postId)
        .select()
        .single();

      if (error) throw error;

      setPost(prevPost => prevPost ? { ...prevPost, content: editingPostContent } : null);
      setIsEditingPost(false);
      onPostEdited(postId, editingPostContent);
    } catch (error) {
      console.error('Error editing post:', error);
    }
  };

  if (!post) return null;

  return (
    <div className={`${isStandalone ? '' : 'fixed inset-0 bg-black bg-opacity-50'} flex items-center justify-center p-4 z-50`}>
      <div className={`bg-gray-800/30 backdrop-blur-sm rounded-xl ${isStandalone ? 'w-full max-w-2xl' : 'max-w-2xl w-full'} max-h-[90vh] overflow-y-auto`}>
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
                {isEditingPost ? (
                  <div>
                    <textarea
                      value={editingPostContent}
                      onChange={(e) => setEditingPostContent(e.target.value)}
                      className="w-full p-2 bg-gray-700 text-white rounded-lg resize-none mt-2"
                      rows={3}
                    />
                    <div className="flex space-x-2 mt-2">
                      <Button onClick={handleEditPost} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded-full text-sm">
                        Save
                      </Button>
                      <Button onClick={() => setIsEditingPost(false)} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-1 rounded-full text-sm">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-200 mt-1">{post.content}</p>
                )}
                {post.image_url && (
                  <Image src={post.image_url} alt="Post image" width={500} height={300} className="mt-2 rounded-lg object-cover" />
                )}
                {currentUser && currentUser.id === post.user_id && !isEditingPost && (
                  <div className="flex space-x-2 mt-2">
                    <Button onClick={() => { setIsEditingPost(true); setEditingPostContent(post.content); }} className="text-yellow-400 hover:text-yellow-500 text-xs">
                      <PencilIcon className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button onClick={handleDeletePost} className="text-red-400 hover:text-red-500 text-xs">
                      <TrashIcon className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-2">Comments</h3>
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                currentUser={currentUser}
                onReply={() => setReplyingTo(comment.id)}
                onDelete={handleDeleteComment}
                onEdit={handleEditComment}
                setEditingCommentId={setEditingCommentId}
                editingCommentId={editingCommentId}
              />
            ))}
          </div>
          {currentUser && (
            <form onSubmit={(e) => handleComment(e)} className="mt-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
                placeholder="Add a comment..."
                className="w-full p-2 bg-gray-700 text-white rounded-lg resize-none"
                rows={3}
                maxLength={MAX_COMMENT_LENGTH}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-400">{newComment.length}/{MAX_COMMENT_LENGTH}</span>
                <Button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded-full text-sm">
                  Post Comment
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  currentUser: User | null;
  onReply: () => void;
  onDelete: (commentId: string) => void;
  onEdit: (commentId: string, newContent: string) => void;
  setEditingCommentId: (id: string | null) => void;
  editingCommentId: string | null;
}

function CommentItem({ 
  comment, 
  currentUser, 
  onReply, 
  onDelete, 
  onEdit,
  setEditingCommentId,
  editingCommentId
}: CommentItemProps) {
  const [editedContent, setEditedContent] = useState(comment.content);

  const handleEdit = () => {
    onEdit(comment.id, editedContent);
    setEditingCommentId(null);
  };

  return (
    <div className="flex items-start space-x-3 mb-2">
      <Avatar src={comment.user.avatar_url} alt={comment.user.username} className="w-8 h-8" />
      <div className="flex-grow">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-white">{comment.user.username}</span>
          <span className="text-sm text-gray-400">
            · {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr })}
          </span>
        </div>
        {editingCommentId === comment.id ? (
          <div>
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full p-2 bg-gray-700 text-white rounded-lg resize-none mt-1"
              rows={2}
            />
            <div className="flex space-x-2 mt-1">
              <Button onClick={handleEdit} className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-full text-xs">
                Save
              </Button>
              <Button onClick={() => setEditingCommentId(null)} className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded-full text-xs">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-gray-200">{comment.content}</p>
        )}
        <div className="flex space-x-2 mt-1">
          <Button onClick={onReply} className="text-blue-400 hover:text-blue-500 text-xs">
            Reply
          </Button>
          {currentUser && currentUser.id === comment.user_id && (
            <>
              <Button onClick={() => setEditingCommentId(comment.id)} className="text-yellow-400 hover:text-yellow-500 text-xs">
                Edit
              </Button>
              <Button onClick={() => onDelete(comment.id)} className="text-red-400 hover:text-red-500 text-xs">
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}