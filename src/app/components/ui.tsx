// Small shared building blocks for the dashboard, in the website's visual language:
// ink panels with hairline borders, lime for the long side, coral for the short side.
import { Box, Flex, Text, chakra, type BoxProps } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { changeColor, formatPct } from '@/app/lib/format'
import type { Stage } from '@/app/lib/api/gecko'

export function Panel({ children, ...rest }: BoxProps) {
  return (
    <Box bg="var(--ink-2)" border="0.8px solid var(--line)" borderRadius="12px" {...rest}>
      {children}
    </Box>
  )
}

export function PanelHeader({ title, right }: { title: ReactNode; right?: ReactNode }) {
  return (
    <Flex align="center" justify="space-between" gap="12px" px="20px" py="14px" borderBottom="0.8px solid var(--line)">
      <Text m="0" fontSize="14px" lineHeight="20px" color="var(--accent)">
        {title}
      </Text>
      {right}
    </Flex>
  )
}

export function PageHeader({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <Flex align={{ base: 'flex-start', md: 'flex-end' }} justify="space-between" direction={{ base: 'column', md: 'row' }} gap="16px" mb="28px">
      <Box>
        <Text as="h1" m="0" fontFamily="var(--font-serif)" fontWeight={300} fontSize={{ base: '40px', md: '55px' }} lineHeight={{ base: '44px', md: '55px' }} color="var(--white)" letterSpacing="-0.01em">
          {title}
        </Text>
        {sub && (
          <Text m="0" mt="10px" fontSize="16px" lineHeight="22px" color="var(--white-80)" maxW="640px">
            {sub}
          </Text>
        )}
      </Box>
      {right}
    </Flex>
  )
}

/** Label over value, the stats-band pattern from the website. */
export function Stat({ label, value, sub, valueColor }: { label: ReactNode; value: ReactNode; sub?: ReactNode; valueColor?: string }) {
  return (
    <Box minW="0">
      <Text m="0" fontSize="13px" lineHeight="18px" color="var(--accent)">
        {label}
      </Text>
      <Text m="0" mt="4px" fontSize="22px" lineHeight="28px" color={valueColor ?? 'var(--white)'} className="tabular" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
        {value}
      </Text>
      {sub && (
        <Text m="0" fontSize="12px" lineHeight="16px" color="var(--muted)">
          {sub}
        </Text>
      )}
    </Box>
  )
}

export function Change({ value, fontSize = '14px' }: { value: number | undefined; fontSize?: string }) {
  return (
    <chakra.span color={changeColor(value)} fontSize={fontSize} className="tabular" whiteSpace="nowrap">
      {formatPct(value)}
    </chakra.span>
  )
}

const STAGE_LABEL: Record<Stage, string> = { curve: 'Curve', graduated: 'Graduated', legacy: 'V1', dex: 'DEX' }
export function StageChip({ stage }: { stage: Stage | 'graduating' }) {
  const curve = stage === 'curve' || stage === 'graduating'
  return (
    <chakra.span
      display="inline-flex"
      alignItems="center"
      h="20px"
      px="8px"
      borderRadius="60px"
      fontSize="11px"
      lineHeight="20px"
      whiteSpace="nowrap"
      color={curve ? 'var(--accent)' : 'var(--muted)'}
      border={`0.8px solid ${curve ? 'rgba(210,255,77,0.45)' : 'var(--line)'}`}
    >
      {stage === 'graduating' ? 'Graduating' : STAGE_LABEL[stage]}
    </chakra.span>
  )
}

/** Token image, or a monogram when the token has none. */
export function TokenAvatar({ src, symbol, size = 28 }: { src?: string; symbol: string; size?: number }) {
  if (src)
    return (
      <chakra.img src={src} alt="" w={`${size}px`} h={`${size}px`} borderRadius="50%" objectFit="cover" flexShrink={0} bg="var(--line)" loading="lazy" />
    )
  return (
    <Flex
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="50%"
      bg="var(--line)"
      color="var(--accent)"
      align="center"
      justify="center"
      flexShrink={0}
      fontSize={`${Math.round(size * 0.38)}px`}
      aria-hidden="true"
    >
      {symbol.slice(0, 2).toUpperCase()}
    </Flex>
  )
}

type PillProps = { children: ReactNode; to?: string; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit' }

/** Website pill CTA, filled lime. */
export function PillSolid({ children, to, onClick, disabled, type = 'button' }: PillProps) {
  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    h: '42px',
    px: '24px',
    borderRadius: '60px',
    fontSize: '16px',
    lineHeight: '24px',
    whiteSpace: 'nowrap' as const,
    bg: 'var(--accent)',
    color: 'var(--accent-ink)',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'background 0.3s, color 0.3s, opacity 0.2s',
  }
  if (to) return <chakra.a as={Link} {...{ to }} {...style}>{children}</chakra.a>
  return <chakra.button type={type} onClick={onClick} disabled={disabled} {...style}>{children}</chakra.button>
}

/** Website pill CTA, hairline outline. */
export function PillOutline({ children, to, onClick, disabled, tone = 'accent' }: PillProps & { tone?: 'accent' | 'rug' | 'muted' }) {
  const color = tone === 'rug' ? 'var(--rug)' : tone === 'muted' ? 'var(--white-80)' : 'var(--accent)'
  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    h: '36px',
    px: '18px',
    borderRadius: '60px',
    fontSize: '14px',
    lineHeight: '20px',
    whiteSpace: 'nowrap' as const,
    bg: 'transparent',
    color,
    border: `0.8px solid ${color}`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'background 0.2s',
    _hover: disabled ? undefined : { bg: 'rgba(255,255,255,0.04)' },
  }
  if (to) return <chakra.a as={Link} {...{ to }} {...style}>{children}</chakra.a>
  return <chakra.button type="button" onClick={onClick} disabled={disabled} {...style}>{children}</chakra.button>
}

type TabOption<T> = { value: T; label: ReactNode; /** shown instead of `label` on phones */ short?: ReactNode }

/** Tab strip in the pill idiom. Full width with equal tabs on phones, content width from 768px. */
export function Tabs<T extends string>({ value, options, onChange, label }: { value: T; options: TabOption<T>[]; onChange: (v: T) => void; label: string }) {
  return (
    <Flex role="tablist" aria-label={label} gap="4px" p="4px" border="0.8px solid var(--line)" borderRadius="60px" w={{ base: '100%', md: 'fit-content' }} maxW="100%" overflowX="auto">
      {options.map((o) => {
        const active = o.value === value
        return (
          <chakra.button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            flex={{ base: '1 1 0', md: 'none' }}
            minW="0"
            h="32px"
            px={{ base: '8px', md: '16px' }}
            borderRadius="60px"
            fontSize={{ base: '13px', md: '14px' }}
            whiteSpace="nowrap"
            border="none"
            cursor="pointer"
            bg={active ? 'var(--accent)' : 'transparent'}
            color={active ? 'var(--accent-ink)' : 'var(--white-80)'}
            transition="background 0.2s, color 0.2s"
          >
            {o.short ? (
              <>
                <chakra.span display={{ base: 'inline', md: 'none' }}>{o.short}</chakra.span>
                <chakra.span display={{ base: 'none', md: 'inline' }}>{o.label}</chakra.span>
              </>
            ) : (
              o.label
            )}
          </chakra.button>
        )
      })}
    </Flex>
  )
}

export function EmptyState({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <Flex direction="column" align="center" textAlign="center" gap="12px" py="56px" px="20px">
      <Text m="0" fontFamily="var(--font-serif)" fontWeight={300} fontSize="30px" lineHeight="34px" color="var(--white)">
        {title}
      </Text>
      {children && (
        <Text m="0" fontSize="15px" lineHeight="22px" color="var(--white-80)" maxW="520px">
          {children}
        </Text>
      )}
      {action && <Box mt="8px">{action}</Box>}
    </Flex>
  )
}

export function Skeleton({ h = '16px', w = '100%' }: { h?: string; w?: string }) {
  return <Box className="skeleton" h={h} w={w} borderRadius="6px" />
}

/** Notice box for configuration or engine state. */
export function Notice({ tone = 'info', title, children }: { tone?: 'info' | 'warn'; title: ReactNode; children?: ReactNode }) {
  return (
    <Box border={`0.8px solid ${tone === 'warn' ? 'rgba(255,106,85,0.55)' : 'rgba(210,255,77,0.4)'}`} bg={tone === 'warn' ? 'rgba(255,106,85,0.06)' : 'rgba(210,255,77,0.05)'} borderRadius="12px" px="16px" py="12px">
      <Text m="0" fontSize="14px" lineHeight="20px" color={tone === 'warn' ? 'var(--rug)' : 'var(--accent)'}>
        {title}
      </Text>
      {children && (
        <Text m="0" mt="4px" fontSize="13px" lineHeight="19px" color="var(--white-80)">
          {children}
        </Text>
      )}
    </Box>
  )
}
