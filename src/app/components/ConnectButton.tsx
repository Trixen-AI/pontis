import { Popover, PopoverArrow, PopoverBody, PopoverContent, PopoverTrigger, Text, chakra } from '@chakra-ui/react'
import { useEthBalance, useWalletState } from '@/app/hooks/useWallet'
import { formatEth, shortAddress } from '@/app/lib/format'
import { openWallet, walletReady } from '@/app/web3/wagmi'

const pill = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  flexShrink: 0,
  h: { base: '40px', md: '42px' },
  px: { base: '16px', md: '20px' },
  borderRadius: '60px',
  fontSize: { base: '15px', md: '16px' },
  lineHeight: '24px',
  whiteSpace: 'nowrap' as const,
  border: 'none',
  cursor: 'pointer',
  transition: 'background 0.3s, color 0.3s',
}

/** Wallet button for the app nav. Without a Reown project ID it explains the setup instead. */
export function ConnectButton() {
  return walletReady ? <AppKitConnect /> : <SetupNeeded />
}

function AppKitConnect() {
  const { address, isConnected, connecting, wrongNetwork } = useWalletState()
  const { eth } = useEthBalance(address)

  if (!isConnected || !address)
    return (
      <chakra.button type="button" onClick={() => openWallet()} bg="var(--accent)" color="var(--accent-ink)" {...pill}>
        {connecting ? 'Connecting…' : <ConnectLabel />}
      </chakra.button>
    )
  return (
    <chakra.button
      type="button"
      onClick={() => openWallet(wrongNetwork ? 'Networks' : 'Account')}
      bg={wrongNetwork ? 'var(--rug)' : 'var(--ink)'}
      color="var(--white)"
      aria-label={`Wallet ${address}`}
      {...pill}
    >
      {!wrongNetwork && (
        <chakra.span className="tabular" color="var(--accent)" display={{ base: 'none', sm: 'inline' }}>
          {formatEth(eth, 3)}
        </chakra.span>
      )}
      <span>{wrongNetwork ? 'Wrong network' : shortAddress(address)}</span>
    </chakra.button>
  )
}

/** "Connect" on phones, "Connect wallet" from 480px up. */
function ConnectLabel() {
  return (
    <span>
      Connect<chakra.span display={{ base: 'none', sm: 'inline' }}> wallet</chakra.span>
    </span>
  )
}

function SetupNeeded() {
  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <chakra.button type="button" bg="var(--accent)" color="var(--accent-ink)" {...pill}>
          <ConnectLabel />
        </chakra.button>
      </PopoverTrigger>
      <PopoverContent bg="var(--ink-2)" borderColor="var(--line)" color="var(--white-92)" w="300px">
        <PopoverArrow bg="var(--ink-2)" />
        <PopoverBody p="16px">
          <Text m="0" fontSize="14px" lineHeight="20px" color="var(--accent)">
            Wallet connection is not configured
          </Text>
          <Text m="0" mt="6px" fontSize="13px" lineHeight="19px" color="var(--white-80)">
            Add your Reown project ID to <chakra.code color="var(--white)">.env</chakra.code> as{' '}
            <chakra.code color="var(--white)">VITE_REOWN_PROJECT_ID</chakra.code>, then restart the dev server. Markets and listings work without it.
          </Text>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}
