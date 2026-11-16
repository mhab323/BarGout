import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AuthProvider } from '@/lib/auth'

import { GuestJoinPage } from '@/pages/guest/GuestJoinPage'
import { PosterPage } from '@/pages/print/PosterPage'
import { StaffLayout } from '@/pages/staff/StaffLayout'
import { WaitlistPage } from '@/pages/staff/WaitlistPage'
import { FloorPage } from '@/pages/staff/FloorPage'
import { SettingsPage } from '@/pages/staff/SettingsPage'

export default function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
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
    </BrowserRouter>
    </AuthProvider>
  )
}
