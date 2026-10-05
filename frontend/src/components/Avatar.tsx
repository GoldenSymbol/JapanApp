// A member's picture if they've uploaded one, otherwise their colour with the first letter of
// their name. `fontSize` is for the letter fallback only.
export function Avatar({ name, color, photoUrl, size, fontSize }: {
  name: string; color: string; photoUrl?: string | null; size: number; fontSize: number;
}) {
  return (
    <div style={{ width: size, height: size, flex: 'none', borderRadius: '50%', overflow: 'hidden', background: color,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: `600 ${fontSize}px 'Noto Sans Hebrew',sans-serif`, color: '#14161A' }}>
      {photoUrl
        ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : name.charAt(0)}
    </div>
  );
}
