import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export function FitBounds({ points, padding = 0.25 }: { points: [number, number][]; padding?: number }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds.pad(padding));
  }, [JSON.stringify(points)]);
  return null;
}

// className:'leaflet-ltr-icon' is set on every icon below (styled in styles.css) because this app
// is RTL (Hebrew UI). The `direction` that determines a positioned element's static position comes
// from its *containing block* (the wrapper div Leaflet itself creates for the icon), not from a
// `direction` set on our own inner content — so the fix has to reach that outer wrapper via
// className, not via an inline style on the html we pass in. Without it, RTL flow shifts every
// marker's un-transformed starting position by its own width before our translate(-50%,-50%) even
// applies, throwing every pin off its true geographic point by that amount.

export function dotIcon(opts: { label?: string; bg: string; border: string; color?: string; size?: number }) {
  const size = opts.size || 22;
  return L.divIcon({
    className: 'leaflet-ltr-icon',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${opts.bg};border:2px solid ${opts.border};display:flex;align-items:center;justify-content:center;font:600 ${Math.round(size * 0.5)}px 'Noto Sans Hebrew',sans-serif;color:${opts.color || '#fff'};box-shadow:0 2px 6px rgba(0,0,0,.35)">${opts.label || ''}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function pinIcon(opts: { name: string; dotBg: string; dotBorder: string; dotText?: string; size?: number; dark: boolean }) {
  const size = opts.size || 22;
  return L.divIcon({
    className: 'leaflet-ltr-icon',
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;transform:translate(-50%,-50%)">
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:${opts.dotBg};border:2px solid ${opts.dotBorder};display:flex;align-items:center;justify-content:center;font:600 ${Math.round(size * 0.5)}px 'Noto Sans Hebrew',sans-serif;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.35)">${opts.dotText || ''}</div>
        <div style="position:absolute;top:100%;left:50%;transform:translateX(-50%);margin-top:4px;white-space:nowrap;background:${opts.dark ? 'rgba(20,22,26,.75)' : 'rgba(255,255,255,.92)'};color:${opts.dark ? '#F6F4EF' : '#14161A'};font:600 11px 'Noto Sans Hebrew',sans-serif;padding:2px 8px;border-radius:999px">${opts.name}</div>
      </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export function labelIcon(text: string, dark: boolean) {
  return L.divIcon({
    className: 'leaflet-ltr-icon',
    html: `<div style="white-space:nowrap;background:${dark ? 'rgba(20,22,26,.75)' : 'rgba(255,255,255,.9)'};color:${dark ? '#F6F4EF' : '#14161A'};font:600 11px 'Noto Sans Hebrew',sans-serif;padding:2px 7px;border-radius:999px;transform:translateY(16px)">${text}</div>`,
    iconSize: [0, 0],
    iconAnchor: [-8, 0],
  });
}
