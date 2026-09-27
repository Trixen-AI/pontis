import { Box, Flex, chakra } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { Lockup } from '@/components/ui/Brand'
import { ConnectButton } from './ConnectButton'

// Small line icons for the mobile dock (24 grid, 1.8 stroke, currentColor).
const icon = (children: ReactNode) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)
const ICONS = {
  // a long candle and a short candle
  markets: icon(
    <>
      <path d="M7.5 3v3.5M7.5 15.5V19" />
      <rect x="5" y="6.5" width="5" height="9" rx="1.2" />
      <path d="M16.5 6v3M16.5 16v5" />
      <rect x="14" y="9" width="5" height="7" rx="1.2" />
    </>,
  ),
  // a fresh launch
  listings: icon(
    <>
      <path d="M11 4.5l1.7 4.8 4.8 1.7-4.8 1.7L11 17.5l-1.7-4.8L4.5 11l4.8-1.7z" />
      <path d="M18.5 3.5v3M17 5h3" />
    </>,
  ),
  // both sides of a position
  positions: icon(
    <>
      <path d="M8 19.5V4.5M4.5 8L8 4.5 11.5 8" />
      <path d="M16 4.5v15M12.5 16l3.5 3.5 3.5-3.5" />
    </>,
  ),
  // wallet
  portfolio: icon(
    <>
      <rect x="3.5" y="7" width="17" height="12.5" rx="3" />
      <path d="M6.5 7l8.5-3 1.2 3" />
      <path d="M16.5 13.25h1.5" />
    </>,
  ),
}

const NAV = [
  { to: '/app/markets', label: 'Markets', icon: ICONS.markets },
  { to: '/app/listings', label: 'Listings', icon: ICONS.listings },
  { to: '/app/positions', label: 'Positions', icon: ICONS.positions },
  { to: '/app/portfolio', label: 'Portfolio', icon: ICONS.portfolio },
]

/** Same white pill as the website nav. Sections live here on desktop, in the dock on phones. */
function AppNav() {
  return (
    <Box as="header" position="sticky" top="0" zIndex={20} pt={{ base: '12px', md: '20px' }} pb="12px" px={{ base: '16px', md: '24px' }} bg="linear-gradient(var(--ink) 70%, rgba(14,21,16,0))">
      <Flex
        as="nav"
        aria-label="App"
        maxW="var(--container)"
        h={{ base: '52px', md: 'var(--nav-h)' }}
        mx="auto"
        align="center"
        justify="space-between"
        gap="12px"
        bg="var(--white)"
        borderRadius="37px"
        p={{ base: '6px 6px 6px 14px', md: '8px 8px 8px 16px' }}
      >
        <chakra.a
          as={Link}
          {...{ to: '/' }}
          display="flex"
          alignItems="center"
          color="var(--ink)"
          aria-label="FunPerps home"
          flexShrink={0}
          sx={{ '& svg': { height: { base: '24px', md: '28px' }, width: 'auto' } }}
        >
          <Lockup height={28} />
        </chakra.a>
        <Flex align="center" gap="28px" display={{ base: 'none', md: 'flex' }}>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              style={({ isActive }) => ({
                color: 'var(--ink)',
                fontSize: 16,
                lineHeight: '24px',
                opacity: isActive ? 1 : 0.62,
                textDecoration: 'none',
                borderBottom: isActive ? '1.5px solid var(--ink)' : '1.5px solid transparent',
                paddingBottom: 2,
              })}
            >
              {n.label}
            </NavLink>
          ))}
        </Flex>
        <ConnectButton />
      </Flex>
    </Box>
  )
}

/** Phone tab bar: a floating white pill at the bottom, four equal tabs, the active one in orange. */
function MobileDock() {
  return (
    <Box
      as="nav"
      aria-label="Sections"
      display={{ base: 'block', md: 'none' }}
      position="fixed"
      left="12px"
      right="12px"
      bottom="calc(12px + env(safe-area-inset-bottom))"
      zIndex={30}
    >
      <Box
        display="grid"
        gridTemplateColumns="repeat(4, 1fr)"
        gap="4px"
        maxW="480px"
        mx="auto"
        p="5px"
        bg="var(--white)"
        borderRadius="36px"
        boxShadow="0 10px 30px rgba(0,0,0,0.45)"
      >
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              height: 54,
              borderRadius: 30,
              textDecoration: 'none',
              fontSize: 11,
              lineHeight: '14px',
              color: 'var(--ink)',
              background: isActive ? 'var(--accent)' : 'transparent',
              opacity: isActive ? 1 : 0.6,
              transition: 'background 0.2s, opacity 0.2s',
              WebkitTapHighlightColor: 'transparent',
            })}
          >
            {n.icon}
            <span>{n.label}</span>
          </NavLink>
        ))}
      </Box>
    </Box>
  )
}

export function AppShell() {
  return (
    <Box minH="100vh" bg="var(--ink)">
      <AppNav />
      {/* phones: leave room so the dock never covers the last row or the order button */}
      <Box as="main" px={{ base: '16px', md: '24px' }} pt={{ base: '8px', md: '28px' }} pb={{ base: 'calc(104px + env(safe-area-inset-bottom))', md: '80px' }}>
        <Box maxW="var(--container)" mx="auto">
          <Outlet />
        </Box>
      </Box>
      <MobileDock />
    </Box>
  )
}
