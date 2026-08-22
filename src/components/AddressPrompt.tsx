import React, { useState, useRef } from 'react';
import { MapPin } from 'lucide-react';

type Props = {
  onConfirm: (address: string) => void;
};

export function AddressPrompt({ onConfirm }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const submittedRef = useRef(false);

  const handleSubmit = () => {
    if (submittedRef.current) return;
    if (value.trim().length < 4) {
      setError('Digite um endereço completo.');
      return;
    }
    submittedRef.current = true;
    setError('');
    onConfirm(value.trim());
  };

  // Pointer events work uniformly for mouse, touch, and pen
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#060608]"
      style={{ touchAction: 'none' }}
    >
      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/80 pointer-events-none" />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '200px' }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-sm w-full px-6">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-[0.25em] text-white/90 uppercase" style={{ fontFamily: 'system-ui' }}>
            Clamour
          </h1>
          <p className="text-xs tracking-[0.4em] text-white/30 uppercase font-mono">
            in the darkness
          </p>
        </div>

        {/* Divider */}
        <div className="w-24 h-px bg-white/10" />

        {/* No form wrapper — avoids mobile submit quirks */}
        <div className="w-full space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-mono tracking-widest text-white/40 uppercase block">
              Seu endereço
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none" />
              <input
                type="text"
                value={value}
                onChange={e => { setValue(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                placeholder="Rua XV de Novembro 123, Araras"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-3
                           text-sm text-white/80 placeholder-white/20 font-mono
                           focus:outline-none focus:border-white/25 transition-all"
                autoComplete="street-address"
                autoCapitalize="words"
                style={{ fontSize: '16px' }}
              />
            </div>
            {error && (
              <p className="text-xs text-red-400/80 font-mono">{error}</p>
            )}
            <p className="text-[11px] text-white/20 font-mono leading-relaxed">
              Este endereço define sua posição inicial no mundo.
              O jogo vai te colocar aqui na primeira entrada.
            </p>
          </div>

          <button
            type="button"
            onPointerDown={handlePointerDown}
            className="w-full py-4 rounded-lg bg-white/10 border border-white/20 text-white/80
                       text-sm font-mono tracking-widest uppercase
                       hover:bg-white/15 hover:text-white hover:border-white/30
                       active:scale-[0.97] active:bg-white/20
                       transition-all duration-150
                       min-h-[52px] flex items-center justify-center
                       select-none"
            style={{
              touchAction: 'none',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Entrar na Noite
          </button>
        </div>
      </div>
    </div>
  );
}
