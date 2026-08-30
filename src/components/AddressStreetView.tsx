import { useEffect, useRef, useState } from "react";
import { MapPin, Search, Loader2, X } from "lucide-react";

const BROWSER_KEY = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "").trim();

declare global {
  interface Window {
    __initAddressStreetView?: () => void;
  }
}

type Suggestion = {
  id: string;
  mainText: string;
  secondaryText: string;
  prediction: any;
};

type Props = {
  onConfirm: (address: string, lat?: number, lon?: number) => void;
};

let mapsPromise: Promise<void> | null = null;

function loadMaps(): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    window.__initAddressStreetView = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(BROWSER_KEY)}&loading=async&callback=__initAddressStreetView`;
    script.async = true;
    script.onerror = () => reject(new Error("Falha ao carregar o Google Maps"));
    document.head.appendChild(script);
  });
  return mapsPromise;
}

export function AddressStreetView({ onConfirm }: Props) {
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [panoStatus, setPanoStatus] = useState<"idle" | "loading" | "ok" | "unavailable">("idle");

  const sessionTokenRef = useRef<any>(null);
  const panoRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMaps()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setPanoStatus("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const fetchSuggestions = (input: string) => {
    if (!ready || !input.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setFetching(true);
        const { AutocompleteSuggestion, AutocompleteSessionToken } = (await (window.google as any).maps.importLibrary(
          "places",
        )) as any;
        if (!sessionTokenRef.current) sessionTokenRef.current = new AutocompleteSessionToken();
        const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: sessionTokenRef.current,
          language: "pt-BR",
        });
        const mapped: Suggestion[] = (results ?? [])
          .filter((r: any) => r.placePrediction)
          .map((r: any) => ({
            id: r.placePrediction.placeId,
            mainText: r.placePrediction.mainText?.toString() ?? r.placePrediction.text?.toString() ?? "",
            secondaryText: r.placePrediction.secondaryText?.toString() ?? "",
            prediction: r.placePrediction,
          }));
        setSuggestions(mapped);
        setOpen(mapped.length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setFetching(false);
      }
    }, 300);
  };

  const selectSuggestion = async (s: Suggestion) => {
    setOpen(false);
    setSuggestions([]);
    setQuery(`${s.mainText}${s.secondaryText ? `, ${s.secondaryText}` : ""}`);
    setPanoStatus("loading");
    setSelectedAddress(null);
    try {
      const place = s.prediction.toPlace();
      await place.fetchFields({ fields: ["location", "formattedAddress", "displayName"] });
      sessionTokenRef.current = null;

      const displayName = place.formattedAddress ?? place.displayName ?? query;
      setSelectedAddress(displayName);

      const lat = Number(place.location?.lat?.());
      const lon = Number(place.location?.lng?.());

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new Error("Localização inválida");
      }

      const sv = new (window.google as any).maps.StreetViewService();
      try {
        const { data } = await sv.getPanorama({ location: place.location, radius: 150 });
        if (panoRef.current) {
          new (window.google as any).maps.StreetViewPanorama(panoRef.current, {
            position: data.location.latLng,
            pov: { heading: 0, pitch: 0 },
            zoom: 1,
            addressControl: false,
            showRoadLabels: false,
          });
        }
        setPanoStatus("ok");
      } catch {
        setPanoStatus("unavailable");
      }

      onConfirm(displayName, lat, lon);
    } catch {
      setPanoStatus("unavailable");
    }
  };

  const clear = () => {
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    setSelectedAddress(null);
    setPanoStatus("idle");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060608] pointer-events-auto">
      <div className="relative z-10 flex flex-col items-center gap-6 max-w-md w-full px-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-[0.25em] text-white/90 uppercase" style={{ fontFamily: 'system-ui' }}>
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

            <div ref={boxRef} className="relative">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-lg shadow-black/20 backdrop-blur-xl transition-colors focus-within:border-white/20">
                <Search className="h-4 w-4 shrink-0 text-white/30" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    fetchSuggestions(e.target.value);
                  }}
                  onFocus={() => suggestions.length > 0 && setOpen(true)}
                  placeholder="Digite um endereço..."
                  autoComplete="off"
                  className="w-full bg-transparent text-sm text-white/80 outline-none placeholder:text-white/25"
                  aria-label="Buscar endereço"
                />
                {fetching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/30" />}
                {!fetching && query && (
                  <button onClick={clear} aria-label="Limpar" className="text-white/30 transition-colors hover:text-white/60">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {open && (
                <ul className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-white/10 bg-[#0a0c12] py-1 shadow-xl shadow-black/40">
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => selectSuggestion(s)}
                        className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/10"
                      >
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-white/40" />
                        <span className="min-w-0">
                          <span className="block truncate text-[11px] font-mono text-white/75">{s.mainText}</span>
                          {s.secondaryText && (
                            <span className="block truncate text-[10px] font-mono text-white/35">{s.secondaryText}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {panoStatus === "loading" && (
              <div className="flex items-center gap-2 px-1 text-[10px] font-mono uppercase tracking-widest text-white/30">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Confirmando endereço...
              </div>
            )}

            {panoStatus === "unavailable" && !selectedAddress && (
              <p className="text-[10px] font-mono text-white/25">
                Selecione uma sugestão para continuar.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
