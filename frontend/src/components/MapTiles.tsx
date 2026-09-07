import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { MaplibreGL } from 'leaflet';
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import { setWorkerUrl, type Map as MaplibreMap } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

// Vite's default `?url` import of MapLibre's worker script emits it without its
// sibling shared chunk, so the worker fails on its first import in production builds
// — style/tile parsing (which runs on that worker) then just hangs forever with no
// error at all. `?worker&url` routes it through Vite's worker pipeline instead,
// producing a self-contained chunk that actually works. Must run before any Map is created.
setWorkerUrl(maplibreWorkerUrl);

const STYLE_URL = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

// Force every place/road/POI label to English/Latin script, falling back to the
// local name only when no Latin variant exists in the source data.
const ENGLISH_TEXT_FIELD = ['coalesce', ['get', 'name_en'], ['get', 'name:latin'], ['get', 'name']];

function applyEnglishLabels(glMap: MaplibreMap) {
  const style = glMap.getStyle();
  if (!style) return;
  for (const layer of style.layers) {
    if (layer.type !== 'symbol') continue;
    const textField = (layer.layout as Record<string, unknown> | undefined)?.['text-field'];
    if (!textField || !JSON.stringify(textField).includes('name')) continue;
    glMap.setLayoutProperty(layer.id, 'text-field', ENGLISH_TEXT_FIELD as unknown as string);
  }
}

export function MapTiles({ dark }: { dark: boolean }) {
  const map = useMap();
  const layerRef = useRef<MaplibreGL | null>(null);

  useEffect(() => {
    const layer = maplibreGL({ style: dark ? STYLE_URL.dark : STYLE_URL.light }).addTo(map);
    layerRef.current = layer;
    const glMap = layer.getMaplibreMap();
    glMap.once('load', () => applyEnglishLabels(glMap));

    // On some mobile browsers the Leaflet container's final pixel size isn't settled yet
    // when the WebGL canvas is first created (e.g. dynamic viewport units resolving late),
    // leaving the map blank until something forces a resize. A couple of follow-up resizes
    // on the next frames are cheap and fix that without waiting on user interaction.
    let cancelled = false;
    const raf1 = requestAnimationFrame(() => {
      if (cancelled) return;
      map.invalidateSize();
      glMap.resize();
      requestAnimationFrame(() => { if (!cancelled) glMap.resize(); });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      map.removeLayer(layer);
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, dark]);

  return null;
}
