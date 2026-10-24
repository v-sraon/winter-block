export const V_GRADES = Array.from({ length: 16 }, (_, i) => ({ label: `V${i}`, v: i }))

// Common boulder conversion; Font grades that share a V grade map to the same number.
export const FONT_GRADES: { label: string; v: number }[] = [
  { label: '4', v: 0 },
  { label: '5', v: 1 },
  { label: '5+', v: 2 },
  { label: '6A', v: 3 },
  { label: '6A+', v: 3 },
  { label: '6B', v: 4 },
  { label: '6B+', v: 4 },
  { label: '6C', v: 5 },
  { label: '6C+', v: 5 },
  { label: '7A', v: 6 },
  { label: '7A+', v: 7 },
  { label: '7B', v: 8 },
  { label: '7B+', v: 8 },
  { label: '7C', v: 9 },
  { label: '7C+', v: 10 },
  { label: '8A', v: 11 },
  { label: '8A+', v: 12 },
  { label: '8B', v: 13 },
  { label: '8B+', v: 14 },
  { label: '8C', v: 15 },
]

export function gradeOptions(scale: 'V' | 'Font') {
  return scale === 'V' ? V_GRADES : FONT_GRADES
}

export function gradeLabel(v: number, scale: 'V' | 'Font'): string {
  if (scale === 'V') return `V${v}`
  return FONT_GRADES.find((g) => g.v === v)?.label ?? `V${v}`
}
