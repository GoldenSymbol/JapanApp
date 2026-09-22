// Terms of Service and Privacy Policy content for MichiPlan.
//
// DRAFT STATUS: this text was written by grounding every factual claim in what the codebase
// actually does (auth provider, database, third-party requests, what's collected, what isn't
// implemented). It has NOT been reviewed by a lawyer and is not a substitute for one.
//
// Operator identity, audience, and contact address were confirmed directly by the operator
// (2026-09-18: private individual, Niv Chordeker; Israel-only audience; neevch19@gmail.com for
// both support and privacy inquiries) and are filled in below — no longer placeholders.
//
// What's still open blocks publishing these documents to real users beyond the private trip
// group they were built for. Every remaining open item is tracked in ONE place —
// PUBLICATION_BLOCKERS below — rather than repeated inline; sections that depend on one just
// point back to it with a short ⟦REVIEW: ...⟧ marker instead of restating it.
//
// Version numbers: bump TERMS_VERSION only for a substantive change to the terms themselves (new
// obligations, new data use, a scope change) — never for a typo fix. Bumping it re-triggers the
// acceptance gate for every user, including ones who already accepted an earlier version (see
// backend/src/legal.ts, which must be kept in sync with this value, and RequireAuth in App.tsx).
// Bumped to 1.1 here since filling in the operator's identity and governing law is a substantive
// change to what users are actually agreeing to — done now, before this was shown to any real
// user (only test accounts had accepted 1.0, since removed).
// PRIVACY_VERSION is tracked separately and does NOT gate anything by itself — the Privacy Policy
// is a disclosure, not a consent mechanism (see its own note in App.tsx / Signup.tsx).
//
// Both languages carry the exact same content — the English text is a faithful translation of the
// Hebrew, not a separate/lighter document. Consent recorded server-side (see backend/src/legal.ts)
// tracks acceptance of a *version*, not a language, so a user who reads the English version and one
// who reads the Hebrew version are agreeing to the same terms.

import type { Lang } from '../i18n/translations';

export interface LegalSection {
  heading: string;
  body: string[];
}

// Single source of truth for what's still missing before these documents can be published to
// real users. Referenced by ⟦REVIEW: ...⟧ markers inline below instead of duplicating the
// explanation in every section that touches it.
export const PUBLICATION_BLOCKERS: Record<Lang, string[]> = {
  he: [
    'תהליך מחיקת חשבון מלא: אין כיום דרך עצמאית למחוק חשבון ומידע (רק יציאה מטיול), ואין תהליך מוגדר — ולו ידני — למחיקה לפי בקשה. נדרשת החלטה ותיאור בתנאי השימוש (סעיף 8) ובמדיניות הפרטיות (סעיף 6).',
    'הגבלת גיל / פרטיות קטינים: לא הוגדר גיל מינימלי לשימוש באפליקציה ואין מנגנון לאימות גיל. נדרשת החלטה ועדכון בתנאי השימוש ובמדיניות הפרטיות (סעיף 9).',
  ],
  en: [
    "Full account deletion process: there is currently no self-service way to delete an account and its data (only leaving a trip), and no defined process — even a manual one — for deletion on request. A decision and a description are needed in the Terms of Service (Section 8) and the Privacy Policy (Section 6).",
    "Age restriction / children's privacy: no minimum age for using the app has been set, and there's no age-verification mechanism. A decision and an update are needed in the Terms of Service and the Privacy Policy (Section 9).",
  ],
};

export const TERMS_VERSION = '1.1';
export const TERMS_UPDATED = '2026-09-18';

export const PRIVACY_VERSION = '1.1';
export const PRIVACY_UPDATED = '2026-09-18';

export const TERMS_SECTIONS: Record<Lang, LegalSection[]> = {
  he: [
    {
      heading: '1. מפעיל השירות',
      body: [
        'MichiPlan (״האפליקציה״, ״השירות״) הוא כלי לתכנון משותף של טיול ליפן, המשמש קבוצה סגורה של משתתפים המצטרפים באמצעות קוד הזמנה. השירות מופעל על ידי ניב צורדקר, כאדם פרטי — לא כחברה או כתאגיד רשום. השירות מיועד כיום למשתמשים בישראל בלבד.',
        'לפניות בנוגע לשירות ולתנאים אלה ניתן לפנות אל neevch19@gmail.com.',
      ],
    },
    {
      heading: '2. תיאור השירות',
      body: [
        'MichiPlan מאפשר למשתתפי טיול לרכז יעדים, אטרקציות, תאריכים ותקציב במקום אחד, ולשתף את המידע בזמן אמת בין כל מי שהצטרף לאותו טיול באמצעות קוד הזמנה.',
        'השירות ניתן ״כפי שהוא״ (AS IS), ללא הבטחת זמינות רציפה. ייתכנו הפסקות, תקלות או שינויים בתכונות מעת לעת, לרבות תכונות המסתמכות על שירותי צד שלישי חיצוניים (ראו סעיף 7).',
      ],
    },
    {
      heading: '3. חשבונות משתמשים',
      body: [
        'ההרשמה מתבצעת באמצעות כתובת אימייל וסיסמה. אתם אחראים לשמירה על סודיות פרטי ההתחברות שלכם ולכל פעילות המתבצעת דרך החשבון שלכם.',
        'עליכם למסור פרטים נכונים ועדכניים בעת ההרשמה. אסור ליצור חשבון עבור אדם אחר ללא הרשאתו, ואסור להתחזות לאדם או גוף אחר.',
        'הגישה לתכני הטיול (יעדים, אטרקציות, תקציב) מותנית בהצטרפות לטיול קיים באמצעות קוד הזמנה תקף, או ביצירת טיול חדש.',
      ],
    },
    {
      heading: '4. שימוש אסור',
      body: [
        'אין להשתמש בשירות לצורך פגיעה, הטרדה או הפרת פרטיות של משתתף אחר; ניסיון לקבל גישה לא מורשית לחשבון, לטיול או לנתונים של אדם אחר; שיבוש פעולת השירות (לרבות ניסיון עקיפה של מנגנוני אימות או הרשאות); איסוף אוטומטי של מידע מהשירות (scraping) שלא לצורך שימוש אישי רגיל; או כל שימוש המנוגד לדין החל.',
        'המפעיל רשאי להשעות או לסגור חשבון המפר סעיף זה, בהתאם לאמור בסעיף 8.',
      ],
    },
    {
      heading: '5. תוכן משתמשים והרשאות שיתוף',
      body: [
        '״תוכן משתמשים״ הוא כל מידע שאתם מזינים לשירות — לרבות שמות יעדים ואטרקציות, הערות, תאריכים ורשומות תקציב. התוכן שלכם נשאר שלכם; בהזינו אותו אתם מעניקים למפעיל רישיון מוגבל להציג, לאחסן ולהעביר אותו כנדרש לצורך הפעלת השירות עצמו (לרבות שיתופו עם שאר משתתפי אותו טיול, כמפורט בסעיף 5 למדיניות הפרטיות).',
        'תוכן שאתם מוסיפים לטיול גלוי לכל משתתפי אותו טיול, כולל לאחר שתעזבו אותו — עזיבת טיול מוחקת את הסימונים האישיים שלכם (למשל אטרקציות שסימנתם כנצפו) אך אינה מוחקת פריטים שהוספתם ושמשתתפים אחרים כבר רואים.',
        'אתם מתחייבים שיש לכם את כל הזכויות הנדרשות בתוכן שאתם מעלים, ושהוא אינו מפר זכויות של צד שלישי.',
      ],
    },
    {
      heading: '6. קניין רוחני',
      body: [
        'עיצוב השירות, הלוגו, הקוד והממשק (למעט תוכן המשתמשים עצמו) הם קניינו של המפעיל או של מעניקי הרישיון שלו, ואין להעתיקם, להפיץ מחדש או ליצור מהם יצירות נגזרות ללא הסכמה מראש.',
      ],
    },
    {
      heading: '7. שירותי צד שלישי',
      body: [
        'השירות מסתמך על ספקי תשתית וממשקי API חיצוניים לצורך תפעולו — לרבות אימות משתמשים ואחסון נתונים (Google Firebase), הרצת שרת האפליקציה (Google Cloud Run), הצגת מפות וחישוב מסלולים (OpenStreetMap / OpenFreeMap, OSRM), ושערי המרת מטבע (Frankfurter.app). לפירוט מלא ראו את מדיניות הפרטיות.',
        'שירותים אלה כפופים לתנאי השימוש ולמדיניות הפרטיות של הספקים עצמם, ואין למפעיל שליטה על זמינותם.',
      ],
    },
    {
      heading: '8. סגירת חשבון',
      body: [
        'ניתן לצאת מטיול בכל עת דרך מסך ההגדרות באפליקציה. מחיקה מלאה של חשבון המשתמש עצמו (לא רק יציאה מטיול) אינה זמינה כרגע כפעולה עצמאית באפליקציה — ⟦REVIEW: ראו ״תהליך מחיקת חשבון מלא״ ברשימת הפריטים החוסמים פרסום, בראש העמוד⟧.',
        'המפעיל רשאי להשעות או לסגור חשבון המפר תנאים אלה, ככל האפשר לאחר התראה סבירה בנסיבות העניין.',
      ],
    },
    {
      heading: '9. מגבלת אחריות',
      body: [
        'השירות ניתן ללא אחריות מכל סוג, מפורשת או משתמעת. ככל שהדין המקומי מתיר זאת, המפעיל לא יהיה אחראי לכל נזק עקיף, מקרי או תוצאתי הנובע מהשימוש בשירות או מאי-היכולת להשתמש בו — לרבות אובדן מידע, עיכוב בטיסה או פספוס תכנון עקב תקלה בשירות או במידע חיצוני (כגון מפות, שערי מטבע או ניתוב) המוצג דרכו.',
        'מגבלה זו אינה שוללת אחריות שאינה ניתנת להגבלה על פי דין קוגנטי.',
      ],
    },
    {
      heading: '10. שינויים בתנאים',
      body: [
        'המפעיל רשאי לעדכן תנאים אלה מעת לעת. שינוי מהותי (למשל הרחבת השימוש במידע או שינוי בהתחייבויות עיקריות) יחייב אישור מחדש שלכם בכניסה הבאה לאפליקציה; תיקוני ניסוח או הבהרות שאינם מהותיים לא יחייבו אישור חוזר. מספר הגרסה ותאריך העדכון האחרון מופיעים בראש עמוד זה.',
      ],
    },
    {
      heading: '11. דין חל',
      body: [
        'על תנאים אלה יחולו דיני מדינת ישראל, וסמכות השיפוט הבלעדית בכל עניין הנוגע להם נתונה לבתי המשפט המוסמכים בישראל.',
      ],
    },
  ],
  en: [
    {
      heading: '1. Service operator',
      body: [
        'MichiPlan ("the app", "the Service") is a tool for jointly planning a trip to Japan, used by a closed group of participants who join via an invite code. The Service is operated by Niv Chordeker, as a private individual — not as a registered company or corporation. The Service is currently intended for users in Israel only.',
        'For questions about the Service or these Terms, contact neevch19@gmail.com.',
      ],
    },
    {
      heading: '2. Description of the Service',
      body: [
        'MichiPlan lets trip participants gather destinations, attractions, dates and budget in one place, and share that information in real time with everyone who has joined the same trip via an invite code.',
        'The Service is provided "AS IS", without any guarantee of continuous availability. Interruptions, glitches or changes to features may occur from time to time, including features that rely on external third-party services (see Section 7).',
      ],
    },
    {
      heading: '3. User accounts',
      body: [
        'Signup is done using an email address and password. You are responsible for keeping your login details confidential and for all activity that takes place through your account.',
        'You must provide accurate and current details when signing up. You may not create an account on behalf of another person without their authorization, and you may not impersonate another person or entity.',
        'Access to trip content (destinations, attractions, budget) is conditional on joining an existing trip with a valid invite code, or creating a new trip.',
      ],
    },
    {
      heading: '4. Prohibited use',
      body: [
        "You may not use the Service to harm, harass, or violate the privacy of another participant; to attempt unauthorized access to another person's account, trip, or data; to disrupt the Service's operation (including attempting to bypass authentication or authorization mechanisms); to automatically collect information from the Service (scraping) beyond ordinary personal use; or for any use that violates applicable law.",
        'The operator may suspend or close an account that violates this section, as described in Section 8.',
      ],
    },
    {
      heading: '5. User content and sharing permissions',
      body: [
        '"User content" is any information you enter into the Service — including destination and attraction names, notes, dates and budget records. Your content remains yours; by entering it you grant the operator a limited license to display, store and transmit it as needed to run the Service itself (including sharing it with the other participants of that same trip, as detailed in Section 5 of the Privacy Policy).',
        "Content you add to a trip is visible to all participants of that trip, including after you leave it — leaving a trip deletes your own personal markings (e.g. attractions you marked as visited) but does not delete items you added that other participants can already see.",
        'You represent that you hold all rights necessary in the content you upload, and that it does not infringe the rights of any third party.',
      ],
    },
    {
      heading: '6. Intellectual property',
      body: [
        "The Service's design, logo, code and interface (excluding the user content itself) are the property of the operator or its licensors, and may not be copied, redistributed, or used to create derivative works without prior consent.",
      ],
    },
    {
      heading: '7. Third-party services',
      body: [
        'The Service relies on external infrastructure providers and APIs to operate — including user authentication and data storage (Google Firebase), running the application server (Google Cloud Run), displaying maps and calculating routes (OpenStreetMap / OpenFreeMap, OSRM), and currency conversion rates (Frankfurter.app). See the Privacy Policy for full details.',
        "These services are subject to their own providers' terms of service and privacy policies, and the operator has no control over their availability.",
      ],
    },
    {
      heading: '8. Account closure',
      body: [
        'You may leave a trip at any time from the Settings screen in the app. Full deletion of the user account itself (not just leaving a trip) is not currently available as a self-service action in the app — ⟦REVIEW: see "Full account deletion process" in the publication-blockers list at the top of this page⟧.',
        'The operator may suspend or close an account that violates these Terms, where possible after reasonable notice under the circumstances.',
      ],
    },
    {
      heading: '9. Limitation of liability',
      body: [
        'The Service is provided without any warranty of any kind, express or implied. To the extent permitted by local law, the operator will not be liable for any indirect, incidental or consequential damages arising from use of the Service or the inability to use it — including loss of information, a missed flight, or a missed plan due to a fault in the Service or in external information (such as maps, exchange rates, or routing) displayed through it.',
        'This limitation does not exclude liability that cannot be limited under mandatory law.',
      ],
    },
    {
      heading: '10. Changes to these Terms',
      body: [
        'The operator may update these Terms from time to time. A material change (for example, expanding the use of information or changing core obligations) will require you to re-accept them the next time you enter the app; non-material wording fixes or clarifications will not require re-acceptance. The version number and last-updated date appear at the top of this page.',
      ],
    },
    {
      heading: '11. Governing law',
      body: [
        'These Terms are governed by the laws of the State of Israel, and the courts of Israel have exclusive jurisdiction over any matter relating to them.',
      ],
    },
  ],
};

export const PRIVACY_SECTIONS: Record<Lang, LegalSection[]> = {
  he: [
    {
      heading: '1. מבוא',
      body: [
        'מדיניות זו מתארת אילו נתונים MichiPlan אוסף בפועל, לשם מה, עם מי הם משותפים, וכיצד ניתן לפנות בעניינם. היא נכתבה בהתאם למה שהקוד של האפליקציה עושה בפועל נכון לתאריך העדכון שבראש העמוד — לא כהצהרת כוונות עתידית.',
        'קריאת מדיניות זו אינה מהווה כשלעצמה הסכמה לכל שימוש אפשרי במידע; ככל שיידרש בעתיד עיבוד הדורש הסכמה נפרדת ומפורשת (למשל דיוור שיווקי, אם וכאשר ייבנה), תתבקש הסכמה ייעודית עבורו בנפרד מהסכמת תנאי השימוש.',
      ],
    },
    {
      heading: '2. איזה מידע נאסף',
      body: [
        'פרטי חשבון: שם, כתובת אימייל, וסיסמה (הסיסמה מנוהלת ומאוחסנת על ידי Firebase Authentication של גוגל — לשרת האפליקציה עצמו אין גישה לסיסמה בטקסט גלוי).',
        'העדפות פרופיל: צבע אווטאר, מצב תצוגה (בהיר/כהה) ופלטת צבעים, שפת ממשק מועדפת, מטבע בסיס, והעדפות אילו סוגי עדכונים בתוך האפליקציה יוצגו לכם (למשל ״אטרקציה חדשה״ או ״שינוי תאריך״) — עדכונים אלה מוצגים בתוך האפליקציה בלבד ואינם נשלחים כאימייל, הודעת דחיפה או מסרון.',
        'תוכן טיול שאתם מזינים: שמות ותאריכי יעדים, אטרקציות ותגיות שלהן, הערות טקסט חופשי, וקטגוריות/סכומי תקציב. שמות מקומות שאתם מזינים נשלחים לשירותי מיפוי חיצוניים כדי לאתר קואורדינטות ולהציג אותם על מפה (ראו סעיף 4).',
        'נתוני חברות בטיול: מי הצטרף לאיזה טיול, מתי, ובאיזה תפקיד (יוצר הטיול / משתתף); וכתובות אימייל שהוזמנו לטיול ועדיין לא הצטרפו אליו.',
        'האפליקציה אינה אוספת כרגע מידע ממכשירכם (מיקום, מצלמה, אנשי קשר וכדומה) ואינה כוללת מעקב פרסומי, כלי אנליטיקס או SDK של צד שלישי למטרות פרסום.',
      ],
    },
    {
      heading: '3. כיצד המידע משמש',
      body: [
        'המידע משמש להפעלת השירות עצמו בלבד: הצגת המסלול והתקציב שלכם ושל שותפי הטיול שלכם, שמירת ההעדפות שבחרתם, ואפשור התחברות מאובטחת. אין שימוש במידע לפרסום ממוקד ואין מכירה של מידע לצדדים שלישיים.',
      ],
    },
    {
      heading: '4. עם אילו ספקים המידע משותף',
      body: [
        'Google Firebase — Authentication (ניהול ההתחברות) ו-Cloud Firestore (בסיס הנתונים הראשי, בו נשמר כל האמור בסעיף 2).',
        'Google Cloud Run — מריץ את שרת ה-API של האפליקציה.',
        'OpenStreetMap Nominatim ו-OpenFreeMap — שמות יעדים ואטרקציות שאתם מזינים נשלחים אליהם לצורך איתור קואורדינטות והצגת מפה; אין להם גישה לשאר פרטי החשבון שלכם.',
        'OSRM (router.project-osrm.org) — מקבל קואורדינטות של תחנות המסלול לצורך חישוב מסלול נסיעה; לא מקבל פרטים מזהים.',
        'Frankfurter.app — מספק שערי המרת מטבע; אינו מקבל כל מידע אישי (רק בקשת שער חליפין כללית).',
        'Google Fonts — טוען גופנים לעימוד האפליקציה; כברירת מחדל בדפדפן, בקשה לטעינת גופן חושפת את כתובת ה-IP שלכם לגוגל, כמו בכל בקשת רשת רגילה.',
        'מסד נתונים מקומי (SQLite) בשרת משמש אך ורק למילון תרגום עברית-אנגלית-יפנית ולקאש של שערי מטבע — אינו מכיל מידע אישי כלשהו.',
        'לא משמשים כרגע: כלי אנליטיקס, שירותי פרסום, שירותי דיוור (אימייל/SMS/פוש), או מעבד תשלומים — האפליקציה אינה כוללת רכישות בתשלום.',
      ],
    },
    {
      heading: '5. שיתוף עם משתמשים אחרים בטיול',
      body: [
        'MichiPlan הוא כלי לתכנון משותף: שמכם, כתובת האימייל שלכם (ברשימת משתתפי הטיול), וכל תוכן שאתם מוסיפים לטיול (יעדים, אטרקציות, הערות, רשומות תקציב) גלויים לכל משתתפי אותו טיול — כלומר לכל מי שהצטרף אליו באמצעות קוד ההזמנה. זהו חלק מהותי מאופן פעולת השירות, לא שיתוף עם צד שלישי חיצוני.',
        'תקציב אישי (״התקציב שלי״, בניגוד לתקציב הטיול המשותף) גלוי אך ורק לכם ואינו נגיש לשאר משתתפי הטיול.',
      ],
    },
    {
      heading: '6. שמירה ומחיקה',
      body: [
        'המידע נשמר כל עוד החשבון והטיול פעילים. יציאה מטיול (דרך ההגדרות) מוחקת את הסימונים האישיים שלכם באותו טיול (למשל אטרקציות שסימנתם כנצפו/תוכננו), אך אינה מוחקת תוכן שהוספתם וששאר המשתתפים כבר רואים (למשל יעדים או אטרקציות שיצרתם) — אלה נותרים חלק מהטיול המשותף.',
        'מחיקה מלאה ועצמאית של חשבון משתמש (לרבות פרטי הפרופיל וההיסטוריה) אינה נתמכת כרגע כפעולה באפליקציה עצמה. ⟦REVIEW: ראו ״תהליך מחיקת חשבון מלא״ ברשימת הפריטים החוסמים פרסום, בראש העמוד⟧.',
        'תיעוד אישור תנאי השימוש (גרסה ומועד) נשמר לצורך תיעוד ואינו נמחק עם יציאה מטיול, שכן הוא קשור לחשבון ולא לטיול ספציפי.',
      ],
    },
    {
      heading: '7. הרשאות מכשיר',
      body: [
        'האפליקציה אינה מבקשת כיום הרשאות מכשיר כלשהן (מיקום, מצלמה, התראות פוש וכדומה). אם תכונה עתידית תדרוש הרשאה כזו, תתבקש הרשאה מפורשת בזמן השימוש בתכונה הרלוונטית, ומדיניות זו תעודכן בהתאם.',
      ],
    },
    {
      heading: '8. אבטחת מידע',
      body: [
        'האפליקציה משתמשת בתשתיות האימות והאחסון המנוהלות של Google (Firebase Authentication ו-Cloud Firestore), ובכללי גישה בצד השרת המגבילים כל בקשה למידע של המשתמש המחובר בלבד ולנתוני הטיולים שהוא חבר בהם. ⟦REVIEW: אין להבטיח כאן רמת אבטחה ספציפית (כגון הצפנה בתקן מסוים) מעבר למה שגוגל מספקת כברירת מחדל, אלא אם בוצעה בדיקה ייעודית שמאשרת זאת⟧.',
      ],
    },
    {
      heading: '9. פרטיות ילדים',
      body: [
        '⟦REVIEW: ראו ״הגבלת גיל / פרטיות קטינים״ ברשימת הפריטים החוסמים פרסום, בראש העמוד⟧.',
      ],
    },
    {
      heading: '10. הזכויות שלכם ודרכי פנייה',
      body: [
        'ניתן לצפות בפרטי הפרופיל שלכם ולעדכנם ישירות במסך ההגדרות באפליקציה (שם, אווטאר, שפה, מטבע, העדפות התראות). לבקשת עיון מלאה במידע השמור עליכם, תיקון מידע שאינו ניתן לעדכון עצמי, או שאלות על מדיניות זו, ניתן לפנות אל neevch19@gmail.com.',
        'השירות מיועד כיום למשתמשים בישראל, וככל שחלות על עיבוד המידע זכויות פרטיות נוספות מכוח הדין הישראלי (חוק הגנת הפרטיות, התשמ״א-1981), ניתן לממש אותן באמצעות הפנייה שלעיל.',
      ],
    },
    {
      heading: '11. שינויים במדיניות זו',
      body: [
        'מדיניות זו עשויה להתעדכן מעת לעת כדי לשקף שינויים בפועל באופן פעולת האפליקציה. עדכון במדיניות הפרטיות בלבד (ללא שינוי מהותי בתנאי השימוש) אינו מצריך אישור מחדש של תנאי השימוש. מספר הגרסה ותאריך העדכון האחרון מופיעים בראש עמוד זה.',
      ],
    },
  ],
  en: [
    {
      heading: '1. Introduction',
      body: [
        "This policy describes what data MichiPlan actually collects, for what purpose, who it's shared with, and how to reach out about it. It was written to match what the app's code actually does as of the last-updated date at the top of this page — not as a statement of future intent.",
        "Reading this policy does not by itself constitute consent to every possible use of information; should processing that requires separate, explicit consent be needed in the future (for example marketing communications, if and when built), dedicated consent for it will be requested separately from acceptance of the Terms of Service.",
      ],
    },
    {
      heading: '2. What information is collected',
      body: [
        "Account details: name, email address, and password (the password is managed and stored by Google's Firebase Authentication — the app server itself has no access to the password in plain text).",
        'Profile preferences: avatar color, display mode (light/dark) and color palette, preferred interface language, base currency, and preferences for which kinds of in-app updates are shown to you (e.g. "new attraction" or "date change") — these updates are shown inside the app only and are not sent as email, push notification, or SMS.',
        "Trip content you enter: destination names and dates, attractions and their tags, free-text notes, and budget categories/amounts. Place names you enter are sent to external mapping services to locate coordinates and display them on a map (see Section 4).",
        'Trip membership data: who joined which trip, when, and in what role (trip creator / participant); and email addresses that were invited to a trip and have not yet joined it.',
        "The app does not currently collect information from your device (location, camera, contacts, etc.) and does not include advertising tracking, analytics tools, or third-party SDKs for advertising purposes.",
      ],
    },
    {
      heading: '3. How the information is used',
      body: [
        'The information is used solely to run the Service itself: displaying your itinerary and budget and those of your trip partners, saving the preferences you chose, and enabling secure login. Information is not used for targeted advertising and is not sold to third parties.',
      ],
    },
    {
      heading: '4. Which providers the information is shared with',
      body: [
        'Google Firebase — Authentication (login management) and Cloud Firestore (the primary database, where everything listed in Section 2 is stored).',
        "Google Cloud Run — runs the app's API server.",
        "OpenStreetMap Nominatim and OpenFreeMap — destination and attraction names you enter are sent to them to locate coordinates and display a map; they have no access to the rest of your account details.",
        "OSRM (router.project-osrm.org) — receives coordinates of route stops in order to calculate a driving route; does not receive identifying details.",
        'Frankfurter.app — provides currency conversion rates; does not receive any personal information (only a general exchange-rate request).',
        "Google Fonts — loads fonts for the app's typography; by default browser behavior, a font-loading request exposes your IP address to Google, as with any ordinary network request.",
        'A local database (SQLite) on the server is used solely for the Hebrew-English-Japanese translation dictionary and for caching currency rates — it contains no personal information whatsoever.',
        'Not currently used: analytics tools, advertising services, messaging services (email/SMS/push), or a payment processor — the app does not include paid purchases.',
      ],
    },
    {
      heading: '5. Sharing with other users on the trip',
      body: [
        "MichiPlan is a joint-planning tool: your name, your email address (in the trip's participant list), and any content you add to the trip (destinations, attractions, notes, budget records) are visible to every participant of that trip — that is, to everyone who joined it using the invite code. This is a core part of how the Service works, not sharing with an external third party.",
        'Your personal budget ("My budget", as distinct from the shared trip budget) is visible only to you and is not accessible to the other trip participants.',
      ],
    },
    {
      heading: '6. Retention and deletion',
      body: [
        'Information is retained for as long as the account and the trip are active. Leaving a trip (via Settings) deletes your own personal markings on that trip (e.g. attractions you marked as visited/planned), but does not delete content you added that other participants can already see (e.g. destinations or attractions you created) — those remain part of the shared trip.',
        'Full, self-service deletion of a user account (including profile details and history) is not currently supported as an action within the app itself. ⟦REVIEW: see "Full account deletion process" in the publication-blockers list at the top of this page⟧.',
        'A record of Terms-of-Service acceptance (version and date) is kept for record-keeping purposes and is not deleted when leaving a trip, since it is tied to the account rather than to a specific trip.',
      ],
    },
    {
      heading: '7. Device permissions',
      body: [
        "The app does not currently request any device permissions (location, camera, push notifications, etc.). If a future feature requires such a permission, explicit permission will be requested at the time that feature is used, and this policy will be updated accordingly.",
      ],
    },
    {
      heading: '8. Data security',
      body: [
        "The app uses Google's managed authentication and storage infrastructure (Firebase Authentication and Cloud Firestore), and server-side access rules that limit every request to only the logged-in user's own information and the data of the trips they are a member of. ⟦REVIEW: no specific security level (such as encryption to a particular standard) should be claimed here beyond what Google provides by default, unless a dedicated review has confirmed it⟧.",
      ],
    },
    {
      heading: "9. Children's privacy",
      body: [
        '⟦REVIEW: see "Age restriction / children\'s privacy" in the publication-blockers list at the top of this page⟧.',
      ],
    },
    {
      heading: '10. Your rights and how to reach us',
      body: [
        'You can view and update your profile details directly in the Settings screen in the app (name, avatar, language, currency, notification preferences). For a full request to review the information held about you, correction of information that cannot be self-updated, or questions about this policy, contact neevch19@gmail.com.',
        'The Service is currently intended for users in Israel, and to the extent additional privacy rights under Israeli law apply to the processing of this information (the Protection of Privacy Law, 5741-1981), they can be exercised via the contact above.',
      ],
    },
    {
      heading: '11. Changes to this policy',
      body: [
        "This policy may be updated from time to time to reflect actual changes in how the app operates. An update to the Privacy Policy alone (without a material change to the Terms of Service) does not require re-acceptance of the Terms of Service. The version number and last-updated date appear at the top of this page.",
      ],
    },
  ],
};
