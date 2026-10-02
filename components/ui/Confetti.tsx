// @/components/ui/Confetti.tsx
// A burst of falling pieces for the rare moment worth celebrating — here, a
// certificate being earned. Fires when `trigger` changes to a new truthy
// value, then clears itself.
//
// Ported from the purchasing app, with its BYU palette swapped for this app's.
// Motion runs through the Web Animations API rather than CSS keyframes, so the
// component carries its own animation and needs nothing in globals.css. Pieces
// are built during the render that notices a new trigger, which can only happen
// on the client, so the randomized markup never has a server pass to disagree
// with.
'use client';

import { useEffect, useRef, useState } from 'react';

export interface ConfettiProps {
  /** A new truthy value fires a burst. Passing the same value again does nothing. */
  trigger?: string | number | null;
  count?: number;
  colors?: string[];
  /** Milliseconds until the last piece lands. */
  duration?: number;
}

type Piece = {
  left: number;
  delay: number;
  drift: number;
  spin: number;
  size: number;
  color: string;
};

// indigo-500, emerald-500, amber-400, sky-500, violet-500 — the app's accent
// and semantic colours rather than a brand palette.
const DEFAULT_COLORS = ['#6366f1', '#10b981', '#fbbf24', '#0ea5e9', '#8b5cf6'];

function buildPieces(count: number, colors: string[]): Piece[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    delay: Math.random() * 400,
    drift: (Math.random() - 0.5) * 180,
    spin: 360 + Math.random() * 720,
    size: 6 + Math.random() * 6,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}

export function Confetti({
  trigger,
  count = 70,
  colors = DEFAULT_COLORS,
  duration = 2600,
}: ConfettiProps) {
  const [seen, setSeen] = useState(trigger);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  // Adjusting state during render rather than in an effect: React re-renders
  // before painting, so no burst is ever committed and then replaced.
  if (trigger !== seen) {
    setSeen(trigger);
    // Honors the OS "reduce motion" setting by simply not celebrating.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setPieces(trigger && !reduced ? buildPieces(count, colors) : []);
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root || pieces.length === 0) return;

    const animations = Array.from(root.children).map((el, i) => {
      const piece = pieces[i];
      return el.animate(
        [
          { transform: 'translate3d(0, -10vh, 0) rotate(0deg)', opacity: 1 },
          {
            transform: `translate3d(${piece.drift}px, 105vh, 0) rotate(${piece.spin}deg)`,
            opacity: 0,
          },
        ],
        {
          duration,
          delay: piece.delay,
          easing: 'cubic-bezier(0.25, 0.6, 0.5, 1)',
          fill: 'forwards',
        },
      );
    });

    const clear = setTimeout(() => setPieces([]), duration + 500);
    return () => {
      clearTimeout(clear);
      animations.forEach((a) => a.cancel());
    };
  }, [pieces, duration]);

  if (pieces.length === 0) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {pieces.map((piece, i) => (
        <span
          key={i}
          className="absolute top-0 block rounded-[1px]"
          style={{
            left: `${piece.left}%`,
            width: `${piece.size}px`,
            height: `${piece.size * 1.6}px`,
            backgroundColor: piece.color,
          }}
        />
      ))}
    </div>
  );
}
