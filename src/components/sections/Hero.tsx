import { Box, Flex, Heading, Text } from '@chakra-ui/react'
import { Mark } from '@/components/ui/Brand'
import { PillButton } from '@/components/ui/PillButton'
import { hero } from '@/data/content'
import { HeroField } from './HeroField'

/** 100vh, looping field behind; content block (mark 100, title 2x90, body, CTAs) centred. */
export function Hero() {
  return (
    <Box as="section" position="relative" h="100vh" minH="560px" overflow="hidden" bg="var(--ink)">
      <HeroField />
      <Flex position="absolute" inset="0" p="20px" align="center" justify="center">
        <Flex direction="column" align="center" textAlign="center" maxW="var(--container)" w="100%">
          <Mark size={100} animate title="Ponsia Perps" />
          <Heading
            as="h1"
            m="0"
            fontFamily="var(--font-serif)"
            fontWeight={300}
            fontSize={{ base: '48px', md: '72px', lg: '90px' }}
            lineHeight={{ base: '52px', md: '74px', lg: '90px' }}
            letterSpacing="-0.01em"
            color="var(--white)"
          >
            {hero.title[0]}
            <br />
            {hero.title[1]}
          </Heading>
          <Text m="0" pt="32px" fontSize="16px" lineHeight="20.8px" color="var(--white-80)" maxW="560px">
            {hero.body[0]}
            <br />
            {hero.body[1]}
          </Text>
          <Flex pt="32px" gap="32px">
            <PillButton href={hero.primary.href}>{hero.primary.label}</PillButton>
            <PillButton href={hero.secondary.href} variant="outline">
              {hero.secondary.label}
            </PillButton>
          </Flex>
        </Flex>
      </Flex>
    </Box>
  )
}
