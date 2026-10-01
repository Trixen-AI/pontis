// Dashboard entry: loaded lazily under /app, so the marketing page never downloads the wallet stack.
import { Box } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { WagmiProvider } from 'wagmi'
import { AppShell } from './components/AppShell'
import { EmptyState, PillSolid, Skeleton } from './components/ui'
import Listings from './pages/Listings'
import Markets from './pages/Markets'
import Portfolio from './pages/Portfolio'
import Positions from './pages/Positions'
import { wagmiConfig } from './web3/wagmi'

// The market page carries the chart library; split it out.
const Market = lazy(() => import('./pages/Market'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } },
})

function PageFallback() {
  return (
    <Box display="grid" gap="16px">
      <Skeleton h="56px" w="320px" />
      <Skeleton h="420px" />
    </Box>
  )
}

function NotFound() {
  return (
    <EmptyState title="Nothing lives here" action={<PillSolid to="/app/markets">Go to markets</PillSolid>}>
      That page is not part of the Ponsia Perps app.
    </EmptyState>
  )
}

export default function DashboardRoot() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="markets" replace />} />
            <Route path="markets" element={<Markets />} />
            <Route
              path="markets/:token"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Market />
                </Suspense>
              }
            />
            <Route path="listings" element={<Listings />} />
            <Route path="positions" element={<Positions />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
