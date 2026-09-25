// Mirrors frontend/src/data/japanPlaceNames.ts — kept in sync by hand since frontend and backend
// are separate npm packages with no shared module. Used here as a read-time fallback so a
// destination created before this feature existed (nameJa stored empty) still shows the right
// watermark, without needing a one-off migration over every trip in Firestore.
const JAPAN_PLACE_KANJI: Record<string, string> = {
  // Tokyo
  'tokyo': '東京', 'טוקיו': '東京',
  // Kyoto
  'kyoto': '京都', 'קיוטו': '京都',
  // Osaka
  'osaka': '大阪', 'אוסקה': '大阪', 'אוסאקה': '大阪',
  // Hiroshima
  'hiroshima': '広島', 'הירושימה': '広島',
  // Kanazawa
  'kanazawa': '金沢', 'קנאזאווה': '金沢', 'קנזאווה': '金沢',
  // Mount Fuji / Fuji Five Lakes area
  'fuji': '富士', "פוג'י": '富士', 'פוגי': '富士', 'kawaguchiko': '河口湖', 'fujikawaguchiko': '河口湖',
  // Okinawa
  'okinawa': '沖縄', 'אוקינאווה': '沖縄', 'אוקינווה': '沖縄',
  // Other major cities and popular trip stops
  'sapporo': '札幌', 'ספורו': '札幌',
  'yokohama': '横浜', 'יוקוהמה': '横浜',
  'nagoya': '名古屋', 'נגויה': '名古屋',
  'kobe': '神戸', 'קובה': '神戸',
  'nara': '奈良', 'נארה': '奈良',
  'nikko': '日光', 'ניקו': '日光',
  'hakone': '箱根', 'האקונה': '箱根',
  'fukuoka': '福岡', 'פוקואוקה': '福岡',
  'sendai': '仙台', 'סנדאי': '仙台',
  'nagasaki': '長崎', 'נגסאקי': '長崎',
  'kumamoto': '熊本', 'קומאמוטו': '熊本',
  'kagoshima': '鹿児島', 'קגושימה': '鹿児島',
  'takayama': '高山', 'טקאיאמה': '高山',
  'kamakura': '鎌倉', 'קמאקורה': '鎌倉',
  'nagano': '長野', 'נגאנו': '長野',
  'matsumoto': '松本', 'מאצומוטו': '松本',
  'beppu': '別府', 'בפו': '別府',
  'naha': '那覇', 'נאהה': '那覇',
  'ishigaki': '石垣島', 'אישיגאקי': '石垣島',
  'miyako': '宮古島', 'מיאקו': '宮古島',
  'otaru': '小樽', 'אוטארו': '小樽',
  'hakodate': '函館', 'האקודטה': '函館',
  'niseko': 'ニセコ', 'ניסקו': 'ニセコ',
  'yakushima': '屋久島', 'יאקושימה': '屋久島',
  'miyajima': '宮島', 'מיאג׳ימה': '宮島',
  'shirakawago': '白川郷', 'שיראקאווגו': '白川郷',
  'karuizawa': '軽井沢', 'קרואיזאווה': '軽井沢',
  'atami': '熱海', 'אטמי': '熱海',
  'himeji': '姫路', 'הימאג׳י': '姫路',
  'kurashiki': '倉敷', 'קוראשיקי': '倉敷',
  'matsuyama': '松山', 'מאצויאמה': '松山',
  'takamatsu': '高松', 'טקאמאצו': '高松',
  'tottori': '鳥取', 'טוטורי': '鳥取',
};

/** Looks up a known Japan place's kanji from a Hebrew or English spelling. Strips a parenthetical
 * qualifier first ("Tokyo (return)" / "טוקיו (חזרה)" -> "Tokyo" / "טוקיו"), matching how groupIdOf
 * in itinerary.ts normalizes repeat-visit names. Returns '' when the place isn't in the table. */
export function lookupJapanKanji(name: string | undefined | null): string {
  const key = (name || '').replace(/\(.*?\)/g, '').trim().toLowerCase();
  if (!key) return '';
  return JAPAN_PLACE_KANJI[key] || '';
}
