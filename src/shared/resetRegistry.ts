// Area stores register a reset callback here; "Reset demo" runs them all.
const hooks: Array<() => void> = []
export function registerReset(fn: () => void) { hooks.push(fn) }
export function runResets() { hooks.forEach(h => h()) }
