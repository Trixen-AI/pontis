// All page copy in one place. Links marked PLACEHOLDER point nowhere real yet.

export const nav = {
  links: [
    { label: 'Markets', href: '/app/markets' },
    { label: 'Docs', href: '#' }, // PLACEHOLDER: docs URL
    { label: 'Listings', href: '/app/listings' },
  ],
  cta: { label: 'Open App', href: '/app/markets' },
}

export const hero = {
  title: ['Perps for Every', 'Pump.fun Token'],
  body: ['Long the runners. Short the rugs.', 'Leverage on any Pump.fun launch, settled on Solana.'],
  primary: { label: 'Go Long', href: '/app/markets?tab=runners' },
  secondary: { label: 'Go Short', href: '/app/markets?tab=rugs' },
}

/** The FunPerps token (Pump.fun launch on Solana). */
export const token = {
  symbol: 'FUNP',
  address: 'CKabfUPRm2kkn8WPaEwEvPTpTaxatXoWHceCU5mLpump',
  explorer: 'https://solscan.io/token/CKabfUPRm2kkn8WPaEwEvPTpTaxatXoWHceCU5mLpump',
}

export const stack = {
  titleBefore: 'Inside',
  titleAfter: '',
  /** One entry per scroll step. `focus` names what the scene lights up. */
  steps: [
    {
      focus: 'sides',
      text: 'Every Pump.fun token gets two sides. Go long while a launch is running, go short the moment it starts to slide.',
    },
    {
      focus: 'markets',
      text: 'Each market ships with funding, a mark price, liquidations and an insurance fund from its first trade.',
    },
    {
      focus: 'engines',
      text: 'The Listing Engine picks up a new Pump.fun token straight off its bonding curve and hands it to the Perp Engine, which opens the market. No listing form and no waiting list.',
    },
    {
      focus: 'chain',
      text: 'Solana sits underneath it all. Orders, margin and settlement land onchain, so any position can be checked by anyone.',
    },
  ],
  candles: [
    { id: 'longs', label: 'Longs', side: 'long' },
    { id: 'shorts', label: 'Shorts', side: 'short' },
    { id: 'funding', label: 'Funding', side: 'long' },
    { id: 'mark', label: 'Mark Price', side: 'long' },
    { id: 'liq', label: 'Liquidations', side: 'short' },
    { id: 'insurance', label: 'Insurance Fund', side: 'long' },
    { id: 'vaults', label: 'Vaults', side: 'long' },
    { id: 'listings', label: 'New Listings', side: 'long' },
    { id: 'every', label: 'Every Pump.fun Token', side: 'long' },
  ],
  plates: { left: 'Listing Engine', right: 'Perp Engine', base: 'Solana' },
} as const

// PLACEHOLDER figures: product targets for the concept, not live data.
export const stats = [
  { label: 'Listing delay', value: 'First trade' },
  { label: 'Max leverage', value: '10x' },
  { label: 'Sides', value: 'Long + Short' },
  { label: 'Settles on', value: 'Solana' },
]

export const pledge = {
  kicker: 'A runner and a rug look the same for the first hour.',
  title: 'Trade both sides.',
}

export const statement = {
  // [text, highlighted?] runs, one array per line
  lines: [
    [['Every ', false], ['Pump.fun token', true], [' that lists', false]],
    [['opens a ', false], ['perp market', true], [' with it,', false]],
    [['live on ', false], ['Solana.', true]],
  ] as [string, boolean][][],
  primary: { label: 'Go Long', href: '/app/markets?tab=runners' },
  secondary: { label: 'Go Short', href: '/app/markets?tab=rugs' },
}

export const footer = {
  year: '2026',
  left: [
    { label: 'Terms of Use', href: '#' }, // PLACEHOLDER
    { label: 'Privacy Policy', href: '#' }, // PLACEHOLDER
  ],
  right: [
    { label: 'Risk Disclosure', href: '#' }, // PLACEHOLDER
  ],
}

/** Social links. Add an entry here (and its icon in SocialIcons.tsx) to show another platform. */
export const socials = [{ key: 'x', label: 'FunPerps on X', href: 'https://x.com/FunPerps_xyz' }] as const
