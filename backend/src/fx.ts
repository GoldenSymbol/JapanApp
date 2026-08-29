import { db } from "./db.js";

const CACHE_MS = 60 * 60 * 1000; // 1 hour
const CURRENCIES = ["ILS", "JPY", "USD", "EUR"];

// Static fallback rates (approximate, relative to 1 USD) used only if the
// live FX API is unreachable (e.g. no outbound network in this environment).
const FALLBACK_USD_RATES: Record<string, number> = { USD: 1, ILS: 1 / 0.27, JPY: 1 / 0.0064, EUR: 1 / 1.09 };

async function fetchLiveRates(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${CURRENCIES.filter((c) => c !== "USD").join(",")}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { rates: Record<string, number> };
    return { USD: 1, ...data.rates };
  } catch {
    return null;
  }
}

export async function getUsdRates(): Promise<{ rates: Record<string, number>; live: boolean; fetchedAt: string }> {
  const cached = db.prepare("SELECT * FROM fx_rates_cache WHERE base = 'USD'").get() as any;
  const fresh = cached && Date.now() - new Date(cached.fetched_at).getTime() < CACHE_MS;
  if (fresh) {
    return { rates: JSON.parse(cached.rates_json), live: true, fetchedAt: cached.fetched_at };
  }
  const live = await fetchLiveRates();
  if (live) {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO fx_rates_cache (base, rates_json, fetched_at) VALUES ('USD', ?, ?)
       ON CONFLICT(base) DO UPDATE SET rates_json = excluded.rates_json, fetched_at = excluded.fetched_at`
    ).run(JSON.stringify(live), now);
    return { rates: live, live: true, fetchedAt: now };
  }
  if (cached) {
    return { rates: JSON.parse(cached.rates_json), live: false, fetchedAt: cached.fetched_at };
  }
  return { rates: FALLBACK_USD_RATES, live: false, fetchedAt: new Date().toISOString() };
}

export async function convert(amount: number, from: string, to: string) {
  if (from === to) return amount;
  const { rates } = await getUsdRates();
  const usd = amount / (rates[from] ?? 1);
  return usd * (rates[to] ?? 1);
}
