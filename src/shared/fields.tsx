import { Field, Input, Select, Textarea } from '@fluentui/react-components'

export function FText({ label, value, onChange, type = 'text', error, placeholder, disabled, hint, min, max }: {
  label: string; value: string | number; onChange: (v: string) => void; type?: string; error?: string; placeholder?: string; disabled?: boolean; hint?: string; min?: number; max?: number
}) {
  return (
    <Field label={label} validationState={error ? 'error' : 'none'} validationMessage={error} hint={hint}>
      <Input type={type as any} value={String(value)} onChange={(_, d) => onChange(d.value)} placeholder={placeholder} disabled={disabled} min={min} max={max} />
    </Field>
  )
}
export function FArea({ label, value, onChange, rows = 4, error }: { label: string; value: string; onChange: (v: string) => void; rows?: number; error?: string }) {
  return (
    <Field label={label} validationState={error ? 'error' : 'none'} validationMessage={error}>
      <Textarea value={value} onChange={(_, d) => onChange(d.value)} rows={rows} resize="vertical" />
    </Field>
  )
}
export function FSelect({ label, value, onChange, options, error, placeholder, disabled }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; error?: string; placeholder?: string; disabled?: boolean
}) {
  return (
    <Field label={label} validationState={error ? 'error' : 'none'} validationMessage={error}>
      <Select value={value} onChange={(_, d) => onChange(d.value)} disabled={disabled}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
    </Field>
  )
}
