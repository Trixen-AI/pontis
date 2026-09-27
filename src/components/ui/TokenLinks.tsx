import { chakra } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { androidApp, token } from '@/data/content'

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // older browsers / insecure context: fall back to a hidden textarea
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand('copy')
    el.remove()
    return ok
  }
}

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" />
    <path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" />
  </svg>
)
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)
const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4v11M7 10.5l5 5 5-5" />
    <path d="M4.5 16.5v1.5A2 2 0 0 0 6.5 20h11a2 2 0 0 0 2-2v-1.5" />
  </svg>
)

/** Contract address chip: address links to the explorer, button copies it. */
export function CaChip() {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(t)
  }, [copied])

  return (
    <chakra.div
      display="inline-flex"
      alignItems="center"
      gap="8px"
      h="40px"
      pl="14px"
      pr="5px"
      maxW="100%"
      borderRadius="60px"
      border="0.8px solid rgba(255,255,255,0.22)"
      bg="rgba(14,21,16,0.6)"
      backdropFilter="blur(6px)"
    >
      <chakra.span fontSize="12px" color="var(--accent)" flexShrink={0}>
        CA
      </chakra.span>
      <chakra.a
        href={token.explorer}
        target="_blank"
        rel="noopener noreferrer"
        title={`${token.symbol} on Robinhood Chain explorer`}
        fontSize="13px"
        color="var(--white)"
        className="tabular"
        minW="0"
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
      >
        <chakra.span display={{ base: 'inline', md: 'none' }}>{short(token.address)}</chakra.span>
        <chakra.span display={{ base: 'none', md: 'inline' }}>{token.address}</chakra.span>
      </chakra.a>
      <chakra.button
        type="button"
        onClick={async () => setCopied(await copyText(token.address))}
        aria-label={copied ? 'Contract address copied' : `Copy ${token.symbol} contract address`}
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        gap="6px"
        h="30px"
        px="10px"
        flexShrink={0}
        borderRadius="60px"
        border="none"
        cursor="pointer"
        fontSize="12px"
        bg={copied ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}
        color={copied ? 'var(--accent-ink)' : 'var(--white)'}
        transition="background 0.2s, color 0.2s"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
        <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
      </chakra.button>
    </chakra.div>
  )
}

/** Direct download of the Android app. */
export function ApkLink() {
  return (
    <chakra.a
      href={androidApp.href}
      download={androidApp.fileName}
      display="inline-flex"
      alignItems="center"
      gap="8px"
      h="40px"
      px="18px"
      borderRadius="60px"
      border="0.8px solid var(--accent)"
      color="var(--accent)"
      bg="rgba(14,21,16,0.6)"
      backdropFilter="blur(6px)"
      fontSize="14px"
      whiteSpace="nowrap"
      transition="background 0.2s"
      _hover={{ bg: 'rgba(210,255,77,0.1)' }}
    >
      <DownloadIcon />
      Android app
      <chakra.span fontSize="12px" color="var(--white-80)">
        APK · {androidApp.size}
      </chakra.span>
    </chakra.a>
  )
}
