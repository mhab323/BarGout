import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Loader2 } from 'lucide-react'

import { AuthProvider } from '@/lib/auth'

// Loaded on demand: a guest scanning the QR code downloads only the guest page.
const GuestJoinPage = lazy(() => import('@/pages/guest/GuestJoinPage').then((m) => ({ default: m.GuestJoinPage })))
const PosterPage = lazy(() => import('@/pages/print/PosterPage').then((m) => ({ default: m.PosterPage })))
const StaffLayout = lazy(() => import('@/pages/staff/StaffLayout').then((m) => ({ default: m.StaffLayout })))
const WaitlistPage = lazy(() => import('@/pages/staff/WaitlistPage').then((m) => ({ default: m.WaitlistPage })))
const FloorPage = lazy(() => import('@/pages/staff/FloorPage').then((m) => ({ default: m.FloorPage })))
const SettingsPage = lazy(() => import('@/pages/staff/SettingsPage').then((m) => ({ default: m.SettingsPage })))

function PageSpinner() {
  return (
    <div className="flex h-full min-h-40 items-center justify-center text-primary">
      <Loader2 className="size-8 animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageSpinner />}>
          <Routes>
            {/* Guest side - opened from the QR code at the door */}
            <Route path="/join" element={<GuestJoinPage />} />
            {/* Printable QR poster for the door */}
            <Route path="/poster" element={<PosterPage />} />

            {/* Staff side - tablets + owner's phone */}
            <Route path="/staff" element={<StaffLayout />}>
              <Route index element={<WaitlistPage />} />
              <Route path="floor" element={<FloorPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/staff" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
