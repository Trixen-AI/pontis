// Wallet stack: Reown AppKit modal + wagmi, locked to Robinhood Chain.
// Runs once, at module load, the first time the dashboard chunk is imported.
import { type AppKit, createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { http, createConfig, type Config } from 'wagmi'
import { REOWN_PROJECT_ID, RPC_URL, robinhood } from '@/app/config'

const transports = { [robinhood.id]: http(RPC_URL, { batch: true }) }

function init(): { config: Config; walletReady: boolean; appKit?: AppKit } {
  if (!REOWN_PROJECT_ID) {
    // No project ID: public reads still work, wallet connection is unavailable.
    return { config: createConfig({ chains: [robinhood], transports }), walletReady: false }
  }
  const adapter = new WagmiAdapter({ networks: [robinhood], projectId: REOWN_PROJECT_ID, transports })
  const appKit = createAppKit({
    adapters: [adapter],
    networks: [robinhood],
    defaultNetwork: robinhood,
    allowUnsupportedChain: false,
    projectId: REOWN_PROJECT_ID,
    metadata: {
      name: 'Ponsia Perps',
      description: 'Perps for every PONS token. Long the runners, short the rugs.',
      url: window.location.origin,
      icons: [`${window.location.origin}/brand/logo-500.png`],
    },
    features: { analytics: false, email: false, socials: false, swaps: false, onramp: false },
    themeMode: 'dark',
    themeVariables: {
      '--w3m-accent': '#97FCE4',
      '--w3m-color-mix': '#072723',
      '--w3m-color-mix-strength': 30,
      '--w3m-font-family': 'Inter, system-ui, sans-serif',
      '--w3m-border-radius-master': '3px',
      '--w3m-z-index': 60,
    },
  })
  return { config: adapter.wagmiConfig, walletReady: true, appKit }
}

const setup = init()
export const wagmiConfig = setup.config
export const walletReady = setup.walletReady

/**
 * Opens the Reown modal. Safe to call from any component: without a project ID AppKit is never
 * created (and its hooks would throw), so this simply does nothing.
 */
export function openWallet(view?: 'Account' | 'Networks') {
  void setup.appKit?.open(view ? { view } : undefined)
}
