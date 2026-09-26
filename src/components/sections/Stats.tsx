import { Box, Flex, Text } from '@chakra-ui/react'
import { Fragment } from 'react'
import { stats } from '@/data/content'

/** Bordered band of four figures with 1px dividers. */
export function Stats() {
  return (
    <Box as="section" id="stats" bg="var(--ink-2)" pt="60px" pb={{ base: '80px', md: '150px' }} px={{ base: '16px', md: '24px' }} aria-label="Key figures">
      <Flex
        maxW="var(--container)"
        mx="auto"
        border="0.8px solid var(--line)"
        borderRadius="12px"
        p={{ base: '28px 16px', md: '40px 20px' }}
        justify="space-around"
        align="center"
        wrap={{ base: 'wrap', md: 'nowrap' }}
        rowGap="28px"
      >
        {stats.map((s, i) => (
          <Fragment key={s.label}>
            {i > 0 && <Box display={{ base: 'none', md: 'block' }} w="1px" h="90px" bg="var(--line)" flexShrink={0} />}
            <Box textAlign="center" flex={{ base: '1 0 45%', md: '0 1 auto' }} px="8px">
              <Text m="0" fontSize={{ base: '16px', md: '20px' }} lineHeight="30px" color="var(--accent)">
                {s.label}
              </Text>
              <Text m="0" fontSize={{ base: '24px', md: '28px', lg: '35px' }} lineHeight={{ base: '28px', lg: '35px' }} color="var(--white)" whiteSpace="nowrap">
                {s.value}
              </Text>
            </Box>
          </Fragment>
        ))}
      </Flex>
    </Box>
  )
}
