import { NavLink, Outlet } from 'react-router'
import { LayoutGrid, ListOrdered, Settings } from 'lucide-react'

import { cn } from '@/lib/utils'

const tabs = [
  { to: '/staff', end: true, label: 'רשימה', icon: ListOrdered },
  { to: '/staff/floor', end: false, label: 'מפה', icon: LayoutGrid },
  { to: '/staff/settings', end: false, label: 'הגדרות', icon: Settings },
]

export function StaffLayout() {
  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
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
  )
}
