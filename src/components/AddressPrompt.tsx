import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import {
  createPlaceAutocompleteElement,
  resolvePlacePrediction,
  type GooglePlaceSelection,
} from '@/lib/googlePlaces';

type Props = {
  onConfirm: (address: string, lat?: number, lon?: number) => void;
};

type PlaceSelectEvent = Event & {
  placePrediction?: {
    toPlace: () => {
      id?: string;
      formattedAddress?: string;
      location?: { lat?: () => number; lng?: () => number };
      fetchFields: (options: { fields: string[] }) => Promise<void>;
    };
  };
};

const GOOGLE_WIDGET_STYLE = `
  .clamour-google-autocomplete {
    width: 100%;
    display: block;
  }
  .clamour-google-autocomplete gmp-place-autocomplete {
    width: 100%;
  }
`;

export function AddressPrompt({ onConfirm }: Props) {
  const [error, setError] = useState('');
  const [loadingGoogle, setLoadingGoogle] = useState(true);
  const [resolvingPlace, setResolvingPlace] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<GooglePlaceSelection | null>(null);
  const autocompleteHostRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<HTMLElement | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let element: HTMLElement | null = null;

    async function mountGoogleAutocomplete() {
      try {
        setLoadingGoogle(true);
        element = await createPlaceAutocompleteElement();
        if (cancelled || !autocompleteHostRef.current) return;

        autocompleteHostRef.current.replaceChildren(element);
        autocompleteRef.current = element;

        const onSelect = async (event: Event) => {
          const selectEvent = event as PlaceSelectEvent;
          const prediction = selectEvent.placePrediction;
          if (!prediction) {
            setError('O Google não retornou um endereço selecionável.');
            return;
          }

          setResolvingPlace(true);
          setSelectedPlace(null);
          setError('');
          submittedRef.current = false;

          try {
            const place = await resolvePlacePrediction(prediction);
            if (cancelled) return;
            setSelectedPlace(place);
          } catch (resolveError) {
            if (cancelled) return;
            setError(
              resolveError instanceof Error
                ? resolveError.message
                : 'Não foi possível confirmar a localização desse endereço no Google.',
            );
          } finally {
            if (!cancelled) setResolvingPlace(false);
          }
        };

        element.addEventListener('gmp-select', onSelect);
        setLoadingGoogle(false);

        return () => element?.removeEventListener('gmp-select', onSelect);
      } catch (loadError) {
        if (cancelled) return;
        setLoadingGoogle(false);
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Não foi possível carregar o Google Places.',
        );
      }
    }

    void mountGoogleAutocomplete();

    return () => {
      cancelled = true;
      autocompleteRef.current?.replaceWith();
      autocompleteRef.current = null;
    };
  }, []);

  const handleSubmit = useCallback(() => {
    if (submittedRef.current || submitting || resolvingPlace) return;

    if (!selectedPlace) {
      setError('Selecione um endereço sugerido pelo Google para continuar.');
      return;
    }

    submittedRef.current = true;
    setSubmitting(true);
    setError('');
    onConfirm(selectedPlace.displayName, selectedPlace.lat, selectedPlace.lon);
  }, [onConfirm, resolvingPlace, selectedPlace, submitting]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#060608] pointer-events-auto"
      style={{ touchAction: 'manipulation' }}
    >
      <style>{GOOGLE_WIDGET_STYLE}</style>
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

        <div className="w-full space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-mono tracking-widest text-white/40 uppercase block">
              Seu endereço
            </label>

            <div
              ref={autocompleteHostRef}
              className="clamour-google-autocomplete min-h-[56px] relative rounded-lg overflow-visible"
            />

            {loadingGoogle && (
              <div className="flex items-center gap-2 px-1 text-[10px] font-mono uppercase tracking-widest text-white/30">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Carregando Google Places...
              </div>
            )}

            {resolvingPlace && (
              <div className="flex items-center gap-2 px-1 text-[10px] font-mono uppercase tracking-widest text-white/30">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Confirmando endereço...
              </div>
            )}

            {selectedPlace && !resolvingPlace && (
              <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-white/40" />
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-mono text-white/65">{selectedPlace.displayName}</p>
                  <p className="mt-0.5 text-[9px] font-mono uppercase tracking-wider text-white/25">
                    Localização Google confirmada
                  </p>
                </div>
              </div>
            )}

            {error && <p className="text-xs text-red-400/80 font-mono">{error}</p>}

            <p className="text-[11px] text-white/20 font-mono leading-relaxed">
              Digite o endereço e selecione uma sugestão exibida diretamente pelo Google.
              A localização confirmada será usada para encontrar o panorama correspondente do Street View.
            </p>
          </div>

          <button
            type="button"
            disabled={submitting || resolvingPlace || loadingGoogle || !selectedPlace}
            onClick={handleSubmit}
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
