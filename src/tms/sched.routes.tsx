import Facilitators from './facilitators/Facilitators'
import CourseDetail from './ops/CourseDetail'
import SessionCalendar from './ops/Calendar'

// id -> element for the additional screens declared in sched.screens.ts. Merged in App.tsx.
export const schedRoutes: Record<string, JSX.Element> = {
  facilitators: <Facilitators />,
  'course-detail': <CourseDetail />,
  'session-calendar': <SessionCalendar />,
}
