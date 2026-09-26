import { Box, Flex, Text } from '@chakra-ui/react'
import { PillButton } from '@/components/ui/PillButton'
import { statement } from '@/data/content'

/** Price-wick rules rising from the bottom edge, each topped with a small node (a candle's high). */
function Wicks() {
  const wicks = [
    { x: 9, top: 44 },
    { x: 17.5, top: 70 },
    { x: 83, top: 58 },
    { x: 91.5, top: 30 },
  ]
  return (
    <Box position="absolute" inset="0" aria-hidden="true" pointerEvents="none">
      {wicks.map((w) => (
        <Box key={w.x} position="absolute" left={`${w.x}%`} top={`${w.top}%`} bottom="0" w="1px" bg="var(--contour)" opacity={0.7}>
          <Box position="absolute" top="-3px" left="-3px" w="7px" h="7px" borderRadius="50%" border="1px solid var(--contour)" bg="var(--paper-2)" />
        </Box>
      ))}
    </Box>
  )
}

export function Statement() {
  return (
    <Box as="section" position="relative" bg="var(--paper-2)" borderTop="1px solid rgba(14,21,16,0.08)" py={{ base: '100px', md: '160px' }} px="16px" overflow="hidden">
      <Wicks />
      <Flex position="relative" direction="column" align="center" textAlign="center">
        <Text
          as="h2"
          m="0"
          fontFamily="var(--font-serif)"
          fontWeight={300}
          fontSize={{ base: '34px', md: '48px', lg: '60px' }}
          lineHeight={{ base: '38px', md: '52px', lg: '60px' }}
          letterSpacing="-0.03em"
          color="var(--muted)"
        >
          {statement.lines.map((line, i) => (
            <span key={i}>
              {line.map(([t, hi], j) =>
                hi ? (
                  <Box as="span" key={j} color="var(--ink)">
                    {t}
                  </Box>
                ) : (
                  <span key={j}>{t}</span>
                ),
              )}
              {i < statement.lines.length - 1 && <br />}
            </span>
          ))}
        </Text>
        <Flex mt="30px" pt="32px" gap="32px">
          <PillButton href={statement.primary.href}>{statement.primary.label}</PillButton>
          <PillButton href={statement.secondary.href}>{statement.secondary.label}</PillButton>
        </Flex>
      </Flex>
    </Box>
  )
}
