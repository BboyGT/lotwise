import { cn } from "@/lib/utils";

interface LotwiseLogoProps {
  size?: number;
  className?: string;
}

/**
 * Lotwise brand mark — a rounded-square frame containing a bold "L"
 * lettermark whose horizontal base extends into an upward trend arrow.
 *
 * Design language: distinctive geometric lettermark (not the overused
 * candlestick-in-hexagon trope), amber gradient, soft glow.
 */
export function LotwiseLogo({
  size = 32,
  className,
}: LotwiseLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lw-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1A1410" />
          <stop offset="100%" stopColor="#0A0805" />
        </linearGradient>
        <linearGradient id="lw-l" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE9A8" />
          <stop offset="50%" stopColor="#FFB000" />
          <stop offset="100%" stopColor="#FF7A00" />
        </linearGradient>
        <linearGradient id="lw-arrow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFB000" />
          <stop offset="100%" stopColor="#FFE9A8" />
        </linearGradient>
        <filter id="lw-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Rounded square frame */}
      <rect
        x="6"
        y="6"
        width="108"
        height="108"
        rx="22"
        fill="url(#lw-bg)"
        stroke="url(#lw-l)"
        strokeWidth="2.5"
      />
      {/* Inner border accent */}
      <rect
        x="10"
        y="10"
        width="100"
        height="100"
        rx="18"
        fill="none"
        stroke="url(#lw-l)"
        strokeWidth="0.5"
        strokeOpacity="0.25"
      />

      {/* The "L" lettermark */}
      <g filter="url(#lw-glow)">
        <rect x="34" y="32" width="14" height="52" rx="3" fill="url(#lw-l)" />
        <rect x="36" y="34" width="3" height="48" rx="1.5" fill="#FFFCE8" fillOpacity="0.5" />
        <rect x="34" y="70" width="38" height="14" rx="3" fill="url(#lw-l)" />
        <rect x="36" y="72" width="34" height="3" rx="1.5" fill="#FFFCE8" fillOpacity="0.5" />
      </g>

      {/* Trend arrow extending from the L's base */}
      <g filter="url(#lw-glow)">
        <path
          d="M70 70 L82 70 L82 50 L92 50"
          stroke="url(#lw-arrow)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M85 44 L95 50 L85 56 Z" fill="url(#lw-arrow)" />
      </g>

      <circle cx="95" cy="50" r="1.5" fill="#FFFCE8" filter="url(#lw-glow)" />
    </svg>
  );
}
