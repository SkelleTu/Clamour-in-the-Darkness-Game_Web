import { useEffect, useRef, useState, useCallback } from "react";

const BROWSER_KEY = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "").trim();

declare global {
  interface Window {
    __googleMapsLoaderPromise?: Promise<void>;
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.__googleMapsLoaderPromise) return window.__googleMapsLoaderPromise;
  const loaderPromise = new Promise<void>((resolve, reject) => {
    const callbackName = "__initGoogleMapsStreetView";
    const w = window as unknown as Record<string, unknown>;
    w[callbackName] = () => {
      delete w[callbackName];
      resolve();
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey,
    )}&loading=async&callback=${callbackName}&v=weekly`;
    script.async = true;
    script.onerror = () => reject(new Error("Falha ao carregar o Google Maps JS API"));
    document.head.appendChild(script);
  });
  window.__googleMapsLoaderPromise = loaderPromise;
  return loaderPromise;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Pov {
  heading?: number;
  pitch?: number;
}

export interface StreetViewPanoramaProps {
  position?: LatLng;
  address?: string;
  pano?: string;
  pov?: Pov;
  zoom?: number;
  radius?: number;
  linksControl?: boolean;
  zoomControl?: boolean;
  panControl?: boolean;
  clickToGo?: boolean;
  addressControl?: boolean;
  fullscreenControl?: boolean;
  motionTracking?: boolean;
  className?: string;
  onReady?: (panorama: any) => void;
  onPositionChange?: (position: any) => void;
  onPovChange?: (pov: any) => void;
  onError?: (message: string) => void;
}

export function StreetViewPanorama({
  position = { lat: -23.55052, lng: -46.633308 },
  address,
  pano,
  pov = { heading: 0, pitch: 0 },
  zoom = 1,
  radius = 50,
  linksControl = true,
  zoomControl = true,
  panControl = true,
  clickToGo = true,
  addressControl = true,
  fullscreenControl = true,
  motionTracking = false,
  className,
  onReady,
  onPositionChange,
  onPovChange,
  onError,
}: StreetViewPanoramaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panoramaRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Keep latest callbacks without re-initializing the panorama.
  const callbacksRef = useRef({ onReady, onPositionChange, onPovChange, onError });
  callbacksRef.current = { onReady, onPositionChange, onPovChange, onError };

  const fail = useCallback((message: string) => {
    setStatus("error");
    setErrorMessage(message);
    callbacksRef.current.onError?.(message);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let listeners: any[] = [];

    async function init() {
      try {
        const apiKey = BROWSER_KEY;
        if (!apiKey) {
          fail("Google Maps API key não configurada.");
          callbacksRef.current.onReady?.(null);
          return;
        }
        await loadGoogleMaps(apiKey);
        if (cancelled || !containerRef.current) return;

        // Resolve endereço em texto para coordenadas, se fornecido.
        let targetPosition = position;
        if (address && !pano) {
          const geocoder = new (window as any).google.maps.Geocoder();
          const geo = await geocoder.geocode({ address }).catch(() => null);
          if (cancelled) return;
          const loc = geo?.results?.[0]?.geometry?.location;
          if (!loc) {
            fail(`Endereço não encontrado: ${address}`);
            callbacksRef.current.onReady?.(null);
            return;
          }
          targetPosition = { lat: loc.lat(), lng: loc.lng() };
        }

        const streetViewService = new (window as any).google.maps.StreetViewService();
        const request: any =
          pano
            ? { pano }
            : {
                location: targetPosition,
                radius,
                source: (window as any).google.maps.StreetViewSource.OUTDOOR,
              };

        const { data } = await streetViewService.getPanorama(request).catch(() => ({ data: null }));
        if (cancelled || !containerRef.current) return;

        if (!data?.location?.latLng) {
          fail("Nenhum panorama do Street View encontrado para essa localização.");
          callbacksRef.current.onReady?.(null);
          return;
        }

        const panorama = new (window as any).google.maps.StreetViewPanorama(containerRef.current, {
          pano: data.location.pano ?? undefined,
          position: data.location.latLng,
          pov: { heading: pov.heading ?? 0, pitch: pov.pitch ?? 0 },
          zoom,
          linksControl,
          zoomControl,
          panControl,
          clickToGo,
          addressControl,
          fullscreenControl,
          motionTracking,
          motionTrackingControl: motionTracking,
          enableCloseButton: false,
          showRoadLabels: false,
        });

        panoramaRef.current = panorama;

        listeners = [
          panorama.addListener("position_changed", () => {
            const pos = panorama.getPosition();
            if (pos) callbacksRef.current.onPositionChange?.(pos);
          }),
          panorama.addListener("pov_changed", () => {
            callbacksRef.current.onPovChange?.(panorama.getPov());
          }),
        ];

        setStatus("ready");
        callbacksRef.current.onReady?.(panorama);
      } catch (err) {
        if (!cancelled) {
          fail(err instanceof Error ? err.message : "Erro ao inicializar o Street View.");
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      listeners.forEach((l) => l.remove());
      listeners = [];
      panoramaRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pano, address, position.lat, position.lng, radius]);

  // Reagir a mudanças de câmera sem recriar o panorama.
  useEffect(() => {
    const panorama = panoramaRef.current;
    if (!panorama) return;
    panorama.setPov({ heading: pov.heading ?? 0, pitch: pov.pitch ?? 0 });
    panorama.setZoom(zoom);
  }, [pov.heading, pov.pitch, zoom]);

  return (
    <div
      className={className}
      style={{ position: "relative", width: "100%", height: "100%", minHeight: 320 }}
      data-streetview-panorama
    >
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      {status === "loading" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            background: "oklch(0.145 0 0)",
            color: "oklch(0.985 0 0)",
            fontSize: 14,
          }}
        >
          Carregando Street View…
        </div>
      )}
      {status === "error" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            background: "oklch(0.145 0 0)",
            color: "oklch(0.7 0.19 22)",
            fontSize: 14,
            padding: 16,
            textAlign: "center",
          }}
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
}

export default StreetViewPanorama;
