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
  title: ['Perps for Every', 'PONS Token'],
  body: [
    'Long the runners. Short the rugs.',
    'Leverage on any PONS launch, settled on Robinhood Chain.',
  ],
  primary: { label: 'Go Long', href: '/app/markets?tab=runners' },
  secondary: { label: 'Go Short', href: '/app/markets?tab=rugs' },
}

export const stack = {
  titleBefore: 'Inside',
  titleAfter: '',
  /** One entry per scroll step. `focus` names what the scene lights up. */
  steps: [
    {
      focus: 'sides',
      text: 'Every PONS token gets two sides. Go long while a launch is running, go short the moment it starts to slide.',
    },
    {
      focus: 'markets',
      text: 'Each market ships with funding, a mark price, liquidations and an insurance fund from its first block of trading.',
    },
    {
      focus: 'engines',
      text: 'The Listing Engine picks up a new PONS token as it launches and hands it to the Perp Engine, which opens the market. No listing form and no waiting list.',
    },
    {
      focus: 'chain',
      text: 'Robinhood Chain sits underneath it all. Orders, margin and settlement land onchain, so any position can be checked by anyone.',
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
    { id: 'every', label: 'Every PONS Token', side: 'long' },
  ],
  plates: { left: 'Listing Engine', right: 'Perp Engine', base: 'Robinhood Chain' },
} as const

// PLACEHOLDER figures: product targets for the concept, not live data.
export const stats = [
  { label: 'Listing delay', value: '1 block' },
  { label: 'Max leverage', value: '10x' },
  { label: 'Sides', value: 'Long + Short' },
  { label: 'Settles on', value: 'Robinhood Chain' },
]

export const pledge = {
  kicker: 'A runner and a rug look the same for the first hour.',
  title: 'Trade both sides.',
}

export const statement = {
  // [text, highlighted?] runs, one array per line
  lines: [
    [['Every ', false], ['PONS token', true], [' that lists', false]],
    [['opens a ', false], ['perp market', true], [' with it,', false]],
    [['live on ', false], ['Robinhood Chain.', true]],
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
export const socials = [
  { key: 'x', label: 'Ponsia Perps on X', href: 'https://x.com/PonsiaPerps' },
] as const
