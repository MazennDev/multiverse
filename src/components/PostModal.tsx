import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Avatar } from './ui/avatar';
import { Button } from './ui/button';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { HeartIcon, ChatBubbleLeftIcon, ShareIcon, XMarkIcon, PencilIcon, TrashIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { Post, Comment, User } from '../types';
import Image from 'next/image';

interface PostModalProps {
  postId: string;
  onClose: () => void;
  currentUser: User | null;
  onCommentAdded: (postId: string) => void;
  onPostDeleted: (postId: string) => void;
  onPostEdited: (postId: string, newContent: string, newImageUrl: string | undefined) => void;
  isStandalone?: boolean;
}
interface CommentItemProps {
  comment: Comment;
  currentUser: User | null;
  onReply: () => void;
  onDelete: (commentId: string) => void;
  onEdit: (commentId: string, newContent: string) => void;
  setEditingCommentId: (id: string | null) => void;
  editingCommentId: string | null;
  depth: number;
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
  const [editingImage, setEditingImage] = useState<File | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchPost();
    fetchComments();

    const subscription = supabase
      .channel(`post_${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, payload => {
        if (payload.eventType === 'INSERT') {
          const newComment = payload.new as Comment;
          setComments(prevComments => {
            const updatedComments = [...prevComments];
            if (newComment.parent_comment_id) {
              const addReply = (comments: Comment[]): Comment[] => 
                comments.map(c => {
                  if (c.id === newComment.parent_comment_id) {
                    return { ...c, replies: [...c.replies, newComment] };
                  }
                  if (c.replies.length > 0) {
                    return { ...c, replies: addReply(c.replies) };
                  }
                  return c;
                });
              return addReply(updatedComments);
            } else {
              return [...updatedComments, newComment];
            }
          });
        } else if (payload.eventType === 'UPDATE') {
          const updatedComment = payload.new as Comment;
          setComments(prevComments => {
            const updateComment = (comments: Comment[]): Comment[] =>
              comments.map(c => {
                if (c.id === updatedComment.id) {
                  return { ...c, ...updatedComment };
                }
                if (c.replies.length > 0) {
                  return { ...c, replies: updateComment(c.replies) };
                }
                return c;
              });
            return updateComment(prevComments);
          });
        } else if (payload.eventType === 'DELETE') {
          const deletedCommentId = payload.old.id;
          setComments(prevComments => {
            const deleteComment = (comments: Comment[]): Comment[] =>
              comments.filter(c => {
                if (c.id === deletedCommentId) return false;
                if (c.replies.length > 0) {
                  c.replies = deleteComment(c.replies);
                }
                return true;
              });
            return deleteComment(prevComments);
          });
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
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
      setEditingPostContent(data.content);
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
          user: userData,
          replies: []
        };
      }));

      const commentTree = buildCommentTree(commentsWithUsers);
      setComments(commentTree);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const buildCommentTree = (comments: Comment[]): Comment[] => {
    const commentMap: { [key: string]: Comment } = {};
    const roots: Comment[] = [];

    comments.forEach(comment => {
      commentMap[comment.id] = { ...comment, replies: [] };
    });

    comments.forEach(comment => {
      if (comment.parent_comment_id) {
        const parent = commentMap[comment.parent_comment_id];
        if (parent) {
          parent.replies.push(commentMap[comment.id]);
        } else {
          roots.push(commentMap[comment.id]);
        }
      } else {
        roots.push(commentMap[comment.id]);
      }
    });

    return roots;
  };

// Add this function to your PostModal component
const handleComment = async (e: React.FormEvent, parentCommentId?: string | null) => {
  e.preventDefault();
  if (!currentUser || !newComment.trim()) return;

  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: currentUser.id,
        content: newComment.trim(),
        parent_comment_id: parentCommentId || null,
      })
      .select()
      .single();

    if (error) throw error;

    const commentWithUser = {
      ...data,
      user: {
        username: currentUser.username || 'Unknown User',
        avatar_url: currentUser.avatar_url || DEFAULT_AVATAR,
      },
    };

    setComments(prevComments => {
      const updatedComments = [...prevComments];
      if (parentCommentId) {
        const addReply = (comments: Comment[]): Comment[] => 
          comments.map(c => {
            if (c.id === parentCommentId) {
              return { ...c, replies: [...(c.replies || []), commentWithUser] };
            }
            if (c.replies && c.replies.length > 0) {
              return { ...c, replies: addReply(c.replies) };
            }
            return c;
          });
        return addReply(updatedComments);
      } else {
        return [...updatedComments, commentWithUser];
      }
    });

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

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
  
      if (error) throw error;
      
      // Update comment count
      if (post) {
        const updatedPost = { ...post, comment_count: Math.max((post.comment_count || 0) - 1, 0) };
        setPost(updatedPost);
        
        // Update the post's comment count in the database
        await supabase
          .from('posts')
          .update({ comment_count: updatedPost.comment_count })
          .eq('id', post.id);
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

      setEditingCommentId(null);
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  const handleEditPost = async () => {
    try {
      let newImageUrl: string | undefined = post?.image_url;
  
      if (editingImage) {
        const { data, error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(`${currentUser!.id}/${Date.now()}-${editingImage.name}`, editingImage);
  
        if (uploadError) throw uploadError;
  
        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(data.path);
  
        newImageUrl = publicUrl;
      } else if (editingImage === null) {
        newImageUrl = undefined;
      }
  
      const { data, error } = await supabase
        .from('posts')
        .update({ 
          content: editingPostContent,
          image_url: newImageUrl
        })
        .eq('id', postId)
        .select()
        .single();
  
      if (error) throw error;
  
      setPost(prevPost => prevPost ? { ...prevPost, content: editingPostContent, image_url: newImageUrl } : null);
      setIsEditingPost(false);
      setEditingImage(null);
      onPostEdited(postId, editingPostContent, newImageUrl);
    } catch (error) {
      console.error('Error editing post:', error);
    }
  };  
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditingImage(e.target.files[0]);
    }
  };

  if (!post) return null;

  const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23d1d5db'%3E%3Cpath d='M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z'/%3E%3C/svg%3E";

  return (
    <div className={`${isStandalone ? '' : 'fixed inset-0 bg-black bg-opacity-50'} flex items-center justify-center p-4 z-50`}>
      <div className={`bg-gray-800/30 backdrop-blur-sm rounded-xl ${isStandalone ? 'w-full max-w-2xl' : 'max-w-2xl w-full'} max-h-[90vh] overflow-y-auto`}>
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Publication</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="mb-4">
            <div className="flex items-start space-x-3">
            <Avatar 
              src={post.user?.avatar_url ?? DEFAULT_AVATAR} 
              alt={post.user?.username ?? 'Utilisateur inconnu'} 
              className="w-10 h-10" 
            />
              <div className="flex-grow">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-white">{post.user?.username ?? 'Utilisateur inconnu'}</span>
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
                    <div className="flex items-center space-x-2 mt-2">
                      <input
                        type="file"
                        id="post-image"
                        className="hidden"
                        onChange={handleImageChange}
                        accept="image/*"
                      />
                      <label htmlFor="post-image" className="cursor-pointer text-blue-400 hover:text-blue-500">
                        <PhotoIcon className="w-6 h-6" />
                      </label>
                      {editingImage && <span className="text-sm text-gray-400">{editingImage.name}</span>}
                      {post.image_url && !editingImage && (
                        <button 
                          onClick={() => setEditingImage(null)} 
                          className="text-red-400 hover:text-red-500"
                        >
                          Supprimer l'image
                        </button>
                      )}
                    </div>
                    <div className="flex space-x-2 mt-2">
                      <Button onClick={handleEditPost} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded-full text-sm">
                        Enregistrer
                      </Button>
                      <Button onClick={() => {
                        setIsEditingPost(false);
                        setEditingImage(null);
                        setEditingPostContent(post.content);
                      }} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-1 rounded-full text-sm">
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-200 mt-1">{post.content}</p>
                    {post.image_url && (
                      <div className="mt-2 relative w-full h-64">
                        <Image 
                          src={post.image_url} 
                          alt="Image de la publication" 
                          layout="fill"
                          objectFit="cover"
                          className="rounded-lg"
                        />
                      </div>
                    )}
                    {currentUser && currentUser.id === post.user_id && (
                      <div className="flex space-x-2 mt-2">
                        <Button onClick={() => { setIsEditingPost(true); setEditingPostContent(post.content); }} className="text-yellow-400 hover:text-yellow-500 text-xs">
                          <PencilIcon className="w-4 h-4 mr-1" />
                          Modifier
                        </Button>
                        <Button onClick={handleDeletePost} className="text-red-400 hover:text-red-500 text-xs">
                          <TrashIcon className="w-4 h-4 mr-1" />
                          Supprimer
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-2">Commentaires</h3>
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
                depth={0}
              />
            ))}
          </div>
          {currentUser && (
            <form onSubmit={(e) => handleComment(e, replyingTo)} className="mt-4">
              <div className="flex items-start space-x-3">
                <Avatar 
                  src={currentUser?.avatar_url ?? DEFAULT_AVATAR} 
                  alt={currentUser?.username ?? 'Utilisateur'} 
                  className="w-10 h-10" 
                />
                <div className="flex-grow">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value.slice(0, MAX_COMMENT_LENGTH))}
                    placeholder={replyingTo ? "Écrivez une réponse..." : "Que voulez-vous dire ?"}
                    className="w-full p-2 bg-gray-700 text-white rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    maxLength={MAX_COMMENT_LENGTH}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-400">{newComment.length}/{MAX_COMMENT_LENGTH}</span>
                    <div>
                      {replyingTo && (
                        <Button 
                          onClick={() => setReplyingTo(null)} 
                          className="mr-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-1 rounded-full text-sm"
                        >
                          Annuler la réponse
                        </Button>
                      )}
                      <Button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1 rounded-full text-sm">
                        {replyingTo ? "Répondre" : "Commenter"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
  
  function CommentItem({ 
    comment, 
    currentUser, 
    onReply, 
    onDelete, 
    onEdit,
    setEditingCommentId,
    editingCommentId,
    depth
  }: CommentItemProps) {
    const [editedContent, setEditedContent] = useState(comment.content);
  
    const handleEdit = () => {
      onEdit(comment.id, editedContent);
      setEditingCommentId(null);
    };
  
    return (
      <div className={`flex items-start space-x-3 mb-2 ${depth > 0 ? `ml-${depth * 4}` : ''}`}>
        <Avatar src={comment.user.avatar_url ?? DEFAULT_AVATAR} alt={comment.user.username ?? 'Utilisateur inconnu'} className="w-8 h-8" />
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
                  Enregistrer
                </Button>
                <Button onClick={() => setEditingCommentId(null)} className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded-full text-xs">
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-gray-200">{comment.content}</p>
          )}
          <div className="flex space-x-2 mt-1">
            <Button onClick={onReply} className="text-blue-400 hover:text-blue-500 text-xs">
              Répondre
            </Button>
            {currentUser && currentUser.id === comment.user_id && (
              <>
                <Button onClick={() => setEditingCommentId(comment.id)} className="text-yellow-400 hover:text-yellow-500 text-xs">
                  Modifier
                </Button>
                <Button onClick={() => onDelete(comment.id)} className="text-red-400 hover:text-red-500 text-xs">
                  Supprimer
                </Button>
              </>
            )}
          </div>
          {comment.replies && comment.replies.map(reply => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUser={currentUser}
              onReply={onReply}
              onDelete={onDelete}
              onEdit={onEdit}
              setEditingCommentId={setEditingCommentId}
              editingCommentId={editingCommentId}
              depth={depth + 1}
            />
          ))}
        </div>
      </div>
    );
  }
}  