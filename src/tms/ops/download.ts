export function csvEscape(v: string | number | undefined | null): string {
  const s = v === undefined || v === null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
export const toCsv = (rows: (string | number | undefined | null)[][]) => rows.map(r => r.map(csvEscape).join(',')).join('\r\n')

export function downloadText(name: string, text: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 500)
}
export const downloadCsv = (name: string, rows: (string | number | undefined | null)[][]) => downloadText(name, '﻿' + toCsv(rows), 'text/csv;charset=utf-8')
export const printPage = () => { try { window.print() } catch { /* ignore */ } }
