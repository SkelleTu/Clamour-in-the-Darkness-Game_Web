import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Search, Loader2, ChevronRight } from 'lucide-react';
import { searchAddresses, type AddressSuggestion } from '@/game/persistence';

type Props = {
  onConfirm: (address: string, lat?: number, lon?: number) => void;
};

export function AddressPrompt({ onConfirm }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<AddressSuggestion | null>(null);
  const submittedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced address search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      setLoadingSuggest(false);
      return;
    }
    if (selectedSuggestion && value === selectedSuggestion.displayName) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggest(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchAddresses(value);
      setSuggestions(results);
      setLoadingSuggest(false);
      setShowSuggestions(true);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, selectedSuggestion]);

  // Focus input on mount (desktop only — avoid keyboard popup on mobile)
  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouch) inputRef.current?.focus();
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, []);

  const handleSelectSuggestion = useCallback((s: AddressSuggestion) => {
    setSelectedSuggestion(s);
    setValue(s.displayName);
    setShowSuggestions(false);
    setError('');
  }, []);

  const handleSubmit = useCallback(() => {
    if (submittedRef.current) return;
    if (value.trim().length < 4) {
      setError('Digite um endereço completo.');
      return;
    }
    submittedRef.current = true;
    setSubmitting(true);
    setError('');
    if (selectedSuggestion) {
      onConfirm(selectedSuggestion.displayName, selectedSuggestion.lat, selectedSuggestion.lon);
    } else {
      onConfirm(value.trim());
    }
  }, [value, selectedSuggestion, onConfirm]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleSubmit();
  }, [handleSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showSuggestions && suggestions.length > 0) {
        handleSelectSuggestion(suggestions[0]);
      } else {
        handleSubmit();
      }
    }
  }, [showSuggestions, suggestions, handleSubmit, handleSelectSuggestion]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#060608] pointer-events-auto"
      style={{ touchAction: 'manipulation' }}
    >
      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/80 pointer-events-none" />

      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          backgroundSize: '200px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full px-6">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1
            className="text-3xl font-bold tracking-[0.25em] text-white/90 uppercase"
            style={{ fontFamily: 'system-ui' }}
          >
            Clamour
          </h1>
          <p className="text-xs tracking-[0.4em] text-white/30 uppercase font-mono">
            in the darkness
          </p>
        </div>

        {/* Divider */}
        <div className="w-24 h-px bg-white/10" />

        {/* Address input + suggestions + button */}
        <div className="w-full space-y-4" ref={containerRef}>
          <div className="space-y-2">
            <label className="text-xs font-mono tracking-widest text-white/40 uppercase block">
              Seu endereço
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none z-10" />
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setSelectedSuggestion(null);
                  setError('');
                }}
                onKeyDown={handleKeyDown}
                onPointerDown={() => setShowSuggestions(true)}
                placeholder="Rua XV de Novembro 123, Araras"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-10 py-3
                           text-sm text-white/80 placeholder-white/20 font-mono
                           focus:outline-none focus:border-white/30 transition-all"
                autoComplete="off"
                autoCapitalize="words"
                style={{ fontSize: '16px' }}
              />
              {loadingSuggest && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 animate-spin pointer-events-none" />
              )}
              {!loadingSuggest && value && (
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
              )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="relative">
                <div className="absolute top-1 left-0 right-0 bg-[#0c0d12] border border-white/15 rounded-lg overflow-hidden shadow-2xl z-50 max-h-60 overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <div
                      key={i}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectSuggestion(s);
                      }}
                      className="px-3 py-3 flex items-center gap-2 cursor-pointer
                                 hover:bg-white/8 active:bg-white/12 transition-colors
                                 border-b border-white/5 last:border-b-0"
                      style={{ touchAction: 'manipulation' }}
                    >
                      <MapPin className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                      <span className="text-xs text-white/60 font-mono truncate flex-1">
                        {s.displayName}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

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
            disabled={submitting}
            onPointerDown={handlePointerDown}
            className="w-full py-4 rounded-lg bg-white/10 border border-white/20 text-white/80
                       text-sm font-mono tracking-widest uppercase
                       hover:bg-white/15 hover:text-white hover:border-white/30
                       active:scale-[0.97] active:bg-white/20
                       disabled:opacity-50
                       transition-all duration-150
                       min-h-[52px] flex items-center justify-center gap-2
                       select-none"
            style={{
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Carregando...</span>
              </>
            ) : (
              'Entrar na Noite'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
