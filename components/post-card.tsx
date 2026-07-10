"use client"

import { useState } from "react"
import { Heart, Lock, MessageCircle, Trash2 } from "lucide-react"
import type { FeedPost } from "@/lib/types"
import { useGuest } from "@/lib/guest-context"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CommentsDialog } from "@/components/comments-dialog"
import { cn, initials, timeAgo } from "@/lib/utils"
import { toast } from "sonner"

const supabase = createClient()

export function PostCard({ post, onChanged }: { post: FeedPost; onChanged: () => void }) {
  const { guest } = useGuest()
  const [liked, setLiked] = useState(post.liked_by_me)
  const [likeCount, setLikeCount] = useState(post.like_count)
  const [busy, setBusy] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)

  const isAuthor = guest?.id === post.guest_id

  async function toggleLike() {
    if (!guest || busy) return
    setBusy(true)
    const next = !liked
    setLiked(next)
    setLikeCount((c) => c + (next ? 1 : -1))
    try {
      if (next) {
        const { error } = await supabase.from("likes").insert({ post_id: post.id, guest_id: guest.id })
        if (error && error.code !== "23505") throw error
      } else {
        const { error } = await supabase.from("likes").delete().eq("post_id", post.id).eq("guest_id", guest.id)
        if (error) throw error
      }
    } catch {
      // revert on failure
      setLiked(!next)
      setLikeCount((c) => c + (next ? -1 : 1))
      toast.error("Could not update your like.")
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!isAuthor) return
    if (!window.confirm("Remove this moment from the album?")) return
    const { error } = await supabase.from("posts").delete().eq("id", post.id)
    if (error) {
      toast.error("Could not remove this post.")
      return
    }
    toast.success("Removed from the album.")
    onChanged()
  }

  return (
    <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <header className="flex items-center gap-3 px-4 py-3">
        <Avatar className="size-9">
          {post.author?.avatar_url && <AvatarImage src={post.author.avatar_url || "/placeholder.svg"} alt="" />}
          <AvatarFallback className="bg-secondary text-sm text-secondary-foreground">
            {initials(post.author?.name ?? "?")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-sm font-semibold leading-tight">{post.author?.name ?? "Guest"}</p>
          <p className="text-xs text-muted-foreground">{timeAgo(post.created_at)}</p>
        </div>
        {post.is_private && (
          <span className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
            <Lock className="size-3" />
            Private
          </span>
        )}
        {isAuthor && (
          <button
            type="button"
            onClick={remove}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            aria-label="Remove post"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </header>

      <div className="bg-muted">
        {post.media_type === "video" ? (
          <video src={post.media_url} controls playsInline className="max-h-[70vh] w-full object-contain" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.media_url || "/placeholder.svg"}
            alt={post.caption || "Shared wedding moment"}
            className="max-h-[70vh] w-full object-contain"
          />
        )}
      </div>

      <div className="flex flex-col gap-3 px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleLike}
            className="flex items-center gap-1.5 text-sm font-medium transition-colors"
            aria-pressed={liked}
            aria-label={liked ? "Unlike" : "Like"}
          >
            <Heart
              className={cn("size-6 transition-colors", liked ? "fill-primary text-primary" : "text-foreground")}
            />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
          <button
            type="button"
            onClick={() => setCommentsOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium"
            aria-label="View comments"
          >
            <MessageCircle className="size-6" />
            {post.comment_count > 0 && <span>{post.comment_count}</span>}
          </button>
        </div>

        {post.caption && (
          <p className="text-sm leading-relaxed text-pretty">
            <span className="font-semibold">{post.author?.name ?? "Guest"}</span> {post.caption}
          </p>
        )}

        {post.comment_count > 0 && (
          <button
            type="button"
            onClick={() => setCommentsOpen(true)}
            className="self-start text-sm text-muted-foreground hover:text-foreground"
          >
            View all {post.comment_count} comment{post.comment_count === 1 ? "" : "s"}
          </button>
        )}
      </div>

      <CommentsDialog postId={post.id} open={commentsOpen} onOpenChange={setCommentsOpen} onChanged={onChanged} />
    </article>
  )
}
