import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Search, Loader2, ChevronRight } from 'lucide-react';
import {
  createPlacesSessionToken,
  getAddressPlaceDetails,
  searchAddresses,
  type AddressSuggestion,
} from '@/game/persistence';

type Props = {
  onConfirm: (address: string, lat?: number, lon?: number) => void;
};

export function AddressPrompt({ onConfirm }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [resolvingPlace, setResolvingPlace] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<AddressSuggestion | null>(null);
  const [sessionToken, setSessionToken] = useState(() => createPlacesSessionToken());
  const submittedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 3 || selectedSuggestion) {
      setSuggestions([]);
      setLoadingSuggest(false);
      return;
    }

    setLoadingSuggest(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchAddresses(value, sessionToken);
      setSuggestions(results);
      setLoadingSuggest(false);
      setShowSuggestions(results.length > 0);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, selectedSuggestion, sessionToken]);

  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouch) inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, []);

  const handleSelectSuggestion = useCallback(async (suggestion: AddressSuggestion) => {
    setShowSuggestions(false);
    setResolvingPlace(true);
    setError('');

    try {
      const details = await getAddressPlaceDetails(suggestion.placeId, sessionToken);
      if (!details) {
        setError('Não foi possível obter a localização exata desse endereço no Google.');
        return;
      }

      setSelectedSuggestion({
        ...suggestion,
        displayName: details.displayName,
        lat: details.lat,
        lon: details.lon,
      });
      setValue(details.displayName);

      // A Places Autocomplete session ends after Place Details.
      setSessionToken(createPlacesSessionToken());
    } finally {
      setResolvingPlace(false);
    }
  }, [sessionToken]);

  const handleSubmit = useCallback(() => {
    if (submittedRef.current || submitting || resolvingPlace) return;

    if (!selectedSuggestion || selectedSuggestion.lat == null || selectedSuggestion.lon == null) {
      setError('Selecione um dos endereços sugeridos pelo Google para continuar.');
      setShowSuggestions(suggestions.length > 0);
      return;
    }

    submittedRef.current = true;
    setSubmitting(true);
    setError('');
    onConfirm(selectedSuggestion.displayName, selectedSuggestion.lat, selectedSuggestion.lon);
  }, [onConfirm, resolvingPlace, selectedSuggestion, submitting, suggestions.length]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleSubmit();
  }, [handleSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    if (showSuggestions && suggestions.length > 0) {
      void handleSelectSuggestion(suggestions[0]);
    } else {
      handleSubmit();
    }
  }, [handleSelectSuggestion, handleSubmit, showSuggestions, suggestions]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#060608] pointer-events-auto"
      style={{ touchAction: 'manipulation' }}
    >
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/80 pointer-events-none" />

      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          backgroundSize: '200px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-md w-full px-6">
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

        <div className="w-24 h-px bg-white/10" />

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
                  const nextValue = e.target.value;
                  setValue(nextValue);
                  setError('');
                  submittedRef.current = false;

                  if (selectedSuggestion && nextValue !== selectedSuggestion.displayName) {
                    setSelectedSuggestion(null);
                    setSessionToken(createPlacesSessionToken());
                  }
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (suggestions.length > 0 && !selectedSuggestion) setShowSuggestions(true);
                }}
                placeholder="Rua XV de Novembro 123, Araras"
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-10 py-3
                           text-sm text-white/80 placeholder-white/20 font-mono
                           focus:outline-none focus:border-white/30 transition-all"
                autoComplete="off"
                autoCapitalize="words"
                spellCheck={false}
                style={{ fontSize: '16px' }}
              />

              {(loadingSuggest || resolvingPlace) && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 animate-spin pointer-events-none" />
              )}
              {!loadingSuggest && !resolvingPlace && value && (
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
              )}
            </div>

            {showSuggestions && suggestions.length > 0 && !selectedSuggestion && (
              <div className="relative">
                <div className="absolute top-1 left-0 right-0 bg-[#0c0d12] border border-white/15 rounded-lg overflow-hidden shadow-2xl z-50 max-h-60 overflow-y-auto">
                  {suggestions.map((s) => (
                    <button
                      type="button"
                      key={s.placeId}
                      disabled={resolvingPlace}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void handleSelectSuggestion(s);
                      }}
                      className="w-full text-left px-3 py-3 flex items-center gap-2 cursor-pointer
                                 hover:bg-white/8 active:bg-white/12 transition-colors
                                 border-b border-white/5 last:border-b-0 disabled:cursor-wait disabled:opacity-60"
                      style={{ touchAction: 'manipulation' }}
                    >
                      <MapPin className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                      <span className="min-w-0 flex-1 font-mono">
                        <span className="block truncate text-xs text-white/70">{s.mainText}</span>
                        {s.secondaryText && (
                          <span className="block truncate mt-0.5 text-[10px] text-white/35">{s.secondaryText}</span>
                        )}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/20 flex-shrink-0" />
                    </button>
                  ))}
                  <div className="px-3 py-2 border-t border-white/5 text-[9px] font-mono text-white/30 text-right tracking-wide">
                    Powered by Google
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400/80 font-mono">{error}</p>
            )}

            <p className="text-[11px] text-white/20 font-mono leading-relaxed">
              Selecione o endereço correto sugerido pelo Google.
              A localização escolhida será usada como ponto inicial e para encontrar o panorama do Street View.
            </p>
          </div>

          <button
            type="button"
            disabled={submitting || resolvingPlace}
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
            {submitting || resolvingPlace ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{resolvingPlace ? 'Confirmando endereço...' : 'Carregando...'}</span>
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
