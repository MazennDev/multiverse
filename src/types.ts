import { User as SupabaseUser } from '@supabase/auth-helpers-nextjs';

export interface User extends SupabaseUser {
  username?: string
  avatar_url?: string
}

export interface Post {
    id: string;
    user_id: string;
    content: string;
    image_url?: string | undefined;
    created_at: string;
    likes: number;
    comment_count: number;
    user: {
      username: string;
      avatar_url: string;
    };
  }
  
  
  

export interface Comment {
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
    replies?: Comment[];
  }
  