import React from 'react';

interface StudioFooterProps {
  variant?: 'menu' | 'panel';
  rightSlot?: React.ReactNode;
}

export const StudioFooter: React.FC<StudioFooterProps> = ({
  variant = 'menu',
  rightSlot,
}) => {
  return (
    <footer
      aria-label="Developer Studio Attribution"
      className={`w-full flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-2.5 rounded-xl border ${
        variant === 'menu'
          ? 'bg-slate-950/85 border-amber-400/35 shadow-lg'
          : 'bg-slate-900/90 border-slate-700/90'
      }`}
    >
      <div className="flex items-center gap-3">
        <svg
          width="28"
          height="28"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="shrink-0"
        >
          <rect x="2" y="2" width="28" height="28" rx="6" fill="#1E293B" stroke="#F59E0B" strokeWidth="2" />
          <path d="M9 9H16C20.4183 9 23 11.5817 23 16C23 20.4183 20.4183 23 16 23H9V9Z" stroke="#FBBF24" strokeWidth="2.5" />
          <rect x="12.5" y="13.5" width="5" height="5" rx="1" fill="#10B981" />
        </svg>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2.5">
          <span className="font-display font-extrabold tracking-wider text-sm text-amber-300 leading-none">
            DARR STUDIOS
          </span>
          <span className="hidden sm:inline text-slate-600" aria-hidden="true">
            ·
          </span>
          <span className="text-xs text-slate-300 leading-tight">
            Developed &amp; Published by DARR STUDIOS
          </span>
        </div>
      </div>

      {rightSlot && (
        <div className="text-xs text-slate-400">
          {rightSlot}
        </div>
      )}
    </footer>
  );
};
