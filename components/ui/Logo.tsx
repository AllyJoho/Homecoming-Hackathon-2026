// @/components/ui/Logo.tsx
// The app mark: a rounded indigo tile holding three stacked bars that narrow as
// they go up — the stack in SkillStack, skills piled on a foundation.
//
// The bars deliberately differ in width. Three *equal* horizontal bars are the
// hamburger-menu glyph, and a favicon that reads as a menu button at 16px is a
// worse mark than no mark. Tapering them also gives the stack a direction.
//
// Kept as inline SVG rather than an <Image>: it is a few dozen bytes of
// geometry, it inherits the indigo token in both schemes, and it never flashes
// in. The same geometry is duplicated once, in @/app/icon.svg, for the browser
// tab — that file can't import from here, so if you change the bars change both.

export interface LogoProps {
  /** Tailwind size classes. Defaults to the 24px header size. */
  className?: string;
}

export function Logo({ className = 'h-6 w-6' }: LogoProps) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={`shrink-0 ${className}`.trim()}>
      <rect width="32" height="32" rx="8" className="fill-indigo-600 dark:fill-indigo-500" />
      {/* Centred on x=16, spanning y=6..26. The bars are deliberately heavy for
          their tile: at a 16px favicon each one is barely two device pixels, and
          a thinner stack greys out into an indistinct smudge. */}
      <g className="fill-white">
        <rect x="10.5" y="6" width="11" height="5" rx="2.5" />
        <rect x="8" y="13.5" width="16" height="5" rx="2.5" />
        <rect x="5.5" y="21" width="21" height="5" rx="2.5" />
      </g>
    </svg>
  );
}
