const SIZE = 256;
const MAX_CHARS = 70_000;

// Centre-crops a chosen picture to a square, shrinks it to SIZE px and returns it as a JPEG data URL
// small enough for the server to accept. Throws if the browser can't decode the file (e.g. HEIC
// outside Safari). createImageBitmap applies the photo's EXIF rotation, so phone photos come out upright.
export async function fileToAvatarDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no_canvas');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    const url = canvas.toDataURL('image/jpeg', quality);
    if (url.length <= MAX_CHARS) return url;
  }
  throw new Error('too_large');
}
