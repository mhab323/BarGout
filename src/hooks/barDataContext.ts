import { createContext, useContext } from 'react'

import type { useBarData } from '@/hooks/useBarData'

export type BarData = ReturnType<typeof useBarData>

export const BarDataContext = createContext<BarData | null>(null)

/** Shared live data for all staff screens (one set of Firestore listeners). */
export function useBar(): BarData {
  const value = useContext(BarDataContext)
  if (!value) throw new Error('useBar must be used inside the staff layout')
  return value
}
