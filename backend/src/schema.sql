CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#B23A32',
  photo_url TEXT,
  dark_mode INTEGER NOT NULL DEFAULT 1,
  palette TEXT NOT NULL DEFAULT 'paper',
  ui_lang TEXT NOT NULL DEFAULT 'he',
  base_currency TEXT NOT NULL DEFAULT 'ILS',
  pref_agent_tips INTEGER NOT NULL DEFAULT 1,
  pref_weather INTEGER NOT NULL DEFAULT 1,
  pref_offline_save INTEGER NOT NULL DEFAULT 0,
  pref_auto_sync INTEGER NOT NULL DEFAULT 1,
  notif_new_attraction INTEGER NOT NULL DEFAULT 1,
  notif_new_destination INTEGER NOT NULL DEFAULT 1,
  notif_reschedule INTEGER NOT NULL DEFAULT 1,
  notif_new_expense INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL REFERENCES users(id),
  budget_total REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trip_members (
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (trip_id, user_id)
);

CREATE TABLE IF NOT EXISTS destinations (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  name_he TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_ja TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  transport_in TEXT NOT NULL DEFAULT 'train',
  color_key TEXT NOT NULL DEFAULT 'stone',
  lat REAL,
  lng REAL,
  teaser TEXT
);

CREATE TABLE IF NOT EXISTS attractions (
  id TEXT PRIMARY KEY,
  destination_id TEXT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  name_he TEXT NOT NULL,
  name_en TEXT,
  tag TEXT NOT NULL DEFAULT 'attraction',
  duration TEXT,
  day TEXT,
  hour TEXT,
  note TEXT,
  lat REAL,
  lng REAL,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attraction_marks (
  attraction_id TEXT NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'none',
  PRIMARY KEY (attraction_id, user_id)
);

CREATE TABLE IF NOT EXISTS budget_categories (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  planned_amount REAL NOT NULL DEFAULT 0,
  note TEXT
);

CREATE TABLE IF NOT EXISTS budget_transactions (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES budget_categories(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  card_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  target_screen TEXT,
  target_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notification_reads (
  notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (notification_id, user_id)
);

CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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
