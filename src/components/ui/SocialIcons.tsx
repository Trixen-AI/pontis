// Official platform marks, inlined from the files stored byte-for-byte in src/assets/social/.
// Source:
//   X: https://abs.twimg.com/responsive-web/client-web/icon-svg.ea5ff4aa.svg (served by X; black file,
//      shown in white here to match X's light-on-dark kit variant; swap for the brand-kit white file when available)
import type { ReactElement } from 'react'

const X = (
  <svg viewBox="24 28 80 72" width="28" height="25" aria-hidden="true">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M86.8918 28.25H99.0219L72.5243 58.5334L103.698 99.75H79.285L60.1647 74.7536L38.2929 99.75H26.1627L54.5069 67.3565L24.5938 28.25H49.6199L66.9004 51.0974L86.8918 28.25ZM82.6337 92.4904H89.3555L45.9716 35.1301H38.7584L82.6337 92.4904Z"
      fill="#fff"
    />
  </svg>
)

export const socialIcons: Record<'x', ReactElement> = {
  x: X,
}
