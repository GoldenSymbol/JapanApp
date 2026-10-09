// Same shape the server generates (JPN- plus four characters, no easily-confused ones like 0/O or 1/I),
// so a code proposed here passes the server's check.
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return `JPN-${code}`;
}
