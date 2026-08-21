import React from 'react';
import { RULES } from '@/game/rules';

type Props = {
  health: number;
  stamina: number;
  locked: boolean;
  address: string;
};

export function HUD({ health, stamina, locked, address }: Props) {
  const hPct = (health / RULES.vitals.maxHealth) * 100;
  const sPct = (stamina / RULES.vitals.maxStamina) * 100;

  const healthColor =
    hPct > 60 ? '#22c55e' : hPct > 30 ? '#f59e0b' : '#ef4444';

  return (
    <>
      {/* Crosshair */}
      {locked && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="relative w-5 h-5">
            <span className="absolute top-1/2 left-0 w-full h-px bg-white/70 -translate-y-1/2" />
            <span className="absolute left-1/2 top-0 h-full w-px bg-white/70 -translate-x-1/2" />
          </div>
        </div>
      )}

      {/* Bottom vitals */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-30">
        {/* Health */}
        <div className="flex items-center gap-2 w-64">
          <span className="text-xs font-mono uppercase tracking-widest text-red-400 w-6">HP</span>
          <div className="flex-1 h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: `${hPct}%`, backgroundColor: healthColor }}
            />
          </div>
          <span className="text-xs font-mono text-white/50 w-8 text-right">{Math.round(health)}</span>
        </div>

        {/* Stamina */}
        <div className="flex items-center gap-2 w-64">
          <span className="text-xs font-mono uppercase tracking-widest text-sky-400 w-6">ST</span>
          <div className="flex-1 h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: `${sPct}%`, backgroundColor: stamina < RULES.vitals.exhaustionThreshold + 1 ? '#475569' : '#38bdf8' }}
            />
          </div>
          <span className="text-xs font-mono text-white/50 w-8 text-right">{Math.round(stamina)}</span>
        </div>
      </div>

      {/* Address badge */}
      {address && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="bg-black/50 border border-white/10 rounded-full px-4 py-1">
            <span className="text-xs font-mono text-white/40 tracking-widest uppercase">
              {address}
            </span>
          </div>
        </div>
      )}

      {/* Click to play */}
      {!locked && (
        <div className="fixed inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="text-center">
            <p className="text-white/30 text-sm font-mono tracking-widest uppercase animate-pulse">
              Click to play
            </p>
          </div>
        </div>
      )}

      {/* Controls hint */}
      {locked && (
        <div className="fixed bottom-24 right-6 z-30 pointer-events-none opacity-30 hover:opacity-60 transition-opacity">
          <div className="bg-black/40 rounded-xl px-3 py-2 border border-white/10 text-[10px] font-mono text-white/60 space-y-0.5">
            <div>WASD — move</div>
            <div>SHIFT — sprint</div>
            <div>SPACE — jump</div>
            <div>E — interact</div>
            <div>F — spawn object</div>
            <div>H — horror event</div>
          </div>
        </div>
      )}
    </>
  );
}
