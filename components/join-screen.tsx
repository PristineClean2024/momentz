"use client"

import { useState } from "react"
import Image from "next/image"
import { Heart } from "lucide-react"
import { useGuest } from "@/lib/guest-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

export function JoinScreen() {
  const { join } = useGuest()
  const [name, setName] = useState("")
  const [bio, setBio] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Please tell us your name")
      return
    }
    setSubmitting(true)
    try {
      await join(name, bio)
      toast.success(`Welcome, ${name.trim()}!`)
    } catch {
      toast.error("Something went wrong. Please try again.")
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-dvh flex-col lg:flex-row">
      <div className="relative hidden lg:block lg:w-1/2">
        <Image
          src="/wedding-hero.png"
          alt="Wedding guests celebrating at golden hour"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-foreground/20" />
        <div className="absolute bottom-10 left-10 right-10 text-background">
          <p className="font-serif text-2xl italic leading-relaxed text-pretty">
            {'"Every guest holds a piece of the day. Together, we remember all of it."'}
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Heart className="size-4" fill="currentColor" />
            </span>
            <span className="font-serif text-xl font-medium tracking-tight">Momentz</span>
          </div>

          <h1 className="font-serif text-4xl font-medium leading-tight tracking-tight text-balance">
            Share the day, together.
          </h1>
          <p className="mt-3 leading-relaxed text-muted-foreground text-pretty">
            One shared album for everyone at the wedding. Add your photos and videos, react to others, and relive the
            celebration from every angle.
          </p>

          <form onSubmit={handleJoin} className="mt-8 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jordan Rivera"
                autoComplete="name"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bio">
                A little about you <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Bride's college roommate, here for the open bar"
                rows={3}
              />
            </div>
            <Button type="submit" size="lg" disabled={submitting} className="mt-1">
              {submitting ? "Joining..." : "Join the album"}
            </Button>
          </form>

          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            No account needed. Your name is saved on this device so you can pick up where you left off.
          </p>
        </div>
      </div>
    </main>
  )
}
