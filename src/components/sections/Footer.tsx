import { Box, Flex, Text, chakra } from '@chakra-ui/react'
import { Mark } from '@/components/ui/Brand'
import { socialIcons } from '@/components/ui/SocialIcons'
import { footer, socials } from '@/data/content'

const linkProps = { fontSize: '12px', lineHeight: '18px', color: 'var(--white)', transition: 'color 0.2s ease-in-out', _hover: { color: 'var(--accent)' } }

export function Footer() {
  return (
    <Box as="footer" bg="var(--ink)" px={{ base: '16px', md: '24px' }} pt="37px" pb="37px">
      <Box maxW="var(--container)" mx="auto">
        <Flex justify={{ base: 'center', md: 'flex-end' }} gap="16px" align="center">
          <Flex gap="24px" align="center">
            {socials.map((s) => (
              <chakra.a key={s.key} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} display="flex" alignItems="center" h="28px">
                {socialIcons[s.key]}
              </chakra.a>
            ))}
          </Flex>
        </Flex>
        <Flex mt="37px" minH="62px" align="center" direction={{ base: 'column', md: 'row' }} gap={{ base: '20px', md: '24px' }}>
          <Flex flex="1" gap={{ base: '24px', lg: '100px' }} align="center" justify={{ base: 'center', md: 'flex-start' }} wrap="wrap">
            <Text m="0" fontSize="12px" lineHeight="18px" color="var(--white)">
              {footer.year}
            </Text>
            {footer.left.map((l) => (
              <chakra.a key={l.label} href={l.href} {...linkProps}>
                {l.label}
              </chakra.a>
            ))}
          </Flex>
          <Mark size={62} animate />
          <Flex flex="1" gap={{ base: '24px', lg: '100px' }} align="center" justify={{ base: 'center', md: 'flex-end' }} wrap="wrap" textAlign={{ base: 'center', md: 'right' }}>
            {footer.right.map((l) => (
              <chakra.a key={l.label} href={l.href} {...linkProps}>
                {l.label}
              </chakra.a>
            ))}
          </Flex>
        </Flex>
      </Box>
    </Box>
  )
}
