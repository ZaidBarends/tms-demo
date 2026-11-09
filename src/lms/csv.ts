/** Tiny CSV and file download helpers shared by the learner and learning-admin screens. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return rows.map(r => r.map(cell).join(',')).join('\r\n')
}

export function downloadBlob(filename: string, content: string, type = 'text/plain') {
  try {
    const blob = new Blob([content], { type: `${type};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch { /* download is not available in this environment */ }
}

export const downloadCsv = (filename: string, rows: (string | number | null | undefined)[][]) =>
  downloadBlob(filename, toCsv(rows), 'text/csv')

/** A minimal calendar invite (.ics) for a single all-day or timed event. */
export function icsFor(title: string, dateIso: string, location: string, startHour = 8, hours = 8): string {
  const d = dateIso.replace(/-/g, '')
  const p = (n: number) => String(n).padStart(2, '0')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Training demo//EN', 'BEGIN:VEVENT',
    `UID:${d}-${title.replace(/\W/g, '').slice(0, 12)}@trainco.example`,
    `DTSTART:${d}T${p(startHour)}0000`, `DTEND:${d}T${p(startHour + hours)}0000`,
    `SUMMARY:${title}`, `LOCATION:${location}`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
}
export const downloadIcs = (title: string, dateIso: string, location: string, startHour = 8, hours = 8) =>
  downloadBlob(`${title.replace(/\W+/g, '-').toLowerCase()}.ics`, icsFor(title, dateIso, location, startHour, hours), 'text/calendar')

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
}
