const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

// Free, keyless geocoding via OpenStreetMap's Nominatim — same data source as the app's map
// tiles. Biased to Japan since every destination in this app is a Japan trip stop. `cityHint`
// narrows the search for a point of interest that shares its name with places elsewhere (e.g. an
// attraction) by including its parent city/destination name in the query.
export async function geocodePlace(name: string, cityHint?: string): Promise<{ lat: number; lng: number } | null> {
  const query = name?.trim();
  if (!query) return null;
  try {
    const url = new URL(NOMINATIM_URL);
    const q = cityHint?.trim() ? `${query}, ${cityHint.trim()}, Japan` : `${query}, Japan`;
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    const res = await fetch(url, {
      headers: { "User-Agent": "JapanTrip2027Planner/1.0 (personal travel-planning app)" },
    });
    if (!res.ok) return null;
    const results = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!results.length) return null;
    const lat = parseFloat(results[0].lat);
    const lng = parseFloat(results[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
