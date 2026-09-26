import { Box } from '@chakra-ui/react'
import { WORDMARK_WIDE } from '@/brand/generated'
import { Mark } from '@/components/ui/Brand'

/** Giant outlined wordmark whose descender sits on the footer edge, with the animated mark top right. */
export function BigWordmark() {
  const [x, y, w, h] = WORDMARK_WIDE.box
  return (
    <Box as="section" position="relative" bg="var(--paper-3)" h={{ base: '240px', md: '360px', lg: '459px' }} overflow="hidden" px={{ base: '16px', md: '24px' }} aria-label="Pontis">
      <Box position="relative" maxW="var(--container)" h="100%" mx="auto">
        <Box position="absolute" left="0" bottom="0" w={{ base: '82%', lg: '1060px' }} color="var(--ink)">
          <svg viewBox={`${x} ${y} ${w} ${h}`} width="100%" style={{ display: 'block' }} role="img" aria-label="Pontis">
            <path d={WORDMARK_WIDE.d} fill="currentColor" />
          </svg>
        </Box>
        <Box position="absolute" right={{ base: '0', lg: '-40px' }} top={{ base: '40px', md: '110px', lg: '180px' }} w={{ base: '64px', md: '100px', lg: '140px' }} color="var(--ink)">
          <Mark size={140} tone="mono" color="currentColor" animate className="big-mark" />
        </Box>
      </Box>
    </Box>
  )
}
