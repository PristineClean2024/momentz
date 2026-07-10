"use client"

import { useState } from "react"
import { Bell, BellRing, LogOut, Sparkles } from "lucide-react"
import { useGuest } from "@/lib/guest-context"
import { useFeed } from "@/lib/hooks"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { initials } from "@/lib/utils"
import { toast } from "sonner"

export function RemindersTab() {
  const { guest, updateGuest, leave } = useGuest()
  const { posts } = useFeed(guest?.id ?? null)
  const [name, setName] = useState(guest?.name ?? "")
  const [bio, setBio] = useState(guest?.bio ?? "")
  const [saving, setSaving] = useState(false)

  if (!guest) return null

  const myPosts = posts.filter((p) => p.guest_id === guest.id).length
  const dirty = name.trim() !== guest.name || bio.trim() !== guest.bio

  async function saveProfile() {
    if (!name.trim()) {
      toast.error("Name can't be empty")
      return
    }
    setSaving(true)
    try {
      await updateGuest({ name: name.trim(), bio: bio.trim() })
      toast.success("Profile updated")
    } catch {
      toast.error("Could not save your profile.")
    } finally {
      setSaving(false)
    }
  }

  async function toggleReminders(value: boolean) {
    try {
      await updateGuest({ reminder_opt_in: value })
      toast.success(value ? "Reminders on" : "Reminders off")
    } catch {
      toast.error("Could not update reminders.")
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
      <section className="flex items-center gap-4 rounded-2xl border bg-card px-5 py-5">
        <Avatar className="size-16">
          <AvatarFallback className="bg-primary text-xl text-primary-foreground">{initials(guest.name)}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="font-serif text-2xl font-medium leading-tight">{guest.name}</h2>
          <p className="text-sm text-muted-foreground">
            {myPosts} {myPosts === 1 ? "moment" : "moments"} shared
          </p>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h3 className="font-semibold">Your profile</h3>
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-bio">Bio</Label>
            <Textarea id="edit-bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
          </div>
          <Button onClick={saveProfile} disabled={!dirty || saving} className="self-start">
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <BellRing className="size-4 text-primary" />
          <h3 className="font-semibold">Reminders</h3>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span className="mt-0.5 text-muted-foreground">
              <Bell className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium">Nudge me to share</p>
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                Get gentle reminders during and after the wedding to add the moments you captured, so nothing gets lost.
              </p>
            </div>
          </div>
          <Switch
            checked={guest.reminder_opt_in}
            onCheckedChange={toggleReminders}
            aria-label="Toggle reminders"
          />
        </div>
      </section>

      <Button
        variant="ghost"
        onClick={leave}
        className="self-center text-muted-foreground hover:text-destructive"
      >
        <LogOut className="size-4" />
        Leave this album on this device
      </Button>
    </div>
  )
}
