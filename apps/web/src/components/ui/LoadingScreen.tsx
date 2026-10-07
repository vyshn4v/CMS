import React from 'react';
import { cn } from '../../lib/utils';

export interface LoadingScreenProps {
  /** Short label rendered below the pixel box. */
  label?: string;
  /** When true, fills the entire viewport (used in AuthGuard). Defaults to false. */
  fullscreen?: boolean;
  className?: string;
}

/** 5 × 5 pixel grid — cell indices 0-24. */
const GRID_SIZE = 5;
const CELLS = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i);

/**
 * LoadingScreen
 *
 * Plain background, centered card, animated pixel-grid inside.
 * The wave delay is derived from (col + row) so pixels light up
 * diagonally across the box.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  label,
  fullscreen = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-slate-50 dark:bg-slate-950',
        fullscreen ? 'fixed inset-0 z-50' : 'w-full h-full min-h-[240px]',
        className,
      )}
    >
      <div className="flex flex-col items-center gap-5">
        {/* ── Pixel box ── */}
        <div
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
          >
            {CELLS.map((idx) => {
              const col = idx % GRID_SIZE;
              const row = Math.floor(idx / GRID_SIZE);
              // Diagonal wave: delay = (col + row) * 80ms, period = 1.2s
              const delay = `${(col + row) * 80}ms`;

              return (
                <span
                  key={idx}
                  className="pixel-cell"
                  style={
                    { '--pixel-delay': delay } as React.CSSProperties
                  }
                />
              );
            })}

        {/* ── Label ── */}
        {label && (
          <p className="text-xs font-medium text-slate-400 tracking-wide select-none">
            {label}
          </p>
        )}
      </div>
    </div>
  );
};
