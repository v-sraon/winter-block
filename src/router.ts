import { useEffect, useState } from 'react'

function parse(hash: string): string[] {
  return hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
}

export function useRoute(): string[] {
  const [hash, setHash] = useState(() => location.hash)
  useEffect(() => {
    const on = () => {
      setHash(location.hash)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return parse(hash)
}

let inAppDepth = 0

export function go(...parts: string[]): void {
  inAppDepth++
  location.hash = '/' + parts.map(encodeURIComponent).join('/')
}

/** Goes back within the app, or to Today if the page was opened directly. */
export function back(): void {
  if (inAppDepth > 0) {
    inAppDepth--
    history.back()
  } else {
    location.replace('#/')
  }
}
