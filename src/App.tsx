import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AddressPrompt } from '@/components/AddressPrompt';
import { HUD } from '@/components/HUD';
import { createGame } from '@/game/engine';
import { loadOrCreatePlayer } from '@/game/persistence';
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

  const [phase, setPhase] = useState<'address' | 'loading' | 'playing'>(
    localStorage.getItem(ADDRESS_KEY) ? 'loading' : 'address',
  );
  const [address, setAddress] = useState(localStorage.getItem(ADDRESS_KEY) ?? '');
  const [health, setHealth] = useState(RULES.vitals.maxHealth);
  const [stamina, setStamina] = useState(RULES.vitals.maxStamina);
  const [locked, setLocked] = useState(false);

  const startGame = useCallback(async (addr: string) => {
    if (!canvasRef.current) return;
    localStorage.setItem(ADDRESS_KEY, addr);
    setAddress(addr);
    setPhase('playing');

    const sessionId = getOrCreateSession();
    const saved = await loadOrCreatePlayer(
      sessionId, addr,
      RULES.world.defaultLatitude, RULES.world.defaultLongitude,
    );

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
  }, []);

  // Auto-start if address already stored
  useEffect(() => {
    if (phase === 'loading' && address) {
      startGame(address);
    }
  }, [phase, address, startGame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { gameRef.current?.destroy(); };
  }, []);

  // Canvas fills the viewport
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obs = new ResizeObserver(() => {
      // engine handles its own resize via window listener
    });
    obs.observe(canvas);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ cursor: locked ? 'none' : 'default' }}
      />

      {phase === 'address' && (
        <AddressPrompt onConfirm={(addr) => { setPhase('loading'); startGame(addr); }} />
      )}

      {phase === 'playing' && (
        <HUD health={health} stamina={stamina} locked={locked} address={address} />
      )}
    </div>
  );
}
