import { ReactNode, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { FluentProvider, createLightTheme, createDarkTheme, BrandVariants } from '@fluentui/react-components'
import Shell from './shared/Shell'
import { SCREENS, canOpen, personaDef, Screen } from './shared/access'
import { useStore } from './shared/store'

import Dashboard from './tms/Dashboard'
import Opportunities from './tms/Opportunities'
import Tna from './tms/Tna'
import Quotes from './tms/Quotes'
import Courses from './tms/Courses'
import { SessionScreen, MySchedule } from './tms/Session'
import Resources from './tms/Resources'
import Comms from './tms/Comms'
import Invoicing from './tms/Invoicing'
import Workbook from './tms/Workbook'
import Reports from './tms/Reports'
import { ClientBookings, ClientLearners, ClientInvoices } from './tms/ClientPortal'
import Catalogue from './b2c/Catalogue'
import Checkout from './b2c/Checkout'
import MyBookings from './b2c/MyBookings'
import { Academies, Mentoring, Certifications } from './b2c/R2Screens'
import MyLearning from './lms/MyLearning'
import Player from './lms/Player'
import Skills from './lms/Skills'
import Journeys from './lms/Journeys'
import LearningAdmin from './lms/LearningAdmin'
import TalentSettings from './talent/Settings'
import TalentSearch from './talent/Search'
import Introductions from './talent/Introductions'
import TalentAdmin from './talent/TalentAdmin'
import Roi from './talent/Roi'
import Orgs from './admin/Orgs'
import AccessRules from './admin/AccessRules'
import DemoMap from './admin/DemoMap'
import { extraRoutes as tmsRoutes } from './tms/extra.routes'
import { schedRoutes } from './tms/sched.routes'
import { extraRoutes as b2cRoutes } from './b2c/extra.routes'
import { extraRoutes as lmsRoutes } from './lms/extra.routes'
import { extraRoutes as talentRoutes } from './talent/extra.routes'
import { extraRoutes as adminRoutes } from './admin/extra.routes'

const brand: BrandVariants = {
  10: '#020305', 20: '#101823', 30: '#14263b', 40: '#173250', 50: '#193f67', 60: '#1a4c80', 70: '#165a9a', 80: '#0f6cbd',
  90: '#2b7ac6', 100: '#4488cc', 110: '#5a96d2', 120: '#70a4d8', 130: '#85b1de', 140: '#9bbfe4', 150: '#b0cdea', 160: '#c6dbf0',
}
const light = createLightTheme(brand)
const dark = createDarkTheme(brand)

const COMPONENTS: Record<string, JSX.Element> = {
  dashboard: <Dashboard />, opportunities: <Opportunities />, tna: <Tna />, quotes: <Quotes />, courses: <Courses />,
  session: <SessionScreen />, 'my-schedule': <MySchedule />, resources: <Resources />, comms: <Comms />, invoicing: <Invoicing />,
  workbook: <Workbook />, reports: <Reports />, 'client-bookings': <ClientBookings />, 'client-learners': <ClientLearners />,
  'client-invoices': <ClientInvoices />, catalogue: <Catalogue />, checkout: <Checkout />, 'my-bookings': <MyBookings />,
  academies: <Academies />, mentoring: <Mentoring />, certifications: <Certifications />, 'my-learning': <MyLearning />,
  player: <Player />, skills: <Skills />, journeys: <Journeys />, 'learning-admin': <LearningAdmin />,
  'talent-settings': <TalentSettings />, 'talent-search': <TalentSearch />, introductions: <Introductions />,
  'talent-admin': <TalentAdmin />, roi: <Roi />, orgs: <Orgs />, 'access-rules': <AccessRules />, 'demo-map': <DemoMap />,
}

Object.assign(COMPONENTS, tmsRoutes, schedRoutes, b2cRoutes, lmsRoutes, talentRoutes, adminRoutes)

/** Opening a screen the current persona cannot use switches to one that can, with a notice. */
function Guard({ screen, children }: { screen: Screen; children: ReactNode }) {
  const persona = useStore(s => s.persona)
  const setPersona = useStore(s => s.setPersona)
  const setNotice = useStore(s => s.setNotice)
  const ok = canOpen(persona, screen)
  useEffect(() => {
    if (ok) return
    const target = screen.roles[0]
    setPersona(target)
    setNotice(`“${screen.title}” is not available to ${personaDef(persona).label}. Switched to ${personaDef(target).label} (${personaDef(target).name}), who can open it.`)
  }, [ok, persona, screen, setPersona, setNotice])
  return ok ? <>{children}</> : null
}

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function App() {
  const isDark = useStore(s => s.dark)
  const persona = useStore(s => s.persona)
  useEffect(() => { document.documentElement.dataset.theme = isDark ? 'dark' : 'light' }, [isDark])
  return (
    <FluentProvider theme={isDark ? dark : light} style={{ minHeight: '100vh', background: 'transparent' }}>
      <ScrollTop />
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Navigate to={personaDef(persona).home} replace />} />
          {SCREENS.map(s => (
            <Route key={s.id} path={s.route} element={<Guard screen={s}>{COMPONENTS[s.id]}</Guard>} />
          ))}
          <Route path="*" element={<Navigate to={personaDef(persona).home} replace />} />
        </Route>
      </Routes>
    </FluentProvider>
  )
}
