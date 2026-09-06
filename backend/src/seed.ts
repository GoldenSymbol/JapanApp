import { randomUUID } from "node:crypto";
import { db } from "./db.js";

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
  const translationCount = (db.prepare("SELECT COUNT(*) c FROM translations").get() as any).c;
  if (translationCount === 0) {
    const insert = db.prepare(`INSERT INTO translations (id, he, en, ja, romaji, kind) VALUES (?, ?, ?, ?, ?, ?)`);
    for (const [he, en, ja, romaji] of TRANSLATION_PHRASES) insert.run(randomUUID(), he, en, ja, romaji, "phrase");
    for (const [he, en, ja, romaji] of TRANSLATION_WORDS) insert.run(randomUUID(), he, en, ja, romaji, "word");
  }
}
