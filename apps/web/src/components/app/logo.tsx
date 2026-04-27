import { cn } from '@/lib/utils';

interface Props {
  size?: number;
  className?: string;
}

/** Learnova mark — two crossing strokes filled with the brand gradient. */
export function LearnovaMark({ size = 32, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="learnova-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6D5DF6" />
          <stop offset="100%" stopColor="#60A5FA" />
        </linearGradient>
      </defs>
      <path
        d="M5 4l11 12L5 28h6l8-9 3 4-4 5h7L16 16 27 4h-6l-8 9-3-4 4-5z"
        fill="url(#learnova-gradient)"
      />
    </svg>
  );
}
