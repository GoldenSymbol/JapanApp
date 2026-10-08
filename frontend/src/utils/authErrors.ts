// Firebase turns an error message it has no code for into a code made from the text (e.g. the
// server reply "The service is currently unavailable." becomes
// "auth/the-service-is-currently-unavailable." — trailing full stop included). Those are temporary
// problems on Google's side or the network, not something the user typed wrong, so they share a
// readable message instead of reaching the screen as a raw key.
const GROUPS: Record<string, string> = {
  'auth/the-service-is-currently-unavailable': 'authError.unavailable',
  'auth/internal-error': 'authError.unavailable',
  'auth/network-request-failed': 'authError.network',
};

export function authErrorText(t: (key: string) => string, rawCode: string): string {
  const code = rawCode.replace(/\.+$/, '');
  const key = GROUPS[code] ?? `authError.${code}`;
  const text = t(key);
  // t() returns the key itself when there's no translation; show the generic message rather than that.
  return text === key ? t('authError.default') : text;
}
