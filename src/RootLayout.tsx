import { Flex } from '@chakra-ui/react'
import { Suspense, lazy } from 'react'
import { Outlet, ScrollRestoration } from 'react-router'
import { Mark } from './components/ui/Brand'

// The dashboard (wallet stack, charts) is its own chunk, fetched on first visit to /app.
const Dashboard = lazy(() => import('./app/DashboardRoot'))

export function DashboardRoute() {
  return (
    <Suspense fallback={<AppLoading />}>
      <Dashboard />
    </Suspense>
  )
}

/** Shared root for the website and the app: resets scroll between routes. */
export function RootLayout() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  )
}

/** Shown while the dashboard chunk downloads on first visit to /app. */
export function AppLoading() {
  return (
    <Flex minH="100vh" align="center" justify="center" bg="var(--ink)" aria-label="Loading FunPerps">
      <Mark size={80} animate />
    </Flex>
  )
}
