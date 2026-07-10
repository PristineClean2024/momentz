export type Guest = {
  id: string
  name: string
  bio: string
  avatar_url: string | null
  reminder_opt_in: boolean
  created_at: string
}

export type MediaType = "image" | "video"

export type Post = {
  id: string
  guest_id: string
  media_url: string
  media_type: MediaType
  caption: string
  is_private: boolean
  allowed_guest_ids: string[]
  created_at: string
}

export type Comment = {
  id: string
  post_id: string
  guest_id: string
  body: string
  created_at: string
}

export type Like = {
  id: string
  post_id: string
  guest_id: string
  created_at: string
}

export type Settings = {
  id: number
  reminders_enabled: boolean
  couple_names: string
  updated_at: string
}

// A post joined with its author and engagement data, as shown in the feed.
export type FeedPost = Post & {
  author: Guest | null
  like_count: number
  comment_count: number
  liked_by_me: boolean
}
