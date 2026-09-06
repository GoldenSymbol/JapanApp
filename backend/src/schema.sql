CREATE TABLE IF NOT EXISTS translations (
  id TEXT PRIMARY KEY,
  he TEXT NOT NULL,
  en TEXT NOT NULL,
  ja TEXT NOT NULL,
  romaji TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'word'
);

CREATE TABLE IF NOT EXISTS fx_rates_cache (
  base TEXT PRIMARY KEY,
  rates_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);
