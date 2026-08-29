import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db.js";

const DEST_SEED = [
  { nameHe: "טוקיו", nameEn: "Tokyo", nameJa: "東京", start: "2027-04-01", end: "2027-04-06", transport: "flight", colorKey: "#1F2328", lat: 35.6812, lng: 139.7671, teaser: "נחיתה, התאקלמות ופריחת דובדבן בשיאה." },
  { nameHe: "קנאזאווה", nameEn: "Kanazawa", nameJa: "金沢", start: "2027-04-07", end: "2027-04-08", transport: "train", colorKey: "#243030", lat: 36.5613, lng: 136.6562, teaser: "גנים, רובע גיישות משומר ושוק דגים." },
  { nameHe: "קיוטו", nameEn: "Kyoto", nameJa: "京都", start: "2027-04-09", end: "2027-04-13", transport: "train", colorKey: "#2A2320", lat: 35.0116, lng: 135.7681, teaser: "מקדשים, גיון וטיול צד לנארה." },
  { nameHe: "אוסקה", nameEn: "Osaka", nameJa: "大阪", start: "2027-04-14", end: "2027-04-16", transport: "train", colorKey: "#2B2429", lat: 34.6937, lng: 135.5023, teaser: "אוכל רחוב, ניאון ובסיס נוח לדרום." },
  { nameHe: "הירושימה", nameEn: "Hiroshima", nameJa: "広島", start: "2027-04-17", end: "2027-04-18", transport: "train", colorKey: "#232B30", lat: 34.3853, lng: 132.4553, teaser: "פארק השלום ומיאג׳ימה." },
  { nameHe: "פוג'י", nameEn: "Fuji", nameJa: "富士", start: "2027-04-19", end: "2027-04-20", transport: "train", colorKey: "#20272E", lat: 35.5, lng: 138.7667, teaser: "קוואגוצ׳יקו, אונסן ונוף להר." },
  { nameHe: "אוקינאווה", nameEn: "Okinawa", nameJa: "沖縄", start: "2027-04-21", end: "2027-04-28", transport: "flight", colorKey: "#1E2C2C", lat: 26.2124, lng: 127.6809, teaser: "שבוע חופים, שנורקלינג ותרבות ריוקיו." },
  { nameHe: "טוקיו (חזרה)", nameEn: "Tokyo (return)", nameJa: "東京", start: "2027-04-29", end: "2027-05-02", transport: "flight", colorKey: "#1F2328", lat: 35.6812, lng: 139.7671, teaser: "סגירה: קניות, מוזיאונים וטיסה הביתה." },
];

type SpotSeed = { nameHe: string; nameEn: string; tag: string; duration: string; day?: string; hour?: string; note?: string };

const ATTRACTIONS_SEED: Record<string, SpotSeed[]> = {
  "טוקיו": [
    { nameHe: "מקדש סנסו-ג'י, אסאקוסה", nameEn: "Sensō-ji", tag: "temple", duration: "2–3 שעות", day: "2027-04-02", hour: "08:00", note: "להגיע לפני 8:00 כשהשדרה עוד ריקה." },
    { nameHe: "פארק אואנו", nameEn: "Ueno Park", tag: "park", duration: "חצי יום", day: "2027-04-02", hour: "13:00", note: "שיא הפריחה בטוקיו בדרך כלל סוף מרץ–תחילת אפריל." },
    { nameHe: "שיבויה והצומת", nameEn: "Shibuya", tag: "street", duration: "ערב", note: "תצפית מהקומות העליונות בשקיעה." },
    { nameHe: "שוק צוקיג'י החיצוני", nameEn: "Tsukiji Outer Market", tag: "food", duration: "שעתיים", note: "ארוחת בוקר. סוגר מוקדם, לא להגיע אחרי 13:00." },
  ],
  "קנאזאווה": [
    { nameHe: "גן קנרוקו-אן", nameEn: "Kenroku-en", tag: "park", duration: "2 שעות", note: "אחד משלושת הגנים הגדולים ביפן." },
    { nameHe: "היגאשי צ'איה", nameEn: "Higashi Chaya", tag: "street", duration: "שעתיים", note: "רובע בתי התה, יפה במיוחד בבוקר מוקדם." },
    { nameHe: "שוק אומיצ'ו", nameEn: "Ōmichō Market", tag: "food", duration: "שעה", note: "קאיסֶנדון — קערת דגים נא לצהריים." },
    { nameHe: "טירת קנאזאווה", nameEn: "Kanazawa Castle", tag: "attraction", duration: "שעה", note: "צמוד לקנרוקו-אן, אפשר לשלב." },
  ],
  "קיוטו": [
    { nameHe: "פושימי אינארי", nameEn: "Fushimi Inari", tag: "temple", duration: "3 שעות", day: "2027-04-11", hour: "06:00", note: "לעלות ב-6:00 — אחרי 9:00 המסלול עמוס." },
    { nameHe: "ארשיאמה ויער הבמבוק", nameEn: "Arashiyama", tag: "park", duration: "חצי יום", day: "2027-04-11", hour: "12:00", note: "לשלב עם גשר טוגטסוקיו וקופי איוואטמה." },
    { nameHe: "קינקאקו-ג'י", nameEn: "Kinkaku-ji", tag: "temple", duration: "שעה", day: "2027-04-12", hour: "10:00", note: "הביקור קצר, לשלב עם ריואן-ג'י." },
    { nameHe: "נארה", nameEn: "Nara", tag: "attraction", duration: "יום", note: "45 דק׳ ברכבת. איילים וטודאי-ג'י." },
  ],
  "אוסקה": [
    { nameHe: "דוטומבורי", nameEn: "Dōtonbori", tag: "street", duration: "ערב", note: "טאקויאקי ואוקונומייאקי, הכי טוב אחרי חשכה." },
    { nameHe: "טירת אוסקה", nameEn: "Osaka Castle", tag: "attraction", duration: "3 שעות", note: "הפארק סביב הטירה מלא דובדבן." },
    { nameHe: "שוק קורומון", nameEn: "Kuromon Market", tag: "food", duration: "שעה", note: "ארוחת בוקר מאולתרת בין הדוכנים." },
    { nameHe: "שינסקאי", nameEn: "Shinsekai", tag: "food", duration: "ערב", note: "קושיקאטסו — שיפודים מטוגנים." },
  ],
  "הירושימה": [
    { nameHe: "פארק זיכרון השלום", nameEn: "Peace Memorial Park", tag: "attraction", duration: "3 שעות", note: "להקדיש זמן למוזיאון עצמו." },
    { nameHe: "מיאג'ימה והטורי הצף", nameEn: "Miyajima", tag: "temple", duration: "יום", note: "מעבורת קצרה. לבדוק שעות גאות לפני שיוצאים." },
    { nameHe: "אוקונומייאקי בסגנון הירושימה", nameEn: "Okonomimura", tag: "food", duration: "שעה", note: "שכבות אטריות — שונה מגרסת אוסקה." },
  ],
  "פוג'י": [
    { nameHe: "אגם קוואגוצ'יקו", nameEn: "Lake Kawaguchiko", tag: "park", duration: "חצי יום", note: "ההר מתגלה בעיקר בבוקר מוקדם." },
    { nameHe: "פגודת צ'וריטו", nameEn: "Chūreitō Pagoda", tag: "temple", duration: "שעתיים", note: "400 מדרגות. הצילום הקלאסי של יפן." },
    { nameHe: "ריוקן עם אונסן", nameEn: "Ryokan onsen", tag: "attraction", duration: "לילה", note: "להזמין הרבה מראש — נגמר מהר באביב." },
  ],
  "אוקינאווה": [
    { nameHe: "אקווריום צ'וראומי", nameEn: "Churaumi Aquarium", tag: "attraction", duration: "חצי יום", note: "להגיע בפתיחה, לפני הקבוצות." },
    { nameHe: "איי קראמה", nameEn: "Kerama Islands", tag: "park", duration: "יום", note: "מעבורת מנאהה. המים הכי צלולים באזור." },
    { nameHe: "טירת שורי, נאהה", nameEn: "Shuri Castle", tag: "attraction", duration: "שעתיים", note: "חלקים עדיין בשיקום אחרי השריפה." },
    { nameHe: "חופי אונה", nameEn: "Onna coast", tag: "park", duration: "ימים", note: "הבסיס הנוח ביותר לשהייה ארוכה." },
  ],
  "טוקיו (חזרה)": [
    { nameHe: "teamLab", nameEn: "teamLab", tag: "attraction", duration: "3 שעות", note: "כרטיסים נגמרים שבועות מראש." },
    { nameHe: "הרג'וקו ואומוטסאנדו", nameEn: "Harajuku", tag: "street", duration: "חצי יום", note: "לשלב עם מקדש מייג'י הסמוך." },
    { nameHe: "יאנאקה", nameEn: "Yanaka", tag: "street", duration: "שעתיים", note: "טוקיו שקטה וישנה, כמעט בלי תיירים." },
    { nameHe: "גינזה", nameEn: "Ginza", tag: "street", duration: "ערב אחרון", note: "שימו לב: שבוע הזהב מתחיל 29/04 — הכול עמוס." },
  ],
};

const COORDS: Record<string, [number, number]> = {
  "Sensō-ji": [35.7148, 139.7967],
  "Ueno Park": [35.7148, 139.7737],
  "Shibuya": [35.6595, 139.7005],
  "Tsukiji Outer Market": [35.6654, 139.7707],
  "teamLab": [35.6595, 139.741],
  "Harajuku": [35.6702, 139.7027],
  "Yanaka": [35.7276, 139.7666],
  "Ginza": [35.6717, 139.765],
  "Kenroku-en": [36.5622, 136.6624],
  "Higashi Chaya": [36.5721, 136.6667],
  "Ōmichō Market": [36.5716, 136.6567],
  "Kanazawa Castle": [36.5654, 136.6592],
  "Fushimi Inari": [34.9671, 135.7727],
  "Arashiyama": [35.0094, 135.6668],
  "Kinkaku-ji": [35.0394, 135.7292],
  "Nara": [34.6851, 135.8048],
  "Dōtonbori": [34.6687, 135.5013],
  "Osaka Castle": [34.6873, 135.5259],
  "Kuromon Market": [34.6653, 135.5061],
  "Shinsekai": [34.6524, 135.5062],
  "Peace Memorial Park": [34.3955, 132.4536],
  "Miyajima": [34.2959, 132.3199],
  "Okonomimura": [34.3924, 132.461],
  "Lake Kawaguchiko": [35.5171, 138.7519],
  "Chūreitō Pagoda": [35.5008, 138.8],
  "Ryokan onsen": [35.51, 138.76],
  "Churaumi Aquarium": [26.694, 127.878],
  "Kerama Islands": [26.2, 127.3],
  "Shuri Castle": [26.217, 127.719],
  "Onna coast": [26.5, 127.85],
};

const BUDGET_SEED = [
  { name: "טיסות", planned: 12000, spent: 12000, note: "כולל טיסה פנימית לאוקינאווה" },
  { name: "לינה", planned: 14500, spent: 6300, note: "מקדמות · מתוכנן ₪14,500" },
  { name: "אוכל", planned: 8000, spent: 0, note: "מתוכנן ₪8,000 · ₪250 ליום" },
  { name: "רכבות ותחבורה", planned: 4200, spent: 0, note: "מתוכנן ₪4,200 · JR Pass + כרטיסים" },
  { name: "אטרקציות", planned: 3000, spent: 0, note: "מתוכנן ₪3,000" },
  { name: "שונות", planned: 3300, spent: 0, note: "מתוכנן ₪3,300" },
];

const TRANSLATION_WORDS: [string, string, string, string][] = [
  ["שלום", "hello", "こんにちは", "konnichiwa"],
  ["בוקר טוב", "good morning", "おはようございます", "ohayō gozaimasu"],
  ["כן", "yes", "はい", "hai"],
  ["לא", "no", "いいえ", "iie"],
  ["תחנה", "station", "駅", "eki"],
  ["רכבת", "train", "電車", "densha"],
  ["מקדש", "temple", "寺", "tera"],
  ["מסעדה", "restaurant", "レストラン", "resutoran"],
  ["מים", "water", "水", "mizu"],
  ["חשבון", "the bill", "お会計", "okaikei"],
  ["מלון", "hotel", "ホテル", "hoteru"],
  ["כמה", "how much", "いくら", "ikura"],
  ["איפה", "where", "どこ", "doko"],
  ["טעים", "delicious", "おいしい", "oishii"],
  ["ימינה", "right", "右", "migi"],
  ["שמאלה", "left", "左", "hidari"],
];

const TRANSLATION_PHRASES: [string, string, string, string][] = [
  ["סליחה", "Excuse me", "すみません", "sumimasen"],
  ["תודה רבה", "Thank you very much", "ありがとうございます", "arigatō gozaimasu"],
  ["כמה זה עולה?", "How much is it?", "いくらですか", "ikura desu ka"],
  ["איפה התחנה?", "Where is the station?", "駅はどこですか", "eki wa doko desu ka"],
  ["אני לא אוכל בשר", "I do not eat meat", "肉は食べません", "niku wa tabemasen"],
  ["יש תפריט באנגלית?", "Is there an English menu?", "英語のメニューはありますか", "eigo no menyū wa arimasu ka"],
  ["אפשר לשלם בכרטיס?", "Can I pay by card?", "カードで払えますか", "kādo de haraemasu ka"],
  ["עזרה, בבקשה", "Help, please", "助けてください", "tasukete kudasai"],
  ["איפה השירותים?", "Where is the toilet?", "トイレはどこですか", "toire wa doko desu ka"],
  ["אני מחפש את המקדש", "I am looking for the temple", "お寺を探しています", "otera o sagashite imasu"],
];

export function runSeed() {
  const userCount = (db.prepare("SELECT COUNT(*) c FROM users").get() as any).c;
  if (userCount === 0) {
    const hash = bcrypt.hashSync("japan2027", 10);
    const uriId = randomUUID();
    const partnerId = randomUUID();
    db.prepare(`INSERT INTO users (id, name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?)`).run(uriId, "אורי", "uri@example.com", hash, "#D9564B");
    db.prepare(`INSERT INTO users (id, name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?)`).run(partnerId, "בת הזוג", "partner@example.com", hash, "#7FB069");

    const tripId = randomUUID();
    db.prepare(`INSERT INTO trips (id, name, code, owner_id, budget_total) VALUES (?, ?, ?, ?, ?)`).run(tripId, "יפן 2027", "JPN-4K2Q", uriId, 45000);
    db.prepare(`INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, 'owner')`).run(tripId, uriId);
    db.prepare(`INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, 'member')`).run(tripId, partnerId);

    const destIds: Record<string, string> = {};
    DEST_SEED.forEach((d, i) => {
      const id = randomUUID();
      destIds[d.nameHe] = id;
      db.prepare(
        `INSERT INTO destinations (id, trip_id, order_index, name_he, name_en, name_ja, start_date, end_date, transport_in, color_key, lat, lng, teaser)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, tripId, i, d.nameHe, d.nameEn, d.nameJa, d.start, d.end, d.transport, d.colorKey, d.lat, d.lng, d.teaser);
    });

    for (const [cityHe, spots] of Object.entries(ATTRACTIONS_SEED)) {
      const destId = destIds[cityHe];
      spots.forEach((s, i) => {
        const coords = COORDS[s.nameEn];
        db.prepare(
          `INSERT INTO attractions (id, destination_id, order_index, name_he, name_en, tag, duration, day, hour, note, lat, lng, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(randomUUID(), destId, i, s.nameHe, s.nameEn, s.tag, s.duration, s.day || null, s.hour || null, s.note || null, coords?.[0] ?? null, coords?.[1] ?? null, uriId);
      });
    }

    BUDGET_SEED.forEach((b, i) => {
      const catId = randomUUID();
      db.prepare(`INSERT INTO budget_categories (id, trip_id, order_index, name, planned_amount, note) VALUES (?, ?, ?, ?, ?, ?)`).run(
        catId, tripId, i, b.name, b.planned, b.note || null
      );
      if (b.spent) {
        db.prepare(`INSERT INTO budget_transactions (id, category_id, amount, note) VALUES (?, ?, ?, ?)`).run(randomUUID(), catId, b.spent, "הוצאה ראשונית");
      }
    });
  }

  const translationCount = (db.prepare("SELECT COUNT(*) c FROM translations").get() as any).c;
  if (translationCount === 0) {
    const insert = db.prepare(`INSERT INTO translations (id, he, en, ja, romaji, kind) VALUES (?, ?, ?, ?, ?, ?)`);
    for (const [he, en, ja, romaji] of TRANSLATION_PHRASES) insert.run(randomUUID(), he, en, ja, romaji, "phrase");
    for (const [he, en, ja, romaji] of TRANSLATION_WORDS) insert.run(randomUUID(), he, en, ja, romaji, "word");
  }
}
