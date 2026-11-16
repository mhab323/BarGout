import { useState } from 'react'
import { Pencil, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react'

import { FloorMap, type SpotStatus } from '@/components/floor/FloorMap'
import { GroupDialog } from '@/components/floor/GroupDialog'
import { SeatDialog } from '@/components/list/SeatDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useBar } from '@/hooks/barDataContext'
import { saveLayout } from '@/lib/actions'
import { DEFAULT_LAYOUT, totalSeats } from '@/lib/defaults'
import { addTable, duplicateLabels, moveTable, removeTable, tablesIn, updateTable } from '@/lib/layoutEdit'
import { occupiedSpots } from '@/lib/occupancy'
import { cn } from '@/lib/utils'
import type { FloorLayout, Party, SpotShape } from '@/types'

const SEAT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8]
const SHAPES: { value: SpotShape; label: string }[] = [
  { value: 'square', label: 'מרובע' },
  { value: 'round', label: 'עגול' },
  { value: 'rect', label: 'מלבני' },
]

export function FloorPage() {
  const bar = useBar()
  /** Draft layout while editing; null = not editing. */
  const [draft, setDraft] = useState<FloorLayout | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  /** Group tapped on the map (not editing), and the group being moved. */
  const [openGroupId, setOpenGroupId] = useState<string | null>(null)
  const [moving, setMoving] = useState<Party | null>(null)

  const editing = draft !== null
  const layout = draft ?? bar.layout
  const occupied = occupiedSpots(bar.seated)
  const status: Record<string, SpotStatus> = {}
  for (const [id, p] of occupied) status[id] = { state: 'seated', tone: 'idle', caption: p.name.slice(0, 8) }
  const taken = bar.seated.reduce((sum, p) => sum + p.size, 0)

  const selected = editing ? tablesIn(layout).find((t) => t.id === selectedId) : undefined
  // Live copy, so the dialog closes if the group is freed from another tablet.
  const openGroup = openGroupId ? (bar.seated.find((p) => p.id === openGroupId) ?? null) : null

  /** Normal mode: tapping a place where people sit opens their group. */
  function onSpotTap(spotId: string) {
    const party = occupied.get(spotId)
    if (party) setOpenGroupId(party.id)
  }
  const duplicates = editing ? duplicateLabels(layout) : []

  function startEditing() {
    setDraft(bar.layout)
    setSelectedId(null)
  }

  function stopEditing() {
    setDraft(null)
    setSelectedId(null)
  }

  async function save() {
    if (!draft) return
    setSaving(true)
    try {
      await saveLayout(draft)
      stopEditing()
    } catch (e) {
      console.error(e)
      alert('השמירה נכשלה. בדקו חיבור ונסו שוב.')
    } finally {
      setSaving(false)
    }
  }

  function add() {
    if (!draft) return
    const { layout: next, id } = addTable(draft, 2)
    setDraft(next)
    setSelectedId(id)
  }

  function resetToOriginal() {
    if (window.confirm('להחזיר את המפה למקור (כמו בציור)? השינויים שלא נשמרו יימחקו.')) {
      setDraft(DEFAULT_LAYOUT)
      setSelectedId(null)
    }
  }

  return (
    <section className="flex h-full flex-col gap-3 p-4">
      {/* header */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="me-auto">
          <h1 className="text-2xl">{editing ? 'עריכת מפה' : 'מפת המקום'}</h1>
          <p className="text-sm text-muted-foreground">
            {editing
              ? `${tablesIn(layout).length} שולחנות · ${totalSeats(layout)} מקומות`
              : `${taken} / ${totalSeats(layout)} מקומות תפוסים`}
          </p>
        </div>
        {editing ? (
          <>
            <Button variant="outline" onClick={add}>
              <Plus /> שולחן
            </Button>
            <Button variant="ghost" onClick={resetToOriginal}>
              <RotateCcw /> מקור
            </Button>
            <Button variant="outline" onClick={stopEditing}>
              <X /> ביטול
            </Button>
            <Button onClick={save} disabled={saving || duplicates.length > 0}>
              <Save /> שמירה
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={startEditing}>
            <Pencil /> עריכת מפה
          </Button>
        )}
      </div>

      {!editing && bar.seated.length > 0 && (
        <p className="text-sm text-muted-foreground">לחיצה על שולחן תפוס — להעברה למקום אחר או לפינוי.</p>
      )}
      {editing && (
        <p className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
          גררו שולחן כדי להזיז אותו (למשל מבפנים החוצה). לחיצה על שולחן — לשינוי מספר, מקומות או הסרה.
        </p>
      )}
      {duplicates.length > 0 && (
        <p role="alert" className="text-sm font-medium text-destructive">
          יש שני שולחנות עם אותו מספר: {duplicates.join(', ')}. שנו אחד מהם לפני השמירה.
        </p>
      )}

      {/* the map */}
      <div className={cn('min-h-0 flex-1 rounded-xl border bg-card p-3', editing && 'border-primary/40 border-dashed')}>
        <FloorMap
          layout={layout}
          status={status}
          selected={selected ? [selected.id] : []}
          showGrid={editing}
          onSpotClick={editing ? (id) => setSelectedId(id.includes(':') ? null : id) : onSpotTap}
          onTableMove={editing ? (id, x, y) => setDraft((d) => (d ? moveTable(d, id, x, y) : d)) : undefined}
          className="size-full"
        />
      </div>

      {/* selected table */}
      {editing && selected && (
        <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-3">
          <div className="w-24 space-y-1.5">
            <Label htmlFor="t-label">מספר שולחן</Label>
            <Input
              id="t-label"
              inputMode="numeric"
              className="h-10 text-center text-lg font-semibold"
              value={selected.label}
              maxLength={4}
              onChange={(e) => setDraft((d) => (d ? updateTable(d, selected.id, { label: e.target.value.trim() }) : d))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>מקומות</Label>
            <div className="flex gap-1">
              {SEAT_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={selected.seats === n}
                  onClick={() => setDraft((d) => (d ? updateTable(d, selected.id, { seats: n }) : d))}
                  className={cn(
                    'size-10 rounded-md border font-semibold',
                    selected.seats === n ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>צורה</Label>
            <div className="flex gap-1">
              {SHAPES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={selected.shape === s.value}
                  onClick={() => setDraft((d) => (d ? updateTable(d, selected.id, { shape: s.value }) : d))}
                  className={cn(
                    'h-10 rounded-md border px-3 font-medium',
                    selected.shape === s.value ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <Button
            variant="ghost"
            className="ms-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={occupied.has(selected.id)}
            title={occupied.has(selected.id) ? 'יושבים אנשים בשולחן' : undefined}
            onClick={() => {
              setDraft((d) => (d ? removeTable(d, selected.id) : d))
              setSelectedId(null)
            }}
          >
            <Trash2 /> {occupied.has(selected.id) ? 'יושבים בשולחן' : 'הסרת שולחן'}
          </Button>
        </div>
      )}

      <GroupDialog
        party={openGroup}
        layout={bar.layout}
        onOpenChange={(o) => !o && setOpenGroupId(null)}
        onMove={(party) => {
          setOpenGroupId(null)
          setMoving(party)
        }}
      />
      <SeatDialog
        key={moving?.id ?? 'none'}
        mode="move"
        party={moving}
        layout={bar.layout}
        seated={bar.seated}
        busyMode={bar.busyMode}
        onOpenChange={(o) => !o && setMoving(null)}
      />
    </section>
  )
}
