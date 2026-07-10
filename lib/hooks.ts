"use client"

import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import type { Comment, FeedPost, Guest, Post, Settings } from "@/lib/types"

const supabase = createClient()

export function useGuests() {
  const { data, error, isLoading, mutate } = useSWR<Guest[]>("guests", async () => {
    const { data, error } = await supabase.from("guests").select("*").order("created_at", { ascending: true })
    if (error) throw error
    return data as Guest[]
  })
  return { guests: data ?? [], error, isLoading, mutate }
}

export function useSettings() {
  const { data, mutate } = useSWR<Settings>("settings", async () => {
    const { data, error } = await supabase.from("settings").select("*").eq("id", 1).single()
    if (error) throw error
    return data as Settings
  })
  return { settings: data, mutate }
}

// Fetches all visible posts with author + engagement data for the given guest.
export function useFeed(guestId: string | null) {
  const key = guestId ? ["feed", guestId] : null
  const { data, error, isLoading, mutate } = useSWR<FeedPost[]>(key, async () => {
    const [postsRes, guestsRes, likesRes, commentsRes] = await Promise.all([
      supabase.from("posts").select("*").order("created_at", { ascending: false }),
      supabase.from("guests").select("*"),
      supabase.from("likes").select("*"),
      supabase.from("comments").select("post_id"),
    ])
    if (postsRes.error) throw postsRes.error
    if (guestsRes.error) throw guestsRes.error

    const guests = (guestsRes.data ?? []) as Guest[]
    const guestById = new Map(guests.map((g) => [g.id, g]))
    const likes = (likesRes.data ?? []) as { post_id: string; guest_id: string }[]
    const comments = (commentsRes.data ?? []) as { post_id: string }[]

    const likeCount = new Map<string, number>()
    const likedByMe = new Set<string>()
    for (const l of likes) {
      likeCount.set(l.post_id, (likeCount.get(l.post_id) ?? 0) + 1)
      if (l.guest_id === guestId) likedByMe.add(l.post_id)
    }
    const commentCount = new Map<string, number>()
    for (const c of comments) commentCount.set(c.post_id, (commentCount.get(c.post_id) ?? 0) + 1)

    const posts = (postsRes.data ?? []) as Post[]
    return posts
      .filter((p) => {
        if (!p.is_private) return true
        return p.guest_id === guestId || p.allowed_guest_ids.includes(guestId!)
      })
      .map<FeedPost>((p) => ({
        ...p,
        author: guestById.get(p.guest_id) ?? null,
        like_count: likeCount.get(p.id) ?? 0,
        comment_count: commentCount.get(p.id) ?? 0,
        liked_by_me: likedByMe.has(p.id),
      }))
  })
  return { posts: data ?? [], error, isLoading, mutate }
}

export function useComments(postId: string) {
  const { data, isLoading, mutate } = useSWR<(Comment & { author: Guest | null })[]>(
    ["comments", postId],
    async () => {
      const [commentsRes, guestsRes] = await Promise.all([
        supabase.from("comments").select("*").eq("post_id", postId).order("created_at", { ascending: true }),
        supabase.from("guests").select("*"),
      ])
      if (commentsRes.error) throw commentsRes.error
      const guests = (guestsRes.data ?? []) as Guest[]
      const byId = new Map(guests.map((g) => [g.id, g]))
      return (commentsRes.data as Comment[]).map((c) => ({ ...c, author: byId.get(c.guest_id) ?? null }))
    },
  )
  return { comments: data ?? [], isLoading, mutate }
}
