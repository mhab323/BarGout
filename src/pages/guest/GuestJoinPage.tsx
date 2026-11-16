import { Wordmark } from '@/components/brand/Wordmark'

export function GuestJoinPage() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center p-6 text-center">
      <Wordmark className="mt-6 text-5xl" />
      <h1 className="mt-8 text-3xl">ברוכים הבאים 🍷</h1>
      <p className="mt-2 text-muted-foreground">בקרוב: הצטרפות לרשימת ההמתנה.</p>
    </section>
  )
}
