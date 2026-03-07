'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { initPostHog } from '@/lib/posthog'
import { trackPageView, identify } from '@/lib/analytics'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  useEffect(() => {
    initPostHog()
  }, [])

  useEffect(() => {
    if (session?.user) {
      const user = session.user as { id?: string; email?: string | null; name?: string | null }
      if (user.id) {
        identify(user.id, { email: user.email ?? undefined, name: user.name ?? undefined })
      }
    }
  }, [session])

  useEffect(() => {
    if (pathname) {
      const url = searchParams?.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname
      trackPageView(url)
    }
  }, [pathname, searchParams])

  return <>{children}</>
}
