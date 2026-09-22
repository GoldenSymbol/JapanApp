import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// Same fix as MapTiles.tsx's MapLibre worker import: Vite's default worker bundling for a
// prebuilt .mjs worker script drops it in production, so route it through the worker pipeline
// explicitly instead.
// @ts-ignore -- no type declarations for this Vite-specific `?worker&url` import suffix
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?worker&url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Rendering the PDF to a canvas ourselves — rather than an <iframe src=pdfUrl> relying on the
// browser's own embedded PDF viewer — is what makes fit-to-width sizing and the app's own
// pinch-zoom/pan (applied as a CSS transform on this canvas by the caller) actually work on iOS
// Safari: its iframe-embedded PDF plugin ignores fit/zoom hints and has its own inconsistent,
// hard-to-control touch handling once embedded in a page rather than opened as a full tab.
export function PdfCanvas({ url, page, onNumPages, onError }: {
  url: string; page: number; onNumPages: (n: number) => void; onError: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDoc(null);
    pdfjsLib.getDocument({ url }).promise.then((d) => {
      if (cancelled) return;
      setDoc(d);
      onNumPages(d.numPages);
    }).catch((e) => { console.error('[PdfCanvas] load error', e); if (!cancelled) onError(); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    (async () => {
      const pdfPage = await doc.getPage(page);
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container || cancelled) return;
      const unscaled = pdfPage.getViewport({ scale: 1 });
      const fitScale = container.clientWidth / unscaled.width;
      // A bit above devicePixelRatio so zooming in a little via the CSS transform above this
      // canvas still looks reasonably sharp, without re-rendering PDF.js on every zoom step.
      const renderScale = fitScale * (window.devicePixelRatio || 1) * 1.5;
      const viewport = pdfPage.getViewport({ scale: renderScale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / ((window.devicePixelRatio || 1) * 1.5)}px`;
      canvas.style.height = `${viewport.height / ((window.devicePixelRatio || 1) * 1.5)}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      try {
        await pdfPage.render({ canvasContext: ctx, viewport, canvas }).promise;
      } catch (e) {
        console.error('[PdfCanvas] render error', e);
        if (!cancelled) onError();
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, page]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <canvas ref={canvasRef} style={{ boxShadow: '0 4px 24px rgba(0,0,0,.35)', borderRadius: 4 }} />
    </div>
  );
}
