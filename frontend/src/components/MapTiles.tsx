import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { MaplibreGL } from 'leaflet';
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import type { Map as MaplibreMap } from 'maplibre-gl';

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
    return () => {
      map.removeLayer(layer);
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, dark]);

  return null;
}
