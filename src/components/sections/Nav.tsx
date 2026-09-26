import { Box, Flex, chakra } from '@chakra-ui/react'
import { Link } from 'react-router'
import { Lockup } from '@/components/ui/Brand'
import { PillButton } from '@/components/ui/PillButton'
import { nav } from '@/data/content'

/** Fixed white pill, 1200 x 56 at top 20. */
export function Nav() {
  return (
    <Box as="header" position="fixed" top="20px" left="0" right="0" zIndex={20} px={{ base: '16px', md: '24px' }}>
      <Flex
        as="nav"
        aria-label="Main"
        maxW="var(--container)"
        h="var(--nav-h)"
        mx="auto"
        align="center"
        justify="space-between"
        bg="var(--white)"
        borderRadius="37px"
        p="8px 8px 8px 16px"
      >
        <chakra.a as={Link} {...{ to: '/' }} display="flex" alignItems="center" aria-label="Pontis home" color="var(--ink)">
          <Lockup height={28} />
        </chakra.a>
        <Flex align="center" gap="40px">
          {nav.links.map((l) => (
            <chakra.a
              key={l.label}
              {...(l.href.startsWith('/') ? { as: Link, to: l.href } : { href: l.href })}
              display={{ base: 'none', md: 'block' }}
              color="var(--ink)"
              fontSize="16px"
              lineHeight="24px"
            >
              {l.label}
            </chakra.a>
          ))}
          <PillButton href={nav.cta.href}>{nav.cta.label}</PillButton>
        </Flex>
      </Flex>
    </Box>
  )
}
