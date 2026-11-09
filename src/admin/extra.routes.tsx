import AuditTrail from './AuditTrail'
import Settings from './Settings'
// id -> element for the additional screens declared in extra.screens.ts. Merged in App.tsx.
export const extraRoutes: Record<string, JSX.Element> = {
  'audit-trail': <AuditTrail />,
  settings: <Settings />,
}
