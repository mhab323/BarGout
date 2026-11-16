import { DoorOpen, MoveLeft, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useNow } from '@/hooks/useNow'
import { finishGroup } from '@/lib/actions'
import { minutesLabel } from '@/lib/format'
import { describeSpots } from '@/lib/occupancy'
import type { FloorLayout, Party } from '@/types'

/** Tapped an occupied table or stool: who is there, and move them / free the table. */
export function GroupDialog({
  party,
  layout,
  onMove,
  onOpenChange,
}: {
  party: Party | null
  layout: FloorLayout
  onMove: (party: Party) => void
  onOpenChange: (open: boolean) => void
}) {
  const now = useNow(15000)
  const satMin = party?.seatedAt ? Math.floor((now - party.seatedAt.toMillis()) / 60000) : 0

  return (
    <Dialog open={Boolean(party)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {party && (
          <>
            <DialogHeader>
              <DialogTitle>{party.name || 'ללא שם'}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base">
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <Users className="size-4" /> {party.size}
                </span>
                <span>{describeSpots(party.spotIds, layout)}</span>
                <span>{satMin < 1 ? 'התיישבו הרגע' : `יושבים ${minutesLabel(satMin)}`}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2">
              <Button size="lg" variant="outline" onClick={() => onMove(party)}>
                <MoveLeft />
                העברה למקום אחר
              </Button>
              <Button
                size="lg"
                onClick={() => {
                  void finishGroup(party.id).catch(console.error)
                  onOpenChange(false)
                }}
              >
                <DoorOpen />
                פינוי — הלכו, המקום פנוי
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
