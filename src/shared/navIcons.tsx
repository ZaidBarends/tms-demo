import type { ReactElement } from 'react'
import {
  HomeRegular, MoneyRegular, CalendarRegular, PeopleRegular, MailRegular, SettingsRegular, DocumentRegular, DataBarVerticalRegular,
  BookRegular, CartRegular, TrophyRegular, StarRegular, BriefcaseRegular, BuildingRegular, ShieldCheckmarkRegular, LightbulbRegular,
  ReceiptRegular, RibbonRegular, MapRegular, ArrowSyncRegular, TargetRegular, ClipboardTaskRegular, PersonRegular, SearchRegular, GlobeRegular,
} from '@fluentui/react-icons'

const BY_ID: Record<string, ReactElement> = {
  dashboard: <HomeRegular />, 'finance-dashboard': <HomeRegular />, 'client-dashboard': <HomeRegular />, 'talent-dashboard': <HomeRegular />,
  facilitators: <PeopleRegular />, opportunities: <TargetRegular />, tna: <ClipboardTaskRegular />, quotes: <DocumentRegular />, courses: <BookRegular />, 'my-schedule': <CalendarRegular />,
  resources: <BuildingRegular />, comms: <MailRegular />, invoicing: <ReceiptRegular />, workbook: <ArrowSyncRegular />, reports: <DataBarVerticalRegular />,
  'client-bookings': <CalendarRegular />, 'client-learners': <PeopleRegular />, 'client-invoices': <ReceiptRegular />, 'client-compliance': <ShieldCheckmarkRegular />,
  catalogue: <GlobeRegular />, 'my-bookings': <CartRegular />, academies: <BuildingRegular />, mentoring: <PersonRegular />, certifications: <RibbonRegular />,
  'my-learning': <BookRegular />, skills: <LightbulbRegular />, journeys: <MapRegular />, 'learning-admin': <PeopleRegular />, achievements: <TrophyRegular />,
  'talent-settings': <SettingsRegular />, 'talent-search': <SearchRegular />, introductions: <MailRegular />, 'talent-admin': <ShieldCheckmarkRegular />, roi: <StarRegular />,
  orgs: <BriefcaseRegular />, 'access-rules': <ShieldCheckmarkRegular />, settings: <SettingsRegular />, 'audit-trail': <ClipboardTaskRegular />, 'session-calendar': <CalendarRegular />,
}
export function navIcon(id: string): ReactElement { return BY_ID[id] ?? <DocumentRegular /> }
export { MoneyRegular }
