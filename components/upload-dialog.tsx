"use client"

import { useRef, useState } from "react"
import { ImagePlus, Loader2, Lock, Users } from "lucide-react"
import { useGuest } from "@/lib/guest-context"
import { useGuests } from "@/lib/hooks"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn, initials } from "@/lib/utils"
import { toast } from "sonner"

const supabase = createClient()

export function UploadDialog({ onUploaded, trigger }: { onUploaded: () => void; trigger?: React.ReactNode }) {
  const { guest } = useGuest()
  const { guests } = useGuests()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [allowed, setAllowed] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const others = guests.filter((g) => g.id !== guest?.id)

  function pickFile(f: File | null) {
    if (!f) return
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setCaption("")
    setIsPrivate(false)
    setAllowed([])
  }

  function toggleAllowed(id: string) {
    setAllowed((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function handleUpload() {
    if (!file || !guest) return
    setUploading(true)
    try {
      const ext = file.name.split(".").pop() || "bin"
      const path = `${guest.id}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      })
      if (upErr) throw upErr
      const { data: pub } = supabase.storage.from("media").getPublicUrl(path)
      const mediaType = file.type.startsWith("video") ? "video" : "image"

      const { error: insErr } = await supabase.from("posts").insert({
        guest_id: guest.id,
        media_url: pub.publicUrl,
        media_type: mediaType,
        caption: caption.trim(),
        is_private: isPrivate,
        allowed_guest_ids: isPrivate ? allowed : [],
      })
      if (insErr) throw insErr

      toast.success("Shared to the album!")
      reset()
      setOpen(false)
      onUploaded()
    } catch {
      toast.error("Upload failed. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button>
              <ImagePlus className="size-4" />
              Add a moment
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-medium">Add a moment</DialogTitle>
          <DialogDescription>Share a photo or video with everyone at the wedding.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />

          {previewUrl ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border bg-muted"
            >
              {file?.type.startsWith("video") ? (
                <video src={previewUrl} className="size-full object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl || "/placeholder.svg"} alt="Selected preview" className="size-full object-cover" />
              )}
              <span className="absolute bottom-2 right-2 rounded-md bg-foreground/70 px-2 py-1 text-xs text-background">
                Tap to change
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/40 text-muted-foreground transition-colors hover:bg-muted"
            >
              <ImagePlus className="size-8" />
              <span className="text-sm font-medium">Choose a photo or video</span>
            </button>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Say something about this moment..."
              rows={2}
            />
          </div>

          <div className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <span className="mt-0.5 text-muted-foreground">
                  {isPrivate ? <Lock className="size-4" /> : <Users className="size-4" />}
                </span>
                <div>
                  <p className="text-sm font-semibold">{isPrivate ? "Private" : "Everyone"}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {isPrivate
                      ? "Only you and the people you choose can see this."
                      : "Visible to everyone in the album."}
                  </p>
                </div>
              </div>
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} aria-label="Make private" />
            </div>

            {isPrivate && (
              <div className="mt-4 flex flex-col gap-1 border-t pt-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Share with</p>
                {others.length === 0 && (
                  <p className="text-sm text-muted-foreground">No one else has joined yet.</p>
                )}
                {others.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleAllowed(g.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors",
                      allowed.includes(g.id) ? "bg-accent" : "hover:bg-muted",
                    )}
                  >
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">
                        {initials(g.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm font-medium">{g.name}</span>
                    <span
                      className={cn(
                        "size-4 rounded-full border",
                        allowed.includes(g.id) ? "border-primary bg-primary" : "border-input",
                      )}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button onClick={handleUpload} disabled={!file || uploading} size="lg">
            {uploading && <Loader2 className="size-4 animate-spin" />}
            {uploading ? "Sharing..." : "Share to album"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
