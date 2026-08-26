import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LogOut } from 'lucide-react';
import { AddressPrompt } from '@/components/AddressPrompt';
import { AuthScreen } from '@/components/AuthScreen';
import { HUD } from '@/components/HUD';
import { TouchControls } from '@/components/TouchControls';
import { createGame } from '@/game/engine';
import { loadOrCreatePlayer, geocodeAddress } from '@/game/persistence';
import { getStreetViewMetadata, clearAuth, validateSession, type AuthSession } from '@/lib/universalServer';
import { isTouchDevice } from '@/game/input';
import { RULES } from '@/game/rules';

function addressKey(playerId: string) {
  return `clamour_home_address:${playerId}`;
}

function bearingBetween(lat1: number, lon1: number, lat2: number, lon2: number) {
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const delta = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(delta) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(phi2) * Math.cos(delta);
  const deg = Math.atan2(y, x) * 180 / Math.PI;
  return (deg + 360) % 360;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Awaited<ReturnType<typeof createGame>> | null>(null);
  const isTouch = useRef(isTouchDevice()).current;

  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [phase, setPhase] = useState<'boot' | 'auth' | 'address' | 'loading' | 'playing' | 'error'>('boot');
  const [address, setAddress] = useState('');
  const [health, setHealth] = useState(RULES.vitals.maxHealth);
  const [stamina, setStamina] = useState(RULES.vitals.maxStamina);
  const [locked, setLocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [streetViewAttribution, setStreetViewAttribution] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void validateSession().then((session) => {
      if (!alive) return;
      if (session) {
        setAuth(session);
        setAddress(localStorage.getItem(addressKey(session.playerId)) ?? '');
        setPhase('address');
      } else {
        setPhase('auth');
      }
    });
    return () => { alive = false; };
  }, []);

  const logout = useCallback(() => {
    gameRef.current?.destroy();
    gameRef.current = null;
    clearAuth();
    setAuth(null);
    setAddress('');
    setStreetViewAttribution(null);
    setPhase('auth');
  }, []);

  const startGame = useCallback(async (addr: string, preLat?: number, preLon?: number) => {
    if (!auth) {
      setPhase('auth');
      return;
    }

    localStorage.setItem(addressKey(auth.playerId), addr);
    setAddress(addr);
    setPhase('loading');
    setErrorMsg('');

    try {
      let attempts = 0;
      while (!canvasRef.current && attempts < 50) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        attempts++;
      }
      if (!canvasRef.current) throw new Error('Canvas não encontrado');

      let lat = preLat;
      let lon = preLon;
      if (lat == null || lon == null) {
        const geo = await geocodeAddress(addr);
        if (!geo) throw new Error('Não foi possível localizar esse endereço em Araras.');
        lat = geo.lat;
        lon = geo.lon;
      }

      const streetView = await getStreetViewMetadata(lat, lon);
      const streetLat = streetView.location.lat;
      const streetLon = streetView.location.lng;
      const initialYaw = bearingBetween(streetLat, streetLon, lat, lon);
      const saved = await loadOrCreatePlayer(auth.playerId, addr, lat, lon);

      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }

      const game = await createGame(canvasRef.current, {
        onVitalsChange: (h, s) => { setHealth(h); setStamina(s); },
        onPointerLock: setLocked,
        onStreetViewAttribution: setStreetViewAttribution,
      }, {
        streetView,
        initialYaw,
        originLat: lat,
        originLng: lon,
      });

      if (saved && saved.home_lat === lat && saved.home_lon === lon && (saved.pos_x !== 0 || saved.pos_z !== 0 || saved.yaw !== 0)) {
        game.loadPosition(saved.pos_x, saved.pos_y, saved.pos_z, saved.yaw);
      }

      gameRef.current = game;
      setPhase('playing');
    } catch (err) {
      console.error('startGame error:', err);
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao inicializar o jogo.');
      setPhase('error');
    }
  }, [auth]);

  useEffect(() => {
    return () => { gameRef.current?.destroy(); };
  }, []);

  const touchControls = gameRef.current?.touchControls;

  return (
    <div className="fixed inset-0 overflow-hidden bg-black select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full"
        style={{ cursor: locked ? 'none' : 'default' }}
      />

      {phase === 'boot' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
            <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-white/30">Conectando ao Universal Server</p>
          </div>
        </div>
      )}

      {phase === 'auth' && <AuthScreen onAuthenticated={(session) => {
        setAuth(session);
        setAddress(localStorage.getItem(addressKey(session.playerId)) ?? '');
        setPhase('address');
      }} />}

      {phase === 'address' && auth && (
        <>
          <AddressPrompt onConfirm={(addr, lat, lon) => void startGame(addr, lat, lon)} />
          <button
            type="button"
            onPointerDown={(event) => { event.preventDefault(); logout(); }}
            className="fixed right-5 top-5 z-[60] flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-white/35 backdrop-blur hover:text-white/70"
          >
            <LogOut className="h-3.5 w-3.5" /> {auth.username}
          </button>
        </>
      )}

      {phase === 'loading' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="w-full max-w-sm px-6 text-center">
            <div className="mx-auto mb-5 h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-white/65" />
            <p className="text-[10px] font-mono uppercase tracking-[0.4em] text-white/35">Localizando a noite</p>
            <p className="mt-2 text-xs leading-relaxed text-white/20">Encontrando a rua, o panorama mais próximo e preparando sua posição inicial.</p>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <div className="max-w-sm px-6 text-center">
            <p className="mb-5 text-sm font-mono leading-relaxed text-red-300/75">{errorMsg}</p>
            <div className="flex gap-3 justify-center">
              <button
                className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-xs font-mono uppercase tracking-widest text-white/70 hover:bg-white/15"
                onPointerDown={(e) => { e.preventDefault(); setPhase('address'); }}
              >
                Voltar
              </button>
              <button
                className="rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-xs font-mono uppercase tracking-widest text-white/70 hover:bg-white/15"
                onPointerDown={(e) => { e.preventDefault(); void startGame(address); }}
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'playing' && auth && (
        <>
          <HUD health={health} stamina={stamina} locked={locked} address={address} isTouch={isTouch} />
          <div className="pointer-events-none fixed bottom-3 right-3 z-40 max-w-[45%] text-right text-[8px] font-mono leading-tight text-white/30">
            {streetViewAttribution ?? 'Google Street View'}
          </div>
          <button
            type="button"
            onPointerDown={(event) => { event.preventDefault(); logout(); }}
            className="fixed right-3 top-3 z-40 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider text-white/25 backdrop-blur hover:text-white/60"
          >
            {auth.username}
          </button>
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
