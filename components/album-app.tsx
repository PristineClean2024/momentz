"use client"

import { useState } from "react"
import { Bell, Heart, Home, Users } from "lucide-react"
import { useGuest } from "@/lib/guest-context"
import { useFeed } from "@/lib/hooks"
import { FeedTab } from "@/components/feed-tab"
import { PeopleTab } from "@/components/people-tab"
import { RemindersTab } from "@/components/reminders-tab"
import { UploadDialog } from "@/components/upload-dialog"
import { cn } from "@/lib/utils"

type Tab = "feed" | "people" | "you"

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "feed", label: "Album", icon: Home },
  { id: "people", label: "People", icon: Users },
  { id: "you", label: "You", icon: Bell },
]

export function AlbumApp() {
  const { guest } = useGuest()
  const [tab, setTab] = useState<Tab>("feed")
  const { mutate } = useFeed(guest?.id ?? null)

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Heart className="size-4" fill="currentColor" />
            </span>
            <span className="font-serif text-lg font-medium tracking-tight">Momentz</span>
          </div>
          <div className="hidden sm:block">
            <UploadDialog onUploaded={mutate} />
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24 sm:pb-8">
        {tab === "feed" && <FeedTab />}
        {tab === "people" && <PeopleTab />}
        {tab === "you" && <RemindersTab />}
      </main>

      {/* Floating add button on mobile */}
      <div className="fixed bottom-20 right-4 z-30 sm:hidden">
        <UploadDialog
          onUploaded={mutate}
          trigger={
            <button
              type="button"
              className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
              aria-label="Add a moment"
            >
              <Heart className="size-6" fill="currentColor" />
            </button>
          }
        />
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t bg-background/95 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-xl items-stretch">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                tab === id ? "text-primary" : "text-muted-foreground",
              )}
              aria-current={tab === id ? "page" : undefined}
            >
              <Icon className="size-5" fill={tab === id ? "currentColor" : "none"} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Desktop tab bar */}
      <nav className="fixed left-1/2 top-16 z-10 hidden -translate-x-1/2 sm:block">
        <div className="flex items-center gap-1 rounded-full border bg-card p-1 shadow-sm">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
              aria-current={tab === id ? "page" : undefined}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
