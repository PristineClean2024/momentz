"use client"

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { Guest } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"

const STORAGE_KEY = "momentz.guestId"

type GuestContextValue = {
  guest: Guest | null
  loading: boolean
  join: (name: string, bio: string) => Promise<Guest>
  updateGuest: (patch: Partial<Pick<Guest, "name" | "bio" | "avatar_url" | "reminder_opt_in">>) => Promise<void>
  leave: () => void
}

const GuestContext = createContext<GuestContextValue | null>(null)

export function GuestProvider({ children }: { children: React.ReactNode }) {
  const [guest, setGuest] = useState<Guest | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const id = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null
    if (!id) {
      setLoading(false)
      return
    }
    supabase
      .from("guests")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }: { data: Guest | null }) => {
        if (data) setGuest(data as Guest)
        else window.localStorage.removeItem(STORAGE_KEY)
        setLoading(false)
      })
  }, [supabase])

  const join = useCallback(
    async (name: string, bio: string) => {
      const { data, error } = await supabase
        .from("guests")
        .insert({ name: name.trim(), bio: bio.trim() })
        .select("*")
        .single()
      if (error) throw error
      const g = data as Guest
      window.localStorage.setItem(STORAGE_KEY, g.id)
      setGuest(g)
      return g
    },
    [supabase],
  )

  const updateGuest = useCallback(
    async (patch: Partial<Pick<Guest, "name" | "bio" | "avatar_url" | "reminder_opt_in">>) => {
      if (!guest) return
      const { data, error } = await supabase
        .from("guests")
        .update(patch)
        .eq("id", guest.id)
        .select("*")
        .single()
      if (error) throw error
      setGuest(data as Guest)
    },
    [supabase, guest],
  )

  const leave = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY)
    setGuest(null)
  }, [])

  return (
    <GuestContext.Provider value={{ guest, loading, join, updateGuest, leave }}>{children}</GuestContext.Provider>
  )
}

export function useGuest() {
  const ctx = useContext(GuestContext)
  if (!ctx) throw new Error("useGuest must be used within GuestProvider")
  return ctx
}
