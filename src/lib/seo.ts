// Per-route head tags for the SPA. index.html ships the defaults (and the tags crawlers see first);
// this keeps title, description, canonical and share tags in step with the current route.
import { useEffect } from 'react'

export const SITE_URL = 'https://funperps.xyz'
const DEFAULT_DESCRIPTION =
  'FunPerps opens a perpetual market for every token launched on Pump.fun. Long the runners, short the rugs, with live prices and SOL margin on Solana.'

type Seo = {
  /** Page title without the brand suffix; omit for the home page. */
  title?: string
  description?: string
  /** Canonical path, e.g. "/app/markets". */
  path: string
  /** Wallet-specific pages should not be indexed. */
  noindex?: boolean
}

function setMeta(selector: string, attr: 'content' | 'href', value: string) {
  document.head.querySelector(selector)?.setAttribute(attr, value)
}

export function useSeo({ title, description = DEFAULT_DESCRIPTION, path, noindex = false }: Seo) {
  useEffect(() => {
    const full = title ? `${title} | FunPerps` : 'FunPerps | Perps for every Pump.fun token on Solana'
    const url = `${SITE_URL}${path}`
    document.title = full
    setMeta('meta[name="description"]', 'content', description)
    setMeta('#canonical', 'href', url)
    setMeta('#og-url', 'content', url)
    setMeta('#og-title', 'content', full)
    setMeta('#og-description', 'content', description)
    setMeta('#tw-title', 'content', full)
    setMeta('meta[name="robots"]', 'content', noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large')
  }, [title, description, path, noindex])
}
