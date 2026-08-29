import React, { useRef, useEffect, useCallback } from 'react';

type Props = {
  onMove: (x: number, y: number) => void;      // joystick: -1..1 each axis
  onLook: (dx: number, dy: number) => void;     // look delta
  onSprint: (active: boolean) => void;
  onJump: () => void;
  onInteract: () => void;
  onHorror: () => void;
};

export function TouchControls({ onMove, onLook, onSprint, onJump, onInteract, onHorror }: Props) {
  const moveRef = useRef<HTMLDivElement>(null);
  const lookRef = useRef<HTMLDivElement>(null);
  const moveTouchId = useRef<number | null>(null);
  const lookTouchId = useRef<number | null>(null);
  const moveStart = useRef({ x: 0, y: 0 });
  const lookLast = useRef({ x: 0, y: 0 });
  const moveVec = useRef({ x: 0, y: 0 });

  // --- Move joystick ---
  const onMoveStart = useCallback((e: React.TouchEvent) => {
    if (moveTouchId.current !== null) return;
    const t = e.changedTouches[0];
    moveTouchId.current = t.identifier;
    moveStart.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onMoveMove = useCallback((e: React.TouchEvent) => {
    if (moveTouchId.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier !== moveTouchId.current) continue;
      const dx = t.clientX - moveStart.current.x;
      const dy = t.clientY - moveStart.current.y;
      const maxR = 50;
      const len = Math.sqrt(dx * dx + dy * dy);
      const cl = Math.min(len, maxR);
      const nx = len > 0 ? (dx / len) * (cl / maxR) : 0;
      const ny = len > 0 ? (dy / len) * (cl / maxR) : 0;
      moveVec.current = { x: nx, y: ny };
      onMove(nx, ny);
    }
  }, [onMove]);

  const onMoveEnd = useCallback((e: React.TouchEvent) => {
    if (moveTouchId.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier !== moveTouchId.current) continue;
      moveTouchId.current = null;
      moveVec.current = { x: 0, y: 0 };
      onMove(0, 0);
    }
  }, [onMove]);

  // --- Look drag ---
  const onLookStart = useCallback((e: React.TouchEvent) => {
    if (lookTouchId.current !== null) return;
    const t = e.changedTouches[0];
    lookTouchId.current = t.identifier;
    lookLast.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onLookMove = useCallback((e: React.TouchEvent) => {
    if (lookTouchId.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier !== lookTouchId.current) continue;
      const dx = t.clientX - lookLast.current.x;
      const dy = t.clientY - lookLast.current.y;
      lookLast.current = { x: t.clientX, y: t.clientY };
      onLook(dx, dy);
    }
  }, [onLook]);

  const onLookEnd = useCallback((e: React.TouchEvent) => {
    if (lookTouchId.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier !== lookTouchId.current) continue;
      lookTouchId.current = null;
    }
  }, []);

  // Prevent context menu on long press
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', prevent);
    return () => document.removeEventListener('contextmenu', prevent);
  }, []);

  return (
    <>
      {/* Look area — right half of screen */}
      <div
        ref={lookRef}
        className="fixed right-0 top-0 w-1/2 h-full z-20 touch-none"
        onTouchStart={onLookStart}
        onTouchMove={onLookMove}
        onTouchEnd={onLookEnd}
        onTouchCancel={onLookEnd}
      />

      {/* Move joystick — bottom left */}
      <div
        ref={moveRef}
        className="fixed bottom-8 left-8 z-30 touch-none select-none"
        onTouchStart={onMoveStart}
        onTouchMove={onMoveMove}
        onTouchEnd={onMoveEnd}
        onTouchCancel={onMoveEnd}
      >
        <div className="relative w-32 h-32 rounded-full bg-white/5 border border-white/15 backdrop-blur-sm">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/15 border border-white/25 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white/40" />
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons — bottom right */}
      <div className="fixed bottom-8 right-6 z-30 flex flex-col items-end gap-3 touch-none select-none">
        <div className="flex gap-3">
          {/* Horror */}
          <button
            className="w-12 h-12 rounded-full bg-red-900/40 border border-red-500/30 backdrop-blur-sm
                       flex items-center justify-center text-red-300/70 text-xs font-mono
                       active:scale-90 active:bg-red-800/60 transition-all"
            onTouchStart={(e) => { e.preventDefault(); onHorror(); }}
          >
            H
          </button>
          {/* Interact */}
          <button
            className="w-12 h-12 rounded-full bg-white/5 border border-white/15 backdrop-blur-sm
                       flex items-center justify-center text-white/60 text-xs font-mono
                       active:scale-90 active:bg-white/15 transition-all"
            onTouchStart={(e) => { e.preventDefault(); onInteract(); }}
          >
            E
          </button>
        </div>
        <div className="flex gap-3 items-end">
          {/* Sprint */}
          <button
            className="w-14 h-14 rounded-full bg-sky-900/30 border border-sky-500/25 backdrop-blur-sm
                       flex items-center justify-center text-sky-300/60 text-[10px] font-mono uppercase tracking-wider
                       active:scale-90 active:bg-sky-700/50 transition-all"
            onTouchStart={(e) => { e.preventDefault(); onSprint(true); }}
            onTouchEnd={(e) => { e.preventDefault(); onSprint(false); }}
          >
            Run
          </button>
          {/* Jump */}
          <button
            className="w-16 h-16 rounded-full bg-white/8 border border-white/20 backdrop-blur-sm
                       flex items-center justify-center text-white/70 text-xs font-mono
                       active:scale-90 active:bg-white/20 transition-all"
            onTouchStart={(e) => { e.preventDefault(); onJump(); }}
          >
            Jump
          </button>
        </div>
      </div>
    </>
  );
}
