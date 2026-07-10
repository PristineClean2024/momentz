"use client"

import { useState } from "react"
import { Send } from "lucide-react"
import { useGuest } from "@/lib/guest-context"
import { useComments } from "@/lib/hooks"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { initials, timeAgo } from "@/lib/utils"
import { toast } from "sonner"

const supabase = createClient()

export function CommentsDialog({
  postId,
  open,
  onOpenChange,
  onChanged,
}: {
  postId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: () => void
}) {
  const { guest } = useGuest()
  const { comments, isLoading, mutate } = useComments(postId)
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || !guest || sending) return
    setSending(true)
    try {
      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        guest_id: guest.id,
        body: body.trim(),
      })
      if (error) throw error
      setBody("")
      await mutate()
      onChanged()
    } catch {
      toast.error("Could not post your comment.")
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 p-0 sm:max-w-md">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="font-serif text-xl font-medium">Comments</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {!isLoading && comments.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No comments yet. Be the first to say something.
            </p>
          )}
          <ul className="flex flex-col gap-4">
            {comments.map((c) => (
              <li key={c.id} className="flex gap-3">
                <Avatar className="size-8 shrink-0">
                  {c.author?.avatar_url && <AvatarImage src={c.author.avatar_url || "/placeholder.svg"} alt="" />}
                  <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">
                    {initials(c.author?.name ?? "?")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold">{c.author?.name ?? "Guest"}</span>
                    <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-pretty">{c.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={submit} className="flex items-center gap-2 border-t px-4 py-3">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={!body.trim() || sending} aria-label="Post comment">
            <Send className="size-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
