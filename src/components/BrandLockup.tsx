import React, { useState } from 'react';

export const BrandLockup: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  return (
    <div className="inline-flex items-center gap-3 select-none">
      <svg
        width={compact ? 36 : 54}
        height={compact ? 36 : 54}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0 drop-shadow-md"
      >
        <rect x="4" y="4" width="56" height="56" rx="12" fill="#1E293B" stroke="#F59E0B" strokeWidth="3" />
        <rect x="14" y="14" width="36" height="36" rx="4" fill="#9A4E1C" />
        <rect x="19" y="19" width="26" height="26" rx="2" fill="#D9823B" />
        <path d="M21 21L43 43" stroke="#9A4E1C" strokeWidth="4" strokeLinecap="round" />
        <path d="M43 21L21 43" stroke="#9A4E1C" strokeWidth="4" strokeLinecap="round" />
        <circle cx="32" cy="32" r="7" fill="#10B981" stroke="#ECFDF5" strokeWidth="2.5" />
      </svg>
      <div className="flex flex-col">
        <span
          className={`font-display font-extrabold tracking-tight text-white leading-none ${
            compact ? 'text-xl' : 'text-4xl sm:text-5xl'
          }`}
        >
          BOX<span className="text-amber-400">BOUND</span>
        </span>
        {!compact && (
          <span className="text-xs font-semibold text-amber-200/90 tracking-wide mt-1">
            Built by DARR STUDIOS · 50 Puzzle Chambers
          </span>
        )}
      </div>
    </div>
  );
};

export const StudioCredit: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`font-display font-bold tracking-wider text-amber-300 ${className}`}>
    DARR STUDIOS
  </span>
);

export const KeeperAvatar: React.FC<{ size?: number }> = ({ size = 44 }) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-lg bg-gradient-to-br from-blue-600 to-amber-600 flex items-center justify-center text-white font-display font-bold border border-white/20 shrink-0"
        aria-label="Keeper avatar"
      >
        K
      </div>
    );
  }

  return (
    <img
      src="/src/assets/images/boxbound_keeper_emblem_1795023874277.jpg"
      alt="BOXBOUND Warehouse Keeper"
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className="rounded-lg object-cover border border-amber-400/50 shadow-sm shrink-0"
    />
  );
};
