import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router'
import { LayoutGrid, ListOrdered, Loader2, LogOut, Settings } from 'lucide-react'

import { Wordmark } from '@/components/brand/Wordmark'
import { Button } from '@/components/ui/button'
import { BarDataContext } from '@/hooks/barDataContext'
import { useBarData } from '@/hooks/useBarData'
import { bootstrapConfig, ensureQueue, syncQueueOrder } from '@/lib/actions'
import { signOut, useStaffAuth } from '@/lib/authState'
import { cn } from '@/lib/utils'
import { LoginPage } from '@/pages/staff/LoginPage'
import { NoAccessPage } from '@/pages/staff/NoAccessPage'

const tabs = [
  { to: '/staff', end: true, label: 'רשימה', icon: ListOrdered },
  { to: '/staff/floor', end: false, label: 'מפה', icon: LayoutGrid },
  { to: '/staff/settings', end: false, label: 'הגדרות', icon: Settings },
]

export function StaffLayout() {
  const auth = useStaffAuth()

  if (auth.status === 'loading') return <FullScreenSpinner />
  if (auth.status === 'signed-out') return <LoginPage />
  if (auth.status === 'no-access') return <NoAccessPage user={auth.user} />
  return <StaffShell isOwner={auth.isOwner} />
}

function StaffShell({ isOwner }: { isOwner: boolean }) {
  const bar = useBarData()
  const listOrder = bar.list.map((p) => p.id)
  const orderKey = listOrder.join(',')

  // First run: the owner writes the default settings and the traced floor plan.
  useEffect(() => {
    if (bar.loading || !isOwner) return
    if (!bar.settingsExists || !bar.layoutExists) {
      bootstrapConfig({ settings: !bar.settingsExists, layout: !bar.layoutExists }).catch(console.error)
    }
  }, [bar.loading, isOwner, bar.settingsExists, bar.layoutExists])

  // Keep the public queue (what guests see: their place in line, no names) in sync.
  useEffect(() => {
    if (bar.loading) return
    if (!bar.queueExists) {
      ensureQueue().catch(console.error)
      return
    }
    if ((bar.queue?.order ?? []).join(',') !== orderKey) {
      syncQueueOrder(listOrder).catch(console.error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- orderKey captures listOrder
  }, [bar.loading, bar.queueExists, bar.queue?.order, orderKey])

  return (
    <BarDataContext.Provider value={bar}>
      <div className="flex h-full flex-col">
        <header className="relative flex items-center justify-center border-b bg-card px-4 pt-[env(safe-area-inset-top)]">
          <Wordmark className="py-3 text-3xl" />
          <Button
            variant="ghost"
            size="icon"
            className="absolute start-2 text-muted-foreground"
            onClick={() => signOut()}
            aria-label="התנתקות"
          >
            <LogOut />
          </Button>
        </header>
        <main className="flex-1 overflow-y-auto">
          {bar.error ? (
            <p className="p-6 text-destructive">שגיאה בטעינת הנתונים: {bar.error.message}</p>
          ) : bar.loading ? (
            <FullScreenSpinner />
          ) : (
            <Outlet />
          )}
        </main>
        <nav className="grid grid-cols-3 border-t bg-card pb-[env(safe-area-inset-bottom)]">
          {tabs.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-3 text-sm text-muted-foreground',
                  isActive && 'font-semibold text-primary',
                )
              }
            >
              <Icon className="size-6" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </BarDataContext.Provider>
  )
}

function FullScreenSpinner() {
  return (
    <div className="flex h-full min-h-40 items-center justify-center text-primary">
      <Loader2 className="size-8 animate-spin" />
    </div>
  )
}
