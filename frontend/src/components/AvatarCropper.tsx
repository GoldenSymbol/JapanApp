import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../state/LanguageContext';
import { cropToAvatarDataUrl, loadAvatarSource, type AvatarSource } from '../utils/avatarImage';

const VIEW = 280; // the crop frame, in CSS px
const MAX_ZOOM = 4;

// Lets the user place a chosen picture inside a fixed round frame: drag to move, pinch / wheel /
// slider to zoom. The picture always covers the frame, so there are never empty edges.
export function AvatarCropper({ file, onSave, onCancel, onError }: {
  file: File; onSave: (dataUrl: string) => Promise<void>; onCancel: () => void; onError: () => void;
}) {
  const { t } = useLanguage();
  const [source, setSource] = useState<AvatarSource | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loaded: AvatarSource | null = null;
    loadAvatarSource(file)
      .then((s) => { loaded = s; if (cancelled) URL.revokeObjectURL(s.url); else setSource(s); })
      .catch(() => { if (!cancelled) onError(); });
    return () => { cancelled = true; if (loaded) URL.revokeObjectURL(loaded.url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Scale at which the picture just covers the frame; `zoom` multiplies it.
  const base = source ? VIEW / Math.min(source.width, source.height) : 1;
  const scale = base * zoom;
  const clampOffset = (o: { x: number; y: number }, z: number) => {
    if (!source) return o;
    const maxX = Math.max(0, (source.width * base * z - VIEW) / 2);
    const maxY = Math.max(0, (source.height * base * z - VIEW) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) };
  };
  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(1, z));

  // Zooming out can leave the picture off-centre past its new edges.
  useEffect(() => { setOffset((o) => clampOffset(o, zoom)); }, [zoom, source]);

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size === 1) {
      setOffset((o) => clampOffset({ x: o.x + cur.x - prev.x, y: o.y + cur.y - prev.y }, zoom));
    } else if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      setZoom(clampZoom(pinch.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.dist)));
    }
  }
  function onPointerEnd(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    pinch.current = null;
  }

  async function save() {
    if (!source || saving) return;
    setSaving(true);
    try {
      const side = VIEW / scale; // frame size in source pixels
      const o = clampOffset(offset, zoom);
      const sx = Math.min(source.width - side, Math.max(0, source.width / 2 - o.x / scale - side / 2));
      const sy = Math.min(source.height - side, Math.max(0, source.height / 2 - o.y / scale - side / 2));
      await onSave(cropToAvatarDataUrl(source, sx, sy, side));
    } catch {
      onError();
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(10,11,13,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 340, background: 'var(--bg)', borderRadius: 22, padding: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
        <div style={{ font: "600 17px 'Noto Sans Hebrew',sans-serif" }}>{t('settings.cropTitle')}</div>
        <div style={{ font: "400 12px/1.5 'Noto Sans Hebrew',sans-serif", color: 'var(--text-dim)', margin: '4px 0 14px' }}>{t('settings.cropHint')}</div>

        <div dir="ltr" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}
          onWheel={(e) => setZoom((z) => clampZoom(z * (e.deltaY < 0 ? 1.08 : 1 / 1.08)))}
          style={{ position: 'relative', width: VIEW, height: VIEW, margin: '0 auto', overflow: 'hidden', borderRadius: 16, background: '#000', touchAction: 'none', cursor: 'grab', userSelect: 'none' }}>
          {source && (
            <img src={source.url} alt="" draggable={false}
              style={{ position: 'absolute', left: '50%', top: '50%', maxWidth: 'none', pointerEvents: 'none',
                width: source.width * scale, height: source.height * scale,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }} />
          )}
          {/* The circle that will actually be kept; everything outside it is dimmed. */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: '0 0 0 400px rgba(10,11,13,0.6)', border: '2px solid rgba(255,255,255,0.85)', pointerEvents: 'none' }} />
        </div>

        <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label={t('settings.cropZoom')}
          style={{ width: '100%', margin: '16px 0 4px', accentColor: 'var(--accent)' }} />

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <div className="btn btn-accent" style={{ flex: 1, textAlign: 'center', opacity: !source || saving ? 0.6 : 1 }} onClick={save}>{t('common.save')}</div>
          <div className="btn btn-outline" style={{ flex: 1, textAlign: 'center' }} onClick={onCancel}>{t('common.cancel')}</div>
        </div>
      </div>
    </div>
  );
}
