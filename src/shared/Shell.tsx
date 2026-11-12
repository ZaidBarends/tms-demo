import logoUrl from '../assets/zimele-logo.png'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Button, Menu, MenuTrigger, MenuPopover, MenuList, MenuItem, MenuDivider, Switch, MessageBar, MessageBarBody, MessageBarActions,
  Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent, DialogActions, Tooltip,
} from '@fluentui/react-components'
import { ArrowResetRegular, MapRegular, NavigationRegular, PersonRegular, PlayRegular, SearchRegular, WeatherMoonRegular, WeatherSunnyRegular } from '@fluentui/react-icons'
import { AREAS, PERSONAS, navFor, personaDef, ROLE_LABEL } from './access'
import { useStore } from './store'
import { ReleaseBadge } from './ui'
import { navIcon } from './navIcons'
import { Bell, CommandPalette, TourMenu, TourPanel, Welcome, useTour } from './presenter'

const ROLE_COLOR: Record<string, string> = { admin: '#597f2d', finance: '#0f6cbd', instructor: '#8764b8', internal: '#0e7a8a', client: '#c239b3', blearner: '#ca5010', b2c: '#0078d4', recruiter: '#986f0b', all: '#444' }

export default function Shell() {
  const { persona, setPersona, explainer, toggleExplainer, dark, toggleDark, reset, notice, setNotice } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const [navOpen, setNavOpen] = useState(false)
  const [navHidden, setNavHidden] = useState(false)
  // On a narrow screen the menu slides over the page; on a wide one it collapses to give the page the full width.
  const toggleNav = () => { if (window.matchMedia('(max-width: 980px)').matches) setNavOpen(o => !o); else setNavHidden(h => !h) }
  const [confirmReset, setConfirmReset] = useState(false)
  const [palette, setPalette] = useState(false)
  const [help, setHelp] = useState(false)
  const setTourMenu = useTour(s => s.setMenu)
  const tourActive = useTour(s => !!s.tour)
  const def = personaDef(persona)
  const items = navFor(persona)

  useEffect(() => { setNavOpen(false) }, [loc.pathname])
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(null), 7000); return () => clearTimeout(t) }, [notice, setNotice])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(p => !p) }
      const tag = (e.target as HTMLElement)?.tagName
      if (e.key === '?' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') setHelp(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const choose = (p: typeof persona) => { setPersona(p); setNotice(null); nav(personaDef(p).home) }
  const color = ROLE_COLOR[persona]

  return (
    <div className={`app${navHidden ? ' nav-hidden' : ''}`}>
      <div className="ribbon" role="note">Demo with invented data</div>
      <header className="topbar">
        <Button className="nav-toggle" appearance="subtle" icon={<NavigationRegular />} aria-label="Show or hide the menu" aria-expanded={navOpen || !navHidden} aria-controls="main-nav" onClick={toggleNav} />
        <Link to={def.home} className="brand" aria-label="Home"><img className="brand-logo" src={logoUrl} alt="Zimele Technologies" /> <span className="brand-name">Learning Platform</span></Link>
        <Button className="search-btn" appearance="outline" icon={<SearchRegular />} onClick={() => setPalette(true)} aria-label="Search and jump to anything (Ctrl K)">
          <span className="search-text">Jump to…</span><kbd>Ctrl K</kbd>
        </Button>
        <div className="spacer" />
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button icon={<PersonRegular />} aria-label="Viewing as" style={{ borderColor: color, borderWidth: 2 }}>Viewing as:&nbsp;<b>{persona === 'all' ? 'All access' : def.name}</b></Button>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              {PERSONAS.slice(0, 8).map(p => (
                <MenuItem key={p.id} onClick={() => choose(p.id)} aria-current={p.id === persona}>
                  <div className="persona-item"><b><span className="dot-role" style={{ background: ROLE_COLOR[p.id] }} />{p.label}{p.id === persona ? '  ✓' : ''}</b><span className="muted">{p.name}, {p.sub}</span></div>
                </MenuItem>
              ))}
              <MenuDivider />
              <MenuItem onClick={() => choose('all')}><div className="persona-item"><b><span className="dot-role" style={{ background: ROLE_COLOR.all }} />All access{persona === 'all' ? '  ✓' : ''}</b><span className="muted">Every screen, no switching</span></div></MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
        <Button as="a" href="#/demo-map" icon={<MapRegular />}>Demo map</Button>
        <Tooltip content="Guided tours" relationship="label"><Button appearance={tourActive ? 'primary' : 'subtle'} icon={<PlayRegular />} onClick={() => setTourMenu(true)} aria-label="Guided tours" /></Tooltip>
        <Switch label="Access explainer" checked={explainer} onChange={toggleExplainer} />
        <Bell />
        <Button appearance="subtle" icon={dark ? <WeatherSunnyRegular /> : <WeatherMoonRegular />} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleDark} />
        <Button icon={<ArrowResetRegular />} onClick={() => setConfirmReset(true)}>Reset demo</Button>
      </header>

      {notice && (
        <MessageBar intent="info" className="notice" role="status">
          <MessageBarBody>{notice}</MessageBarBody>
          <MessageBarActions><Button size="small" appearance="transparent" onClick={() => setNotice(null)}>Dismiss</Button></MessageBarActions>
        </MessageBar>
      )}

      <div className="body">
        {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} aria-hidden />}
        <nav id="main-nav" className={`sidenav ${navOpen ? 'open' : ''}`} aria-label="Main navigation">
          <div className="whoami" style={{ borderLeft: `4px solid ${color}` }}>
            <span className="avatar" aria-hidden style={{ background: color }}>{persona === 'all' ? 'A' : def.name[0]}</span>
            <div><b>{def.name}</b><div className="muted small">{persona === 'all' ? def.sub : `${ROLE_LABEL[persona]}, ${def.sub}`}</div></div>
          </div>
          {AREAS.map(area => {
            const list = items.filter(i => i.area === area)
            if (!list.length) return null
            return (
              <div key={area} className="nav-group">
                <div className="nav-heading">{area}</div>
                {list.map(i => (
                  <NavLink key={i.id} to={i.path} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <span className="nav-label"><span className="nav-ico" aria-hidden>{navIcon(i.id)}</span>{i.title}</span>{i.release !== 'R1' && <ReleaseBadge r={i.release} />}
                  </NavLink>
                ))}
              </div>
            )
          })}
          <div className="nav-group">
            <div className="nav-heading">Presenter</div>
            <NavLink to="/demo-map" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><span className="nav-label"><span className="nav-ico" aria-hidden><MapRegular /></span>Demo map</span></NavLink>
            <button className="nav-item nav-btn" onClick={() => setTourMenu(true)}><span className="nav-label"><span className="nav-ico" aria-hidden><PlayRegular /></span>Guided tours</span></button>
          </div>
        </nav>
        <main className="content page-in" id="main" tabIndex={-1} key={loc.pathname.split('/')[1]}><Outlet /></main>
      </div>

      <TourPanel />
      <TourMenu />
      <Welcome />
      <CommandPalette open={palette} setOpen={setPalette} />

      <Dialog open={help} onOpenChange={(_, d) => setHelp(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogContent>
              <table className="tbl"><tbody>
                <tr><td><kbd>Ctrl</kbd> + <kbd>K</kbd></td><td>Jump to any screen, persona or action</td></tr>
                <tr><td><kbd>?</kbd></td><td>Show this help</td></tr>
                <tr><td><kbd>Alt</kbd> + <kbd>←</kbd> / <kbd>→</kbd></td><td>Move a focused opportunity card between stages</td></tr>
                <tr><td><kbd>←</kbd> / <kbd>→</kbd></td><td>Previous or next slide in the course player</td></tr>
              </tbody></table>
            </DialogContent>
            <DialogActions><Button appearance="primary" onClick={() => setHelp(false)}>Close</Button></DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={confirmReset} onOpenChange={(_, d) => setConfirmReset(d.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Reset demo?</DialogTitle>
            <DialogContent>This restores all seed data and removes every change you made in this browser.</DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setConfirmReset(false)}>Cancel</Button>
              <Button appearance="primary" onClick={() => { reset(); setConfirmReset(false) }}>Reset demo</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  )
}
