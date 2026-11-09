/** Browser-only helpers for exporting files. Nothing leaves the page. */
export function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
export function toCsv(rows: unknown[][]): string {
  return rows.map(r => r.map(csvCell).join(',')).join('\n')
}
export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8') {
  if (typeof document === 'undefined') return
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function printWindow() {
  if (typeof window !== 'undefined' && typeof window.print === 'function') window.print()
}
