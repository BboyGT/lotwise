import { cn } from "@/lib/utils";

interface PipForgeLogoProps {
  size?: number;
  className?: string;
  withSpark?: boolean;
}

/**
 * PipForge brand mark — a hexagon containing a bullish + bearish candlestick
 * pair with a central "forge" spark. Uses inline SVG so Tailwind sizing works.
 */
export function PipForgeLogo({
  size = 32,
  className,
  withSpark = true,
}: PipForgeLogoProps) {
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
        <linearGradient id="pf-hex" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFD56B" />
          <stop offset="50%" stopColor="#FFB000" />
          <stop offset="100%" stopColor="#FF7A00" />
        </linearGradient>
        <linearGradient id="pf-candle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD56B" />
          <stop offset="100%" stopColor="#FF8800" />
        </linearGradient>
        <filter id="pf-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer hexagon */}
      <path
        d="M60 6 L105 32 L105 88 L60 114 L15 88 L15 32 Z"
        fill="none"
        stroke="url(#pf-hex)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Inner hexagon glow accent */}
      <path
        d="M60 14 L98 36 L98 84 L60 106 L22 84 L22 36 Z"
        fill="url(#pf-hex)"
        fillOpacity="0.08"
        stroke="url(#pf-hex)"
        strokeWidth="1"
        strokeOpacity="0.3"
      />

      {/* Bullish candlestick (left, taller) */}
      <g filter="url(#pf-glow)">
        <line
          x1="42"
          y1="34"
          x2="42"
          y2="86"
          stroke="url(#pf-candle)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <rect x="34" y="48" width="16" height="26" rx="2" fill="url(#pf-candle)" />
        <rect x="36" y="50" width="3" height="22" rx="1" fill="#FFE9A8" fillOpacity="0.6" />
      </g>

      {/* Bearish candlestick (right, shorter, inverted color) */}
      <g filter="url(#pf-glow)" opacity="0.85">
        <line
          x1="78"
          y1="40"
          x2="78"
          y2="84"
          stroke="#FF6B6B"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <rect x="70" y="52" width="16" height="22" rx="2" fill="#FF6B6B" />
        <rect x="72" y="54" width="3" height="18" rx="1" fill="#FFB8B8" fillOpacity="0.5" />
      </g>

      {/* Center forge spark */}
      {withSpark && (
        <>
          <circle cx="60" cy="60" r="3" fill="#FFD56B" filter="url(#pf-glow)" />
          <circle cx="60" cy="60" r="1.5" fill="#FFFCE8" />
        </>
      )}
    </svg>
  );
}
