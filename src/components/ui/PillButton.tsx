import { chakra } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

type Props = { href: string; children: ReactNode; variant?: 'solid' | 'outline' }

/** Pill CTA: 16/24 Inter, 9px 24px, radius 60. Outline keeps height with a 0.8px border and 8px padding. */
export function PillButton({ href, children, variant = 'solid' }: Props) {
  const solid = variant === 'solid'
  return (
    <chakra.a
      // internal routes go through the router (no reload); anything else is a plain link
      {...(href.startsWith('/') ? { as: Link, to: href } : { href })}
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      h="42px"
      px="24px"
      py={solid ? '9px' : '8px'}
      borderRadius="60px"
      fontSize="16px"
      lineHeight="24px"
      whiteSpace="nowrap"
      bg={solid ? 'var(--accent)' : 'transparent'}
      color={solid ? 'var(--accent-ink)' : 'var(--accent)'}
      border={solid ? 'none' : '0.8px solid var(--accent)'}
      transition="background 0.3s, color 0.3s"
      cursor="pointer"
    >
      {children}
    </chakra.a>
  )
}
