// Wallet stack: Reown AppKit modal with the Solana adapter (Phantom, Solflare, Backpack and any
// Wallet Standard wallet, plus WalletConnect). Runs once, when the dashboard chunk is first imported.
import { type AppKit, createAppKit } from '@reown/appkit/react'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'
import { solana } from '@reown/appkit/networks'
import { REOWN_PROJECT_ID } from '@/app/config'

function init(): { walletReady: boolean; appKit?: AppKit } {
  if (!REOWN_PROJECT_ID) return { walletReady: false } // public reads still work without it
  const appKit = createAppKit({
    adapters: [new SolanaAdapter()],
    networks: [solana],
    defaultNetwork: solana,
    projectId: REOWN_PROJECT_ID,
    metadata: {
      name: 'FunPerps',
      description: 'Perps for every Pump.fun token. Long the runners, short the rugs.',
      url: window.location.origin,
      icons: [`${window.location.origin}/brand/logo-500.png`],
    },
    features: { analytics: false, email: false, socials: false, swaps: false, onramp: false },
    // Phantom, Solflare, Backpack (IDs from Reown's wallet registry) listed first
    featuredWalletIds: [
      'a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393',
      '1ca0bdd4747578705b1939af023d120677c64fe6ca76add81fda36e350605e79',
      '2bd8c14e035c2d48f184aaa168559e86b0e3433228d3c4075900a221785019b0',
    ],
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#F98500',
      '--w3m-color-mix': '#0A0A0B',
      '--w3m-color-mix-strength': 30,
      '--w3m-font-family': 'Inter, system-ui, sans-serif',
      '--w3m-border-radius-master': '3px',
      '--w3m-z-index': 60,
    },
  })
  return { walletReady: true, appKit }
}

const setup = init()
export const walletReady = setup.walletReady

/**
 * Opens the Reown modal. Safe to call from any component: without a project ID AppKit is never
 * created (and its hooks would throw), so this simply does nothing.
 */
export function openWallet(view?: 'Account' | 'Connect') {
  void setup.appKit?.open(view ? { view } : undefined)
}
