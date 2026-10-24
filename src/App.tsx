import { CalendarDays, ChartLine, House, Settings as SettingsIcon } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { DataProvider } from './data'
import { today } from './lib/dates'
import { useRoute } from './router'
import { SessionScreen } from './screens/Session'
import { SettingsScreen } from './screens/Settings'
import { TodayScreen } from './screens/Today'
import { WeekScreen } from './screens/Week'

// Charts are the heaviest dependency, so they load only when Progress opens (and are precached for offline).
const ProgressScreen = lazy(() => import('./screens/Progress').then((m) => ({ default: m.ProgressScreen })))

export function App() {
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  )
}

function Shell() {
  const [section, ...rest] = useRoute()
  const fullScreen = section === 'do'

  let screen
  switch (section) {
    case 'do':
      screen = <SessionScreen itemId={rest[0]} />
      break
    case 'day':
      screen = <TodayScreen key={rest[0]} date={rest[0] ?? today()} />
      break
    case 'week':
      screen = <WeekScreen weekStart={rest[0]} />
      break
    case 'progress':
      screen = (
        <Suspense fallback={null}>
          <ProgressScreen />
        </Suspense>
      )
      break
    case 'settings':
      screen = <SettingsScreen sub={rest} />
      break
    default:
      screen = <TodayScreen key="today" date={today()} />
  }

  const tab = section === 'week' ? 'week' : section === 'progress' ? 'progress' : section === 'settings' ? 'settings' : 'today'
  return (
    <>
      <main className={`app${fullScreen ? ' full' : ''}`}>{screen}</main>
      {!fullScreen && (
        <div className="tabbar">
          <nav>
            <a href="#/" className={tab === 'today' ? 'on' : ''}>
              <House size={22} />
              Today
            </a>
            <a href="#/week" className={tab === 'week' ? 'on' : ''}>
              <CalendarDays size={22} />
              Week
            </a>
            <a href="#/progress" className={tab === 'progress' ? 'on' : ''}>
              <ChartLine size={22} />
              Progress
            </a>
            <a href="#/settings" className={tab === 'settings' ? 'on' : ''}>
              <SettingsIcon size={22} />
              Settings
            </a>
          </nav>
        </div>
      )}
    </>
  )
}
