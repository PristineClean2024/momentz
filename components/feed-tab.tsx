"use client"

import { ImagePlus } from "lucide-react"
import { useGuest } from "@/lib/guest-context"
import { useFeed } from "@/lib/hooks"
import { PostCard } from "@/components/post-card"
import { UploadDialog } from "@/components/upload-dialog"
import { Button } from "@/components/ui/button"

export function FeedTab() {
  const { guest } = useGuest()
  const { posts, isLoading, mutate } = useFeed(guest?.id ?? null)

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-6">
      {isLoading && <p className="py-12 text-center text-sm text-muted-foreground">Loading the album...</p>}

      {!isLoading && posts.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed bg-card/50 px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <ImagePlus className="size-6" />
          </span>
          <div>
            <h2 className="font-serif text-2xl font-medium">The album is empty</h2>
            <p className="mt-1 leading-relaxed text-muted-foreground text-pretty">
              Be the first to share a moment from the celebration.
            </p>
          </div>
          <UploadDialog
            onUploaded={mutate}
            trigger={
              <Button size="lg">
                <ImagePlus className="size-4" />
                Add the first moment
              </Button>
            }
          />
        </div>
      )}

      {posts.map((post) => (
        <PostCard key={post.id} post={post} onChanged={mutate} />
      ))}
    </div>
  )
}
