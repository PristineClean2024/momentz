"use client"

import { useGuest } from "@/lib/guest-context"
import { JoinScreen } from "@/components/join-screen"
import { AlbumApp } from "@/components/album-app"

export default function Page() {
  const { guest, loading } = useGuest()

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <span
          className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary"
          aria-label="Loading"
        />
      </main>
    )
  }

  if (!guest) return <JoinScreen />
  return <AlbumApp />
}
