// @/components/ui/Spinner.tsx
// Ported from the purchasing app. Decorative (aria-hidden) by default; pass
// `label` to make it a standalone role=status indicator.

type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  /** Extra classes appended after the size class, useful for color overrides. */
  className?: string;
  /** When provided, renders as a standalone status indicator with this aria-label. */
  label?: string;
}

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

export function Spinner({ size = 'md', className = '', label }: SpinnerProps) {
  const a11yProps = label
    ? { role: 'status' as const, 'aria-label': label }
    : { 'aria-hidden': true as const };

  return (
    <svg
      className={`animate-spin ${SIZE_CLASSES[size]} ${className}`.trim()}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      {...a11yProps}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
