import * as React from "react";
import { cn } from "@/lib/utils";

interface LotwiseLogoProps {
  size?: number;
  className?: string;
}

/**
 * Lotwise brand mark — a rounded-square frame containing a bold "L"
 * lettermark whose horizontal base extends into an upward trend arrow.
 *
 * Uses React.useId() to generate unique gradient/filter IDs per instance
 * so multiple logos on the same page don't clash.
 */
export function LotwiseLogo({
  size = 32,
  className,
}: LotwiseLogoProps) {
  const reactId = React.useId().replace(/:/g, "");
  const bgId = `lw-bg-${reactId}`;
  const lId = `lw-l-${reactId}`;
  const arrowId = `lw-arrow-${reactId}`;
  const glowId = `lw-glow-${reactId}`;

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
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1A1410" />
          <stop offset="100%" stopColor="#0A0805" />
        </linearGradient>
        <linearGradient id={lId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE9A8" />
          <stop offset="50%" stopColor="#FFB000" />
          <stop offset="100%" stopColor="#FF7A00" />
        </linearGradient>
        <linearGradient id={arrowId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFB000" />
          <stop offset="100%" stopColor="#FFE9A8" />
        </linearGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
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
        fill={`url(#${bgId})`}
        stroke={`url(#${lId})`}
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
        stroke={`url(#${lId})`}
        strokeWidth="0.5"
        strokeOpacity="0.25"
      />

      {/* The "L" lettermark */}
      <g filter={`url(#${glowId})`}>
        <rect x="34" y="32" width="14" height="52" rx="3" fill={`url(#${lId})`} />
        <rect x="36" y="34" width="3" height="48" rx="1.5" fill="#FFFCE8" fillOpacity="0.5" />
        <rect x="34" y="70" width="38" height="14" rx="3" fill={`url(#${lId})`} />
        <rect x="36" y="72" width="34" height="3" rx="1.5" fill="#FFFCE8" fillOpacity="0.5" />
      </g>

      {/* Trend arrow extending from the L's base */}
      <g filter={`url(#${glowId})`}>
        <path
          d="M70 70 L82 70 L82 50 L92 50"
          stroke={`url(#${arrowId})`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M85 44 L95 50 L85 56 Z" fill={`url(#${arrowId})`} />
      </g>

      <circle cx="95" cy="50" r="1.5" fill="#FFFCE8" filter={`url(#${glowId})`} />
    </svg>
  );
}
