// In-progress session state survives the app being closed mid-workout. Storage can be
// unavailable (private mode), so every access is guarded and failure just means no draft.

export function loadDraft<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(`draft:${key}`)
    return raw ? (JSON.parse(raw) as T) : undefined
  } catch {
    return undefined
  }
}

export function saveDraft(key: string, value: unknown): void {
  try {
    localStorage.setItem(`draft:${key}`, JSON.stringify(value))
  } catch {
    // ignore
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(`draft:${key}`)
  } catch {
    // ignore
  }
}
