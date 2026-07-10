"use client"

import { useGuest } from "@/lib/guest-context"
import { useGuests } from "@/lib/hooks"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { initials } from "@/lib/utils"

export function PeopleTab() {
  const { guest } = useGuest()
  const { guests, isLoading } = useGuests()

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      <div className="mb-5">
        <h2 className="font-serif text-2xl font-medium">Who&apos;s here</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {guests.length} {guests.length === 1 ? "person has" : "people have"} joined the album.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      <ul className="flex flex-col gap-2">
        {guests.map((g) => (
          <li key={g.id} className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3">
            <Avatar className="size-11 shrink-0">
              {g.avatar_url && <AvatarImage src={g.avatar_url || "/placeholder.svg"} alt="" />}
              <AvatarFallback className="bg-secondary text-secondary-foreground">{initials(g.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">
                {g.name}
                {g.id === guest?.id && <span className="ml-2 text-xs font-normal text-primary">You</span>}
              </p>
              {g.bio ? (
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground text-pretty">{g.bio}</p>
              ) : (
                <p className="mt-0.5 text-sm italic text-muted-foreground">No bio yet</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
