import { useEffect, useState } from 'react'
import { onSnapshot, type DocumentReference, type Query } from 'firebase/firestore'

export interface Live<T> {
  data: T
  loading: boolean
  error: Error | null
}

/** Live document. `data` is null while loading or when the document does not exist. */
export function useLiveDoc<T>(ref: DocumentReference<T> | null): Live<T | null> & { exists: boolean } {
  const [state, setState] = useState<Live<T | null> & { exists: boolean }>({
    data: null,
    loading: Boolean(ref),
    error: null,
    exists: false,
  })
  const path = ref?.path ?? null

  useEffect(() => {
    if (!ref) return
    return onSnapshot(
      ref,
      (snap) => setState({ data: snap.exists() ? snap.data() : null, exists: snap.exists(), loading: false, error: null }),
      (error) => setState({ data: null, exists: false, loading: false, error }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-subscribe only when the path changes
  }, [path])

  return state
}

/** Live query results. Pass a stable `key` that changes whenever the query changes. */
export function useLiveQuery<T>(query: Query<T> | null, key: string): Live<T[]> {
  const [state, setState] = useState<Live<T[]>>({ data: [], loading: Boolean(query), error: null })

  useEffect(() => {
    if (!query) return
    return onSnapshot(
      query,
      (snap) => setState({ data: snap.docs.map((d) => d.data()), loading: false, error: null }),
      (error) => setState({ data: [], loading: false, error }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-subscribe only when the key changes
  }, [key])

  return state
}
