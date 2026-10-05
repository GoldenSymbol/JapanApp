const OUTPUT_SIZE = 256;
const MAX_OUTPUT_CHARS = 70_000;
// Whatever picture is chosen is first redrawn no larger than this, so an enormous photo costs the
// same to crop as a normal one. It's far above the size the crop is finally shrunk to.
const MAX_SOURCE_SIDE = 2000;

export interface AvatarSource {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  // An object URL of the (possibly shrunk) picture, for showing it while the user positions the crop.
  url: string;
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  try {
    // Applies the photo's EXIF rotation, so phone pictures come out upright.
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  } catch {
    // Some formats createImageBitmap refuses (e.g. SVG) still load as an ordinary <img>.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

// Throws if the browser can't decode the file at all (HEIC outside Safari, a non-image, a corrupt file).
export async function loadAvatarSource(file: File): Promise<AvatarSource> {
  const decoded = await decode(file);
  if (!decoded.width || !decoded.height) throw new Error('unreadable');
  const scale = Math.min(1, MAX_SOURCE_SIDE / Math.max(decoded.width, decoded.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(decoded.width * scale));
  canvas.height = Math.max(1, Math.round(decoded.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no_canvas');
  ctx.fillStyle = '#fff'; // transparent PNGs would otherwise turn black as a JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
  decoded.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  if (!blob) throw new Error('unreadable');
  return { canvas, width: canvas.width, height: canvas.height, url: URL.createObjectURL(blob) };
}

// Crops the square `side` x `side` region of the source whose top-left is (sx, sy) (source pixels)
// and returns it as a small JPEG data URL, shrunk in quality until it fits what the server accepts.
export function cropToAvatarDataUrl(source: AvatarSource, sx: number, sy: number, side: number): string {
  const out = document.createElement('canvas');
  out.width = OUTPUT_SIZE;
  out.height = OUTPUT_SIZE;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('no_canvas');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  ctx.drawImage(source.canvas, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    const url = out.toDataURL('image/jpeg', quality);
    if (url.length <= MAX_OUTPUT_CHARS) return url;
  }
  throw new Error('too_large');
}
