import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AddressPrompt } from '@/components/AddressPrompt';
import { HUD } from '@/components/HUD';
import { TouchControls } from '@/components/TouchControls';
import { createGame } from '@/game/engine';
import { loadOrCreatePlayer, geocodeAddress } from '@/game/persistence';
import { isTouchDevice } from '@/game/input';
import { RULES } from '@/game/rules';

const SESSION_KEY = 'clamour_session';
const ADDRESS_KEY = 'clamour_home_address';

function getOrCreateSession() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<ReturnType<typeof createGame> | null>(null);
  const isTouch = useRef(isTouchDevice()).current;

  const [phase, setPhase] = useState<'address' | 'loading' | 'playing' | 'error'>(
    localStorage.getItem(ADDRESS_KEY) ? 'loading' : 'address',
  );
  const [address, setAddress] = useState(localStorage.getItem(ADDRESS_KEY) ?? '');
  const [health, setHealth] = useState(RULES.vitals.maxHealth);
  const [stamina, setStamina] = useState(RULES.vitals.maxStamina);
  const [locked, setLocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const startGame = useCallback(async (addr: string, preLat?: number, preLon?: number) => {
    localStorage.setItem(ADDRESS_KEY, addr);
    setAddress(addr);
    setPhase('loading');

    try {
      // Wait for canvas to be ready
      let attempts = 0;
      while (!canvasRef.current && attempts < 50) {
        await new Promise(r => setTimeout(r, 50));
        attempts++;
      }
      if (!canvasRef.current) {
        throw new Error('Canvas não encontrado');
      }

      const sessionId = getOrCreateSession();

      // Use pre-geocoded coords from autocomplete, or geocode now
      let lat = preLat ?? RULES.world.defaultLatitude;
      let lon = preLon ?? RULES.world.defaultLongitude;
      if (preLat == null || preLon == null) {
        try {
          const geo = await geocodeAddress(addr);
          if (geo) {
            lat = geo.lat;
            lon = geo.lon;
          }
        } catch {
          // fall back to default
        }
      }

      const saved = await loadOrCreatePlayer(sessionId, addr, lat, lon);

      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }

      const game = createGame(canvasRef.current!, {
        onVitalsChange: (h, s) => { setHealth(h); setStamina(s); },
        onPointerLock: setLocked,
      });

      if (saved && RULES.persistence.restoreLastPosition) {
        game.loadPosition(saved.pos_x, saved.pos_y, saved.pos_z, saved.yaw);
      }

      gameRef.current = game;
      setPhase('playing');
    } catch (err) {
      console.error('startGame error:', err);
      setErrorMsg('Erro ao inicializar o jogo. Verifique sua conexão e tente novamente.');
      setPhase('error');
    }
  }, []);

  // Auto-start if address already stored
  useEffect(() => {
    if (phase === 'loading' && address) {
      startGame(address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { gameRef.current?.destroy(); };
  }, []);

  const touchControls = gameRef.current?.touchControls;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ cursor: locked ? 'none' : 'default' }}
      />

      {phase === 'address' && (
        <AddressPrompt
          onConfirm={(addr, lat, lon) => { startGame(addr, lat, lon); }}
        />
      )}

      {phase === 'loading' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono tracking-widest text-white/40 uppercase">
              Localizando sua casa...
            </p>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="text-center space-y-4 max-w-sm px-6">
            <p className="text-red-400/80 text-sm font-mono">{errorMsg}</p>
            <button
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white/70 text-sm font-mono hover:bg-white/15 min-h-[44px]"
              onPointerDown={(e) => { e.preventDefault(); setPhase('address'); setErrorMsg(''); }}
              style={{ touchAction: 'none', WebkitTapHighlightColor: 'transparent' }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {phase === 'playing' && (
        <>
          <HUD health={health} stamina={stamina} locked={locked} address={address} isTouch={isTouch} />
          {isTouch && touchControls && (
            <TouchControls
              onMove={touchControls.onMove}
              onLook={touchControls.onLook}
              onSprint={touchControls.onSprint}
              onJump={touchControls.onJump}
              onInteract={touchControls.onInteract}
              onHorror={touchControls.onHorror}
            />
          )}
        </>
      )}
    </div>
  );
}
