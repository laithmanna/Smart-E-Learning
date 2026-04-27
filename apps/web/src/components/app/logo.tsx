import { cn } from '@/lib/utils';

interface Props {
  size?: number;
  className?: string;
}

/**
 * Learnova mark — two soft "blades" crossing, filled with brand gradient,
 * with a small white highlight at the centre to suggest depth.
 */
export function LearnovaMark({ size = 32, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0 drop-shadow-[0_4px_12px_rgba(109,93,246,0.35)]', className)}
      aria-hidden
    >
      <defs>
        <linearGradient
          id="learnova-fill"
          x1="0"
          y1="0"
          x2="40"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#8B7CF6" />
          <stop offset="55%" stopColor="#6D5DF6" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>
        <linearGradient
          id="learnova-edge"
          x1="40"
          y1="0"
          x2="0"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#8B7CF6" />
        </linearGradient>
      </defs>

      {/* Top-left blade */}
      <path
        d="M7 5 Q 12 5 16 9 L 22 18 Q 23 19 22 21 L 16 31 Q 12 35 7 35 Q 4 32 5 28 L 11 20 L 5 12 Q 4 8 7 5 Z"
        fill="url(#learnova-fill)"
      />
      {/* Bottom-right blade — mirrored */}
      <path
        d="M33 35 Q 28 35 24 31 L 18 22 Q 17 21 18 19 L 24 9 Q 28 5 33 5 Q 36 8 35 12 L 29 20 L 35 28 Q 36 32 33 35 Z"
        fill="url(#learnova-edge)"
      />
      {/* Center bead */}
      <circle cx="20" cy="20" r="2" fill="#FFFFFF" />
    </svg>
  );
}
