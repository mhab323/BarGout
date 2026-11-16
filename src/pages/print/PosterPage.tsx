import { Printer } from 'lucide-react'

import { QrCode } from '@/components/brand/QrCode'
import { Wordmark } from '@/components/brand/Wordmark'
import { Button } from '@/components/ui/button'
import { joinUrl } from '@/lib/urls'

/** A4 poster for the door: scan to join the waiting list. Print from the browser. */
export function PosterPage() {
  const url = joinUrl()
  return (
    <div className="min-h-full bg-white text-[#2a1016]">
      <div className="fixed top-4 left-4 print:hidden">
        <Button size="lg" onClick={() => window.print()}>
          <Printer /> הדפסה
        </Button>
      </div>
      <div className="mx-auto flex min-h-[100dvh] max-w-[190mm] flex-col items-center justify-center gap-[8mm] p-[12mm] text-center print:min-h-[277mm]">
        <Wordmark className="text-[26mm]" />
        <div className="h-px w-2/3 bg-[#720f22]/30" />
        <h1 className="font-serif text-[13mm] leading-tight font-medium text-[#720f22]">רשימת המתנה</h1>
        <p className="text-[6.5mm] leading-snug">
          סרקו, הירשמו,
          <br />
          ונשלח לכם וואטסאפ כשהמקום שלכם מוכן 🍷
        </p>
        <QrCode value={url} className="w-[95mm] rounded-[4mm] border-[1.5mm] border-[#720f22] p-[3mm]" />
        <p className="text-[4.5mm] text-[#7b6268]">בלי אפליקציה ובלי הרשמה · אפשר להתרחק קצת, רק שהטלפון יהיה איתכם</p>
        <p dir="ltr" className="text-[3.5mm] text-[#7b6268]">
          {url.replace(/^https?:\/\//, '')}
        </p>
      </div>
    </div>
  )
}
