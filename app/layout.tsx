import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Fraunces, Nunito_Sans } from "next/font/google"
import { GuestProvider } from "@/lib/guest-context"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
})

const nunito = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "600", "700"],
})

export const metadata: Metadata = {
  title: "Momentz — A shared wedding album",
  description:
    "Everyone's photos and videos from the wedding, gathered in one warm, shared album. Join, share your moments, and relive the day together.",
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: "#f7f3ea",
  colorScheme: "light",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${nunito.variable} bg-background`}>
      <body className="font-sans antialiased">
        <GuestProvider>{children}</GuestProvider>
        <Toaster position="top-center" />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
