import Achievements from './Achievements'
// id -> element for the additional screens declared in extra.screens.ts. Merged in App.tsx.
export const extraRoutes: Record<string, JSX.Element> = {
  achievements: <Achievements />,
}
