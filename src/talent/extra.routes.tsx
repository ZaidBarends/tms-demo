import RecruiterDashboard from './RecruiterDashboard'
import ClientDashboard from '../tms/client/ClientDashboard'
import ClientCompliance from '../tms/client/ClientCompliance'

// id -> element for the additional screens declared in extra.screens.ts. Merged in App.tsx.
export const extraRoutes: Record<string, JSX.Element> = {
  'client-dashboard': <ClientDashboard />,
  'client-compliance': <ClientCompliance />,
  'talent-dashboard': <RecruiterDashboard />,
}
