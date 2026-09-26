import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Navigate, createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import '@fontsource/inter/400.css'
import '@fontsource/newsreader/300.css'
import '@fontsource/newsreader/300-italic.css'
import './styles/tokens.css'
import './styles/base.css'
import App from './App.tsx'
import { DashboardRoute, RootLayout } from './RootLayout'

// Chakra v2 (same major as the reference). Global styles come from our own base.css.
const theme = extendTheme({
  config: { initialColorMode: 'dark', useSystemColorMode: false },
  fonts: { heading: 'var(--font-serif)', body: 'var(--font-sans)' },
  styles: { global: () => ({ body: { bg: 'var(--ink)', color: 'var(--white-92)' } }) },
})

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <App /> },
      { path: '/app/*', element: <DashboardRoute /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider theme={theme}>
      <RouterProvider router={router} />
    </ChakraProvider>
  </StrictMode>,
)
