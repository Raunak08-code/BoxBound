import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import { Direction } from '../engine/types.ts';

interface DirectionalControlsProps {
  layout: 'split' | 'compact';
  disabled?: boolean;
  onMove: (direction: Direction) => void;
}

interface HoldButtonProps {
  direction: Direction;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onTrigger: (dir: Direction) => void;
}

const HoldDirectionButton: React.FC<HoldButtonProps> = ({
  direction,
  label,
  icon,
  disabled,
  onTrigger,
}) => {
  const [pressed, setPressed] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const activePointerId = useRef<number | null>(null);

  const clearTimers = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    if (activePointerId.current !== null) return;
    activePointerId.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic events
    }

    setPressed(true);
    onTrigger(direction);

    clearTimers();
    timeoutRef.current = window.setTimeout(() => {
      intervalRef.current = window.setInterval(() => {
        onTrigger(direction);
      }, 145);
    }, 185);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (activePointerId.current !== e.pointerId && activePointerId.current !== null) {
      return;
    }
    activePointerId.current = null;
    setPressed(false);
    clearTimers();
  };

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
      onContextMenu={(e) => e.preventDefault()}
      style={{ touchAction: 'none' }}
      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center border transition-transform duration-100 select-none focus-visible:outline-2 focus-visible:outline-amber-400 ${
        pressed
          ? 'translate-y-0.5 scale-95 bg-amber-400 text-slate-950 border-amber-300 shadow-inner'
          : 'bg-slate-800/90 hover:bg-slate-700/95 text-slate-100 border-slate-600/80 shadow-lg'
      } ${disabled ? 'opacity-40 pointer-events-none' : 'cursor-pointer'}`}
    >
      {icon}
    </button>
  );
};

export const DirectionalControls: React.FC<DirectionalControlsProps> = ({
  layout,
  disabled = false,
  onMove,
}) => {
  if (layout === 'compact') {
    return (
      <div
        className="pointer-events-none fixed inset-x-0 bottom-3 z-20 flex justify-end px-4 sm:px-6"
        style={{ touchAction: 'none' }}
      >
        <div className="pointer-events-auto grid grid-cols-3 gap-1.5 bg-slate-900/75 p-2 rounded-2xl border border-slate-700/70 shadow-xl">
          <div />
          <HoldDirectionButton
            direction="U"
            label="Move Up"
            icon={<ArrowUp className="w-7 h-7" />}
            disabled={disabled}
            onTrigger={onMove}
          />
          <div />
          <HoldDirectionButton
            direction="L"
            label="Move Left"
            icon={<ArrowLeft className="w-7 h-7" />}
            disabled={disabled}
            onTrigger={onMove}
          />
          <HoldDirectionButton
            direction="D"
            label="Move Down"
            icon={<ArrowDown className="w-7 h-7" />}
            disabled={disabled}
            onTrigger={onMove}
          />
          <HoldDirectionButton
            direction="R"
            label="Move Right"
            icon={<ArrowRight className="w-7 h-7" />}
            disabled={disabled}
            onTrigger={onMove}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-3 sm:bottom-5 z-20 flex items-end justify-between px-4 sm:px-8"
      style={{ touchAction: 'none' }}
    >
      {/* LEFT CONTROL GROUP: Left and Right */}
      <div
        className="pointer-events-auto flex items-center gap-2.5 bg-slate-900/70 p-2 rounded-2xl border border-slate-700/70 shadow-xl"
        aria-label="Horizontal movement controls"
      >
        <HoldDirectionButton
          direction="L"
          label="Move Left"
          icon={<ArrowLeft className="w-7 h-7" />}
          disabled={disabled}
          onTrigger={onMove}
        />
        <HoldDirectionButton
          direction="R"
          label="Move Right"
          icon={<ArrowRight className="w-7 h-7" />}
          disabled={disabled}
          onTrigger={onMove}
        />
      </div>

      {/* RIGHT CONTROL GROUP: Up and Down */}
      <div
        className="pointer-events-auto flex flex-col items-center gap-2.5 bg-slate-900/70 p-2 rounded-2xl border border-slate-700/70 shadow-xl"
        aria-label="Vertical movement controls"
      >
        <HoldDirectionButton
          direction="U"
          label="Move Up"
          icon={<ArrowUp className="w-7 h-7" />}
          disabled={disabled}
          onTrigger={onMove}
        />
        <HoldDirectionButton
          direction="D"
          label="Move Down"
          icon={<ArrowDown className="w-7 h-7" />}
          disabled={disabled}
          onTrigger={onMove}
        />
      </div>
    </div>
  );
};
