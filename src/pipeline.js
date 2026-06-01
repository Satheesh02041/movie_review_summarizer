/**
 * System 3: Heuristic NLP Pipeline
 * Implements:
 * 1. Multilingual Language Detection
 * 2. Multi-language Profanity Detection
 * 3. Contextual Profanity Filtering & Normalization
 * 4. Emoji Sentiment Processing
 * 5. Star-Rating Parsing
 * 6. Numeric Info Preservation
 * 7. Spoiler-Free Masking
 * 8. Aspect-Oriented Summary Compilation (translating to English/selected lang)
 */

// Profanity dictionaries in multiple languages
const PROFANITY_DICTS = {
  en: [
    { word: "fuck", replacement: "extremely" },
    { word: "fucking", replacement: "highly" },
    { word: "shit", replacement: "poor quality" },
    { word: "bitch", replacement: "complain" },
    { word: "asshole", replacement: "rude individual" },
    { word: "bastard", replacement: "nuisance" },
    { word: "crap", replacement: "poor experience" },
    { word: "cunt", replacement: "disaster" },
    { word: "dick", replacement: "nuisance" },
    { word: "pussy", replacement: "weak item" },
    { word: "motherfucker", replacement: "disruptive element" }
  ],
  es: [
    { word: "mierda", replacement: "decepcionante" },
    { word: "cabron", replacement: "molesto" },
    { word: "puta", replacement: "muy" },
    { word: "puto", replacement: "muy" },
    { word: "joder", replacement: "caramba" },
    { word: "pendejo", replacement: "inepto" },
    { word: "maricon", replacement: "malo" },
    { word: "hijo de puta", replacement: "desastre" }
  ],
  fr: [
    { word: "merde", replacement: "mauvais" },
    { word: "putain", replacement: "très" },
    { word: "connard", replacement: "désagréable" },
    { word: "salope", replacement: "mauvais" },
    { word: "chier", replacement: "ennuyer" },
    { word: "encule", replacement: "déplorable" }
  ],
  de: [
    { word: "scheisse", replacement: "schlecht" },
    { word: "arschloch", replacement: "unhöflich" },
    { word: "schlampe", replacement: "schlecht" },
    { word: "wichser", replacement: "unangenehm" },
    { word: "hurensohn", replacement: "frechheit" }
  ],
  hi: [
    { word: "bhenchod", replacement: "bura" },
    { word: "madarchod", replacement: "bura" },
    { word: "chutiya", replacement: "bewakoof" },
    { word: "gandu", replacement: "kharab" },
    { word: "bsdk", replacement: "bekaar" },
    { word: "saala", replacement: "sach mein" }
  ]
};

// Emoji Sentiment mappings
const EMOJI_SENTIMENT = {
  // Positive
  "😊": 1.0, "😍": 1.2, "🥰": 1.2, "😄": 1.0, "😀": 1.0, "👍": 1.0, "👌": 1.0, "🌟": 1.5, "💖": 1.2, "👏": 1.0, "❤️": 1.2, "🔥": 1.3,
  // Neutral
  "😐": 0.0, "🤔": 0.1, "🤷": 0.0, "🙄": -0.2, "👀": 0.1,
  // Negative
  "😠": -1.0, "😡": -1.2, "🤬": -1.5, "🤮": -1.3, "💩": -1.5, "👎": -1.0, "😢": -0.8, "😭": -1.0, "💔": -1.0, "😒": -0.6, "❌": -1.0
};

// Language indicators
const LANG_SIGNATURES = [
  { lang: "es", keywords: ["el", "la", "los", "las", "y", "en", "para", "con", "que", "es", "una", "este", "esta", "muy", "bien", "mal", "pero"] },
  { lang: "fr", keywords: ["le", "la", "les", "et", "en", "pour", "avec", "que", "est", "une", "ce", "cette", "très", "bien", "mais", "pourquoi"] },
  { lang: "de", keywords: ["der", "die", "das", "und", "in", "für", "mit", "dass", "ist", "eine", "dies", "sehr", "gut", "nicht", "aber", "warum"] },
  { lang: "hi", keywords: ["hai", "aur", "ko", "ke", "ki", "mein", "bhi", "tha", "toh", "ka", "bohot", "accha", "kharab", "lekin", "hi", "ye", "wo"] }
];

// Spoilers check keywords
const SPOILER_KEYWORDS = [
  "spoiler alert", "spoiler", "spoilers", "dies", "die", "kills", "killed", "ending", 
  "turns out to be", "turns out that", "plot twist", "reveal", "final boss", "revela", 
  "muere", "final", "fin", "se muere"
];

// Translation Simulation Dictionaries for Custom Inputs (Heuristic translation to English)
const COMMON_TRANSLATIONS = {
  es: [
    { from: "excelente", to: "excellent" },
    { from: "bueno", to: "good" },
    { from: "malo", to: "bad" },
    { from: "basura", to: "garbage" },
    { from: "decepcionante", to: "disappointing" },
    { from: "terrible", to: "terrible" },
    { from: "batería", to: "battery" },
    { from: "pantalla", to: "screen" },
    { from: "sonido", to: "sound" },
    { from: "cámara", to: "camera" },
    { from: "precio", to: "price" },
    { from: "envío", to: "shipping" },
    { from: "calidad", to: "quality" },
    { from: "rápido", to: "fast" },
    { from: "lento", to: "slow" },
    { from: "caro", to: "expensive" },
    { from: "barato", to: "cheap" },
    { from: "recomiendo", to: "recommend" }
  ],
  fr: [
    { from: "excellent", to: "excellent" },
    { from: "bon", to: "good" },
    { from: "mauvais", to: "bad" },
    { from: "décevant", to: "disappointing" },
    { from: "batterie", to: "battery" },
    { from: "écran", to: "screen" },
    { from: "son", to: "sound" },
    { from: "caméra", to: "camera" },
    { from: "prix", to: "price" },
    { from: "livraison", to: "shipping" },
    { from: "qualité", to: "quality" },
    { from: "rapide", to: "fast" },
    { from: "lent", to: "slow" },
    { from: "cher", to: "expensive" }
  ],
  de: [
    { from: "exzellent", to: "excellent" },
    { from: "gut", to: "good" },
    { from: "schlecht", to: "bad" },
    { from: "akku", to: "battery" },
    { from: "bildschirm", to: "screen" },
    { from: "ton", to: "sound" },
    { from: "kamera", to: "camera" },
    { from: "preis", to: "price" },
    { from: "lieferung", to: "shipping" },
    { from: "qualität", to: "quality" },
    { from: "schnell", to: "fast" },
    { from: "langsam", to: "slow" },
    { from: "teuer", to: "expensive" }
  ],
  hi: [
    { from: "accha", to: "good" },
    { from: "badhiya", to: "excellent" },
    { from: "kharab", to: "bad" },
    { from: "bakwaas", to: "garbage" },
    { from: "batery", to: "battery" },
    { from: "screen", to: "screen" },
    { from: "awaz", to: "sound" },
    { from: "paisa", to: "money" },
    { from: "price", to: "price" },
    { from: "delivery", to: "delivery" },
    { from: "mast", to: "awesome" }
  ]
};

// Target Summary Translation (simulated for German, Spanish, French outputs)
const TARGET_TRANSLATIONS = {
  es: {
    "Overall Recommendation:": "Recomendación General:",
    "Strong Buy": "Compra Altamente Recomendada",
    "Buy": "Compra Recomendada",
    "Neutral": "Neutral / Aceptable",
    "Pass": "Evitar / No Recomendado",
    "Quality": "Calidad & Diseño",
    "Performance": "Rendimiento & Batería",
    "Price / Value": "Precio & Valor",
    "Support & Delivery": "Soporte & Entrega",
    "Positive": "Opiniones Positivas",
    "Neutral/Mixed": "Opiniones Neutras/Mixtas",
    "Negative": "Opiniones Negativas",
    "The build is solid and feels premium. Materials are high quality.": "La construcción es sólida y se siente premium. Los materiales son de alta calidad.",
    "Users praise the high quality craftsmanship, though some note minor visual imperfections.": "Los usuarios elogian la artesanía de alta calidad, aunque algunos notan imperfecciones visuales menores.",
    "Very high-quality build and materials. Users express high satisfaction with product durability.": "Construcción y materiales de muy alta calidad. Los usuarios expresan gran satisfacción con la durabilidad.",
    "Battery life and overall speed are excellent. Smooth operation under pressure.": "La duración de la batería y la velocidad general son excelentes. Funcionamiento fluido bajo carga.",
    "Exceptional performance, specifically praised for its speed and reliable battery life.": "Rendimiento excepcional, específicamente elogiado por su velocidad y duración de batería confiable.",
    "Outstanding performance metrics. Users report extremely fast operations and reliable screen specs.": "Métricas de rendimiento sobresalientes. Los usuarios informan operaciones extremadamente rápidas y especificaciones de pantalla confiables.",
    "Reasonably priced for the features, though some find it a bit premium.": "Precio razonable para las características, aunque algunos lo consideran un poco premium.",
    "Presents standard value. Some users note it is worth the cost, while others describe it as slightly expensive.": "Presenta un valor estándar. Algunos usuarios señalan que vale la pena el costo, mientras que otros lo describen como ligeramente caro.",
    "Great value for money. Most reviews consider the pricing fair relative to capabilities.": "Gran relación calidad-precio. La mayoría de las opiniones consideran que el precio es justo en relación con las capacidades.",
    "Delivered on time, but box packaging was slightly damaged. Support was responsive.": "Entregado a tiempo, pero el empaque de la caja estaba ligeramente dañado. El soporte fue receptivo.",
    "Generally good shipping speed, with responsive customer service to handle issues.": "Velocidad de envío generalmente buena, con un servicio al cliente receptivo para manejar problemas.",
    "Superb delivery experience. Fast, clean box, and highly supportive helpdesk.": "Excelente experiencia de entrega. Rápido, caja limpia y mesa de ayuda de gran apoyo.",
    "Poor build quality reported, with plastic parts breaking easily.": "Se informa una calidad de construcción deficiente, con piezas de plástico que se rompen fácilmente.",
    "Generally satisfactory, but has durability complaints.": "Generalmente satisfactorio, pero tiene quejas de durabilidad.",
    "Disappointing performance. Frequent lags and overheating.": "Rendimiento decepcionante. Retrasos frecuentes y sobrecalentamiento.",
    "Sluggish speed and disappointing battery lifecycle.": "Velocidad lenta y ciclo de vida de la batería decepcionante.",
    "Very expensive. Doesn't justify the high cost.": "Muy caro. No justifica el alto costo.",
    "Overpriced. Poor ratio of features to financial investment.": "Excesivamente caro. Pobre relación de características a inversión financiera.",
    "Very slow delivery and unhelpful support representatives.": "Entrega muy lenta y representantes de soporte poco serviciales.",
    "Logistical complaints regarding slow shipping times and damaged packages.": "Quejas logísticas sobre tiempos de envío lentos y paquetes dañados."
  },
  fr: {
    "Overall Recommendation:": "Recommandation Générale:",
    "Strong Buy": "Excellent Achat",
    "Buy": "Recommandé",
    "Neutral": "Neutre / Passable",
    "Pass": "À Éviter",
    "Quality": "Qualité & Matériaux",
    "Performance": "Performance & Autonomie",
    "Price / Value": "Rapport Qualité/Prix",
    "Support & Delivery": "Livraison & Support",
    "Positive": "Avis Positifs",
    "Neutral/Mixed": "Avis Neutres/Mixtes",
    "Negative": "Avis Négatifs",
    "The build is solid and feels premium. Materials are high quality.": "La fabrication est solide et de qualité supérieure. Les matériaux sont d'excellent qualité.",
    "Users praise the high quality craftsmanship, though some note minor visual imperfections.": "Les utilisateurs louent la qualité de l'artisanat, bien que certains notent des imperfections visuelles mineures.",
    "Very high-quality build and materials. Users express high satisfaction with product durability.": "Conception et matériaux de très haute qualité. Les utilisateurs expriment leur satisfaction quant à la durabilité.",
    "Battery life and overall speed are excellent. Smooth operation under pressure.": "L'autonomie et la vitesse globale sont excellentes. Fonctionnement fluide sous pression.",
    "Exceptional performance, specifically praised for its speed and reliable battery life.": "Performances exceptionnelles, particulièrement saluées pour la rapidité et la longévité de la batterie.",
    "Outstanding performance metrics. Users report extremely fast operations and reliable screen specs.": "Performances exceptionnelles. Les utilisateurs rapportent des opérations extrêmement rapides et un écran fiable.",
    "Reasonably priced for the features, though some find it a bit premium.": "Prix raisonnable pour les fonctionnalités, bien que certains le trouvent un peu cher.",
    "Presents standard value. Some users note it is worth the cost, while others describe it as slightly expensive.": "Valeur standard. Certains utilisateurs notent que le coût en vaut la peine, tandis que d'autres le trouvent légèrement cher.",
    "Great value for money. Most reviews consider the pricing fair relative to capabilities.": "Excellent rapport qualité-prix. La plupart des avis estiment le prix équitable par rapport aux performances.",
    "Delivered on time, but box packaging was slightly damaged. Support was responsive.": "Livré à temps, mais l'emballage était légèrement endommagé. Le support a été réactif.",
    "Generally good shipping speed, with responsive customer service to handle issues.": "Vitesse d'expédition généralement correcte, service client réactif pour résoudre les incidents.",
    "Superb delivery experience. Fast, clean box, and highly supportive helpdesk.": "Excellente logistique. Rapide, colis propre, et assistance téléphonique très serviable.",
    "Poor build quality reported, with plastic parts breaking easily.": "Qualité de fabrication médiocre signalée, les pièces en plastique se cassent facilement.",
    "Generally satisfactory, but has durability complaints.": "Généralement satisfaisant, mais fait l'objet de plaintes concernant la durabilité.",
    "Disappointing performance. Frequent lags and overheating.": "Performances décevantes. Ralentissements fréquents et surchauffe.",
    "Sluggish speed and disappointing battery lifecycle.": "Vitesse lente et autonomie de la batterie très décevante.",
    "Very expensive. Doesn't justify the high cost.": "Très cher. Ne justifie pas ce coût élevé.",
    "Overpriced. Poor ratio of features to financial investment.": "Trop cher. Mauvais rapport fonctionnalités-prix.",
    "Very slow delivery and unhelpful support representatives.": "Livraison très lente et service après-vente inefficace.",
    "Logistical complaints regarding slow shipping times and damaged packages.": "Plaintes logistiques concernant des délais d'expédition longs et des colis endommagés."
  },
  de: {
    "Overall Recommendation:": "Gesamtempfehlung:",
    "Strong Buy": "Sehr Empfehlenswert",
    "Buy": "Empfehlenswert",
    "Neutral": "Neutral / Akzeptabel",
    "Pass": "Nicht Empfehlenswert",
    "Quality": "Qualität & Verarbeitung",
    "Performance": "Leistung & Akku",
    "Price / Value": "Preis-Leistung",
    "Support & Delivery": "Versand & Support",
    "Positive": "Positive Meinungen",
    "Neutral/Mixed": "Neutrale/Gemischte Meinungen",
    "Negative": "Negative Meinungen",
    "The build is solid and feels premium. Materials are high quality.": "Die Verarbeitung ist solide und fühlt sich hochwertig an. Die Materialien sind erstklassig.",
    "Users praise the high quality craftsmanship, though some note minor visual imperfections.": "Die Benutzer loben die hochwertige Verarbeitung, obwohl einige kleinere Mängel bemerken.",
    "Very high-quality build and materials. Users express high satisfaction with product durability.": "Sehr hochwertige Konstruktion und Materialien. Die Anwender äußern hohe Zufriedenheit mit der Haltbarkeit.",
    "Battery life and overall speed are excellent. Smooth operation under pressure.": "Akkulaufzeit und Gesamtgeschwindigkeit sind hervorragend. Reibungsloser Betrieb unter Last.",
    "Exceptional performance, specifically praised for its speed and reliable battery life.": "Außergewöhnliche Leistung, besonders gelobt für Geschwindigkeit und zuverlässige Akkulaufzeit.",
    "Outstanding performance metrics. Users report extremely fast operations and reliable screen specs.": "Hervorragende Leistungskennzahlen. Benutzer berichten von extrem schnellen Abläufen und zuverlässigen Displaywerten.",
    "Reasonably priced for the features, though some find it a bit premium.": "Angemessener Preis für die Funktionen, obwohl einige es etwas teuer finden.",
    "Presents standard value. Some users note it is worth the cost, while others describe it as slightly expensive.": "Bietet Standardwert. Einige Benutzer betonen das Preis-Leistungs-Verhältnis, andere nennen es leicht überteuert.",
    "Great value for money. Most reviews consider the pricing fair relative to capabilities.": "Tolles Preis-Leistungs-Verhältnis. Die meisten Testberichte stufen den Preis als angemessen ein.",
    "Delivered on time, but box packaging was slightly damaged. Support was responsive.": "Pünktlich geliefert, aber der Karton war leicht beschädigt. Der Kundendienst war hilfreich.",
    "Generally good shipping speed, with responsive customer service to handle issues.": "Allgemein gute Liefergeschwindigkeit mit reaktionsschnellem Kundenservice bei Problemen.",
    "Superb delivery experience. Fast, clean box, and highly supportive helpdesk.": "Hervorragendes Liefererlebnis. Schnell, unbeschädigter Karton und hilfsbereiter Support.",
    "Poor build quality reported, with plastic parts breaking easily.": "Mangelhafte Verarbeitungsqualität gemeldet, Plastikteile brechen leicht.",
    "Generally satisfactory, but has durability complaints.": "Allgemein zufriedenstellend, aber es gibt Beschwerden bezüglich der Langlebigkeit.",
    "Disappointing performance. Frequent lags and overheating.": "Enttäuschende Leistung. Häufiges Ruckeln und Überhitzung.",
    "Sluggish speed and disappointing battery lifecycle.": "Träge Geschwindigkeit und enttäuschender Akkulebenszyklus.",
    "Very expensive. Doesn't justify the high cost.": "Sehr teuer. Rechtfertigt den hohen Preis nicht.",
    "Overpriced. Poor ratio of features to financial investment.": "Überteuert. Schlechtes Verhältnis von Funktionen zu finanziellem Aufwand.",
    "Very slow delivery and unhelpful support representatives.": "Sehr langsame Lieferung und wenig hilfreiche Supportmitarbeiter.",
    "Logistical complaints regarding slow shipping times and damaged packages.": "Logistische Reklamationen bezüglich langsamer Lieferzeiten und beschädigter Pakete."
  }
};

/**
 * Detects the language of a sentence based on common keyword occurrences.
 * @param {string} text 
 * @returns {string} Two-letter language code (en, es, fr, de, hi)
 */
export function detectLanguage(text) {
  const cleanText = text.toLowerCase();
  let maxMatches = 0;
  let detected = "en";

  for (const sig of LANG_SIGNATURES) {
    let matches = 0;
    for (const kw of sig.keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'g');
      const count = (cleanText.match(regex) || []).length;
      matches += count;
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      detected = sig.lang;
    }
  }
  return detected;
}

/**
 * Scans a sentence for profanities, recording matches and replacing them if filter is enabled.
 * @param {string} text 
 * @param {string} lang 
 * @param {boolean} censor 
 * @returns {{cleanText: string, profaneWords: string[], wasModified: boolean}}
 */
export function processProfanity(text, lang, censor) {
  let cleanText = text;
  let profaneWords = [];
  let wasModified = false;

  // Scan current language dictionary first
  const dict = PROFANITY_DICTS[lang] || PROFANITY_DICTS.en;
  
  // Also scan English dictionary for cross-language code-switching
  const dictsToScan = lang === "en" ? [dict] : [dict, PROFANITY_DICTS.en];

  for (const currentDict of dictsToScan) {
    for (const item of currentDict) {
      // Find case-insensitive matches with boundary checks or word fragments
      const regex = new RegExp(`\\b${item.word}(?:ing|s|d|ed|er)?\\b`, 'gi');
      const matches = cleanText.match(regex);
      
      if (matches) {
        matches.forEach(m => {
          if (!profaneWords.includes(m.toLowerCase())) {
            profaneWords.push(m.toLowerCase());
          }
        });
        wasModified = true;

        if (censor) {
          // Normalization: Swap with neutral synonym
          cleanText = cleanText.replace(regex, (match) => {
            const isUpper = match === match.toUpperCase();
            const isCapital = match[0] === match[0].toUpperCase() && !isUpper;
            let rep = item.replacement;
            
            if (isUpper) rep = rep.toUpperCase();
            else if (isCapital) rep = rep[0].toUpperCase() + rep.slice(1);
            
            return rep;
          });
        } else {
          // Standard censor: Star masking
          cleanText = cleanText.replace(regex, (match) => {
            return match[0] + "*".repeat(match.length - 1);
          });
        }
      }
    }
  }

  return { cleanText, profaneWords, wasModified };
}

/**
 * Searches for emojis, extracts them, and returns cumulative sentiment.
 * @param {string} text 
 * @returns {{sentiment: number, detectedEmojis: string[]}}
 */
export function analyzeEmojis(text) {
  let sentiment = 0;
  let detectedEmojis = [];
  
  // Scan string for any character mapped in EMOJI_SENTIMENT
  for (const char of text) {
    if (EMOJI_SENTIMENT[char] !== undefined) {
      sentiment += EMOJI_SENTIMENT[char];
      detectedEmojis.push(char);
    }
  }

  return { sentiment, detectedEmojis };
}

/**
 * Parses review rating (e.g. 5★, [3★], [★☆☆☆☆] or similar)
 * @param {string} text 
 * @returns {number|null} star rating out of 5
 */
export function parseStarRating(text) {
  // Check format like [4★], [5★], 5★, 5 stars, etc.
  let match = text.match(/\[?([1-5])\s*★/);
  if (match) {
    return parseInt(match[1]);
  }

  // Check format like [★★★★☆]
  match = text.match(/\[([★☆]{5})\]/);
  if (match) {
    const starString = match[1];
    const count = (starString.match(/★/g) || []).length;
    return count;
  }

  // Check text format like "rating: 4/5" or "4 out of 5"
  match = text.match(/\b([1-5])\s*\/\s*5\b/) || text.match(/\b([1-5])\s+out of 5\b/);
  if (match) {
    return parseInt(match[1]);
  }

  return null;
}

/**
 * Scans for spoiler indicators and wraps spoiler segments.
 * @param {string} text 
 * @returns {{hasSpoiler: boolean, cleanText: string}}
 */
export function applySpoilerShield(text) {
  let hasSpoiler = false;
  let cleanText = text;

  // Heuristically locate spoiler parts
  // Look for "spoiler alert:" or "spoiler:" or sentences starting with "spoiler"
  for (const kw of SPOILER_KEYWORDS) {
    const regex = new RegExp(`\\b(${kw}\\b[^.!?]*|[.!?][^.!?]*\\b${kw}\\b[^.!?]*)`, 'gi');
    if (regex.test(cleanText)) {
      hasSpoiler = true;
      cleanText = cleanText.replace(regex, (match) => {
        return ` [SPOILER GUARDED: ${match.trim()}] `;
      });
    }
  }

  return { hasSpoiler, cleanText };
}

/**
 * Extract numbers like "$49", "12 hours", "3-day", etc.
 * @param {string} text 
 * @returns {string[]} list of extracted numerical insights
 */
export function extractNumericFacts(text) {
  // Matches dollar values, percentages, speeds, sizes, time durations
  const regex = /(\$\d+(?:\.\d{2})?|\d+%\s*(?:off|charged|full)?|\d+(?:\.\d+)?\s*(?:hours?|hrs?|days?|days-delivery|weeks?|months?|am|pm|amperes?|mah|hz|khz|db|watts?|w|v|volts?|in|inches?|mp|gb|mb|tb|k|fps|x))/gi;
  const matches = text.match(regex);
  return matches ? matches.map(m => m.trim().toLowerCase()) : [];
}

/**
 * Extracts and maps review mentions into specific aspects.
 * @param {string} text 
 * @param {string} lang 
 * @returns {string[]} aspects matched
 */
export function extractAspects(text) {
  const clean = text.toLowerCase();
  const aspects = [];

  const keywords = {
    quality: ["quality", "build", "material", "premium", "cheap", "flimsy", "fragile", "durability", "robust", "durabilidad", "calidad", "solid", "plastic", "metal", "construction", "hecho", "hecha", "solido", "solida", "plastique", "métal", "finition", "verarbeitung", "plastik", "qualität", "stabil"],
    performance: ["battery", "performance", "fast", "slow", "lag", "speed", "screen", "display", "resolution", "sound", "audio", "bass", "loud", "camera", "photo", "batería", "rápido", "pantalla", "sonido", "performance", "rendimiento", "vitesse", "écran", "autonomie", "rapide", "lent", "akku", "bildschirm", "ton", "kamera", "schnell", "langsam", "geschwindigkeit", "rendement"],
    price: ["price", "value", "cost", "expensive", "cheap", "worth", "dollars", "pricing", "money", "precio", "costo", "caro", "barato", "valer", "ahorro", "presupuesto", "prix", "valeur", "cher", "argent", "budget", "preis", "wert", "teuer", "billig", "geld"],
    support: ["shipping", "delivery", "box", "package", "support", "service", "customer", "received", "delivered", "seller", "warranty", "envío", "entrega", "servicio", "cliente", "soporte", "vendedor", "caja", "livraison", "boite", "paquet", "vendeur", "garantie", "versand", "lieferung", "paket", "verpackung", "kundenservice", "support", "garantie"]
  };

  for (const [aspect, list] of Object.entries(keywords)) {
    if (list.some(kw => clean.includes(kw))) {
      aspects.push(aspect);
    }
  }

  return aspects;
}

/**
 * Standardizes text into English based on keywords (for custom input simulation)
 * @param {string} text 
 * @param {string} lang 
 * @returns {string} english translation approximation
 */
function translateToEnglish(text, lang) {
  if (lang === "en") return text;
  
  let translated = text;
  const list = COMMON_TRANSLATIONS[lang] || [];
  
  for (const dict of list) {
    const regex = new RegExp(`\\b${dict.from}\\b`, 'gi');
    translated = translated.replace(regex, dict.to);
  }
  
  return translated;
}

/**
 * Runs the full System 3 text processing pipeline on an array of reviews.
 * @param {string} rawInput 
 * @param {boolean} censorMode 
 * @param {string} outputLanguage 
 * @param {function} stepCallback Callback triggered as each step completes
 */
export function runSystem3Pipeline(rawInput, censorMode = true, outputLanguage = "en", stepCallback = null) {
  // Step 0: Ingest & Parse
  let lines = [];
  try {
    // If it's a JSON array, parse it
    if (rawInput.trim().startsWith("[")) {
      lines = JSON.parse(rawInput);
    } else {
      // Split by newline and omit empty lines
      lines = rawInput.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    }
  } catch (e) {
    lines = rawInput.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  }

  const results = {
    totalReviews: lines.length,
    languages: {},
    profanitiesSuppressed: 0,
    emojiCount: 0,
    averageRating: 0.0,
    sentencesProcessed: 0,
    aspectsData: {
      quality: { positive: 0, total: 0, feedback: [] },
      performance: { positive: 0, total: 0, feedback: [] },
      price: { positive: 0, total: 0, feedback: [] },
      support: { positive: 0, total: 0, feedback: [] }
    },
    preservedNumbers: [],
    detectedEmojis: [],
    processedReviews: [],
    finalSummary: ""
  };

  let ratingsSum = 0;
  let ratingsCount = 0;
  let totalSentimentScore = 0;
  let totalProfaneSentencesCount = 0;

  // Let's process lines sequentially
  lines.forEach((line, index) => {
    // 1. Star rating parsing
    let rating = parseStarRating(line);
    let reviewTextClean = line.replace(/\[?([1-5]\s*★|★{1,5}☆{0,4})\]?/g, "").trim();

    // 2. Language Detection
    const lang = detectLanguage(reviewTextClean);
    results.languages[lang] = (results.languages[lang] || 0) + 1;

    // 3. Profanity scanning & Normalization
    const profResult = processProfanity(reviewTextClean, lang, censorMode);
    if (profResult.profaneWords.length > 0) {
      results.profanitiesSuppressed += profResult.profaneWords.length;
      totalProfaneSentencesCount++;
    }

    // 4. Emoji scan
    const emojiResult = analyzeEmojis(profResult.cleanText);
    results.emojiCount += emojiResult.detectedEmojis.length;
    emojiResult.detectedEmojis.forEach(em => {
      if (!results.detectedEmojis.includes(em)) {
        results.detectedEmojis.push(em);
      }
    });

    // 5. Spoiler shield
    const spoilerResult = applySpoilerShield(profResult.cleanText);

    // 6. Facts preservation
    const numbers = extractNumericFacts(reviewTextClean);
    numbers.forEach(num => {
      if (!results.preservedNumbers.includes(num)) {
        results.preservedNumbers.push(num);
      }
    });

    // 7. Base sentiment scoring (combining emojis, ratings, and language keywords)
    let reviewBaseSentiment = 0; // -1 to +1
    if (rating !== null) {
      ratingsSum += rating;
      ratingsCount++;
      reviewBaseSentiment += (rating - 3) / 2; // maps 1-5 to -1 to +1
    }
    reviewBaseSentiment += emojiResult.sentiment * 0.5;

    // Word base sentiment check (simple English heuristic)
    const enText = translateToEnglish(spoilerResult.cleanText, lang).toLowerCase();
    const positiveWords = ["excellent", "good", "great", "awesome", "love", "amazing", "beautiful", "smooth", "perfect", "worth", "best"];
    const negativeWords = ["bad", "terrible", "poor", "worst", "lag", "slow", "expensive", "waste", "disappointing", "broken", "flimsy", "sucks"];
    
    positiveWords.forEach(w => { if (enText.includes(w)) reviewBaseSentiment += 0.3; });
    negativeWords.forEach(w => { if (enText.includes(w)) reviewBaseSentiment -= 0.3; });

    // Clamp sentiment to range [-1.0, 1.0]
    reviewBaseSentiment = Math.max(-1.0, Math.min(1.0, reviewBaseSentiment));
    totalSentimentScore += reviewBaseSentiment;

    // 8. Aspect extraction and sentiment mapping
    const aspects = extractAspects(reviewTextClean);
    aspects.forEach(asp => {
      results.aspectsData[asp].total++;
      if (reviewBaseSentiment >= 0.1) {
        results.aspectsData[asp].positive++;
      }
      
      // Store cleaned, translated, spoiler-free sentence snippet for summarization feedback
      let cleanSentence = spoilerResult.cleanText;
      if (censorMode) {
        // Strip out spoiler tag markers in the summary itself, or just make it smooth
        cleanSentence = cleanSentence.replace(/\[SPOILER GUARDED:\s*([^\]]+)\]/g, "[content omitted for spoiler shield]");
      }
      const englishSentence = translateToEnglish(cleanSentence, lang);
      results.aspectsData[asp].feedback.push({
        text: englishSentence,
        sentiment: reviewBaseSentiment
      });
    });

    results.processedReviews.push({
      original: line,
      language: lang,
      rating: rating,
      profanities: profResult.profaneWords,
      cleanText: profResult.cleanText,
      spoilerCleanText: spoilerResult.cleanText,
      hasSpoiler: spoilerResult.hasSpoiler,
      sentiment: reviewBaseSentiment
    });

    results.sentencesProcessed++;
  });

  // Calculate Aggregates
  results.averageRating = ratingsCount > 0 ? (ratingsSum / ratingsCount) : 3.5;
  // Map sentiment to percentage scale (0% is fully negative, 50% neutral, 100% positive)
  const netSentimentPct = Math.round(((totalSentimentScore / Math.max(1, results.sentencesProcessed)) + 1) * 50);
  results.netSentiment = netSentimentPct;
  results.profanityRatio = Math.round((totalProfaneSentencesCount / Math.max(1, results.sentencesProcessed)) * 100);

  // Compile Aspect Summaries
  const summaryAspects = {};
  for (const [asp, data] of Object.entries(results.aspectsData)) {
    const score = data.total > 0 ? (data.positive / data.total) : null;
    let description = "";

    if (score !== null) {
      if (score >= 0.75) {
        if (asp === "quality") description = "Very high-quality build and materials. Users express high satisfaction with product durability.";
        else if (asp === "performance") description = "Outstanding performance metrics. Users report extremely fast operations and reliable screen specs.";
        else if (asp === "price") description = "Great value for money. Most reviews consider the pricing fair relative to capabilities.";
        else if (asp === "support") description = "Superb delivery experience. Fast, clean box, and highly supportive helpdesk.";
      } else if (score >= 0.4) {
        if (asp === "quality") description = "Users praise the high quality craftsmanship, though some note minor visual imperfections.";
        else if (asp === "performance") description = "Exceptional performance, specifically praised for its speed and reliable battery life.";
        else if (asp === "price") description = "Presents standard value. Some users note it is worth the cost, while others describe it as slightly expensive.";
        else if (asp === "support") description = "Generally good shipping speed, with responsive customer service to handle issues.";
      } else {
        if (asp === "quality") description = "Poor build quality reported, with plastic parts breaking easily.";
        else if (asp === "performance") description = "Sluggish speed and disappointing battery lifecycle.";
        else if (asp === "price") description = "Overpriced. Poor ratio of features to financial investment.";
        else if (asp === "support") description = "Logistical complaints regarding slow shipping times and damaged packages.";
      }
      summaryAspects[asp] = {
        score: Math.round(score * 100),
        summary: description
      };
    } else {
      // Default placeholder if aspect is not mentioned
      summaryAspects[asp] = {
        score: null,
        summary: "No user reviews mentioned this feature aspect specifically."
      };
    }
  }

  results.summaryAspects = summaryAspects;

  // Decide overall recommendation
  let overallVerdict = "Neutral";
  if (results.averageRating >= 4.3 && results.netSentiment >= 75) overallVerdict = "Strong Buy";
  else if (results.averageRating >= 3.6 && results.netSentiment >= 60) overallVerdict = "Buy";
  else if (results.averageRating < 2.8 || results.netSentiment < 40) overallVerdict = "Pass";

  results.overallVerdict = overallVerdict;

  // Trigger Step callbacks (for simulation animations)
  if (stepCallback) {
    let delay = 0;
    // Step 1: Language
    setTimeout(() => {
      stepCallback(1, {
        summary: `Detected languages: ${Object.entries(results.languages).map(([l, c]) => `${l.toUpperCase()} (${c})`).join(", ")}`,
        data: results.processedReviews.map(r => ({ text: r.original, lang: r.language }))
      });
    }, delay += 100);

    // Step 2: Profanity Detect
    setTimeout(() => {
      const detectedCount = results.processedReviews.reduce((sum, r) => sum + r.profanities.length, 0);
      stepCallback(2, {
        summary: `Scanned text. Detected ${detectedCount} profane words across reviews.`,
        data: results.processedReviews.filter(r => r.profanities.length > 0).map(r => ({ text: r.original, profanities: r.profanities }))
      });
    }, delay += 800);

    // Step 3: Censor & Normalize
    setTimeout(() => {
      stepCallback(3, {
        summary: censorMode ? "Contextual normalization applied: coarse language replaced with neutral equivalents." : "Standard mask filtering applied: vulgar words starred out.",
        data: results.processedReviews.map(r => ({ original: r.original, cleaned: r.cleanText }))
      });
    }, delay += 800);

    // Step 4: Emoji & Spoilers
    setTimeout(() => {
      const spoilerCount = results.processedReviews.filter(r => r.hasSpoiler).length;
      stepCallback(4, {
        summary: `Extracted ${results.emojiCount} emojis. Shielded ${spoilerCount} spoiler entries. Extracted numbers: ${results.preservedNumbers.join(", ")}`,
        data: results.processedReviews.map(r => ({ text: r.spoilerCleanText, emojis: r.detectedEmojis, numbers: extractNumericFacts(r.original) }))
      });
    }, delay += 800);

    // Step 5: Aspect Summarize
    setTimeout(() => {
      // Translate the actual summary if language selection is non-English
      const translatedSummary = translateSummary(results, outputLanguage);
      results.finalSummary = translatedSummary;
      stepCallback(5, {
        summary: `Summarization compiled successfully in ${outputLanguage.toUpperCase()}! Directing data to dashboard.`,
        data: results
      });
    }, delay += 800);
  } else {
    results.finalSummary = translateSummary(results, outputLanguage);
  }

  return results;
}

/**
 * Local helper to translate output summaries to French, German, or Spanish
 * @param {object} data 
 * @param {string} targetLang 
 * @returns {object} translated summary package
 */
function translateSummary(data, targetLang) {
  const output = {
    verdict: data.overallVerdict,
    aspects: {}
  };

  const dictionary = TARGET_TRANSLATIONS[targetLang];
  
  if (!dictionary) {
    // English (Default)
    output.verdictText = data.overallVerdict;
    for (const [asp, aspectData] of Object.entries(data.summaryAspects)) {
      output.aspects[asp] = {
        name: asp.charAt(0).toUpperCase() + asp.slice(1),
        score: aspectData.score,
        summary: aspectData.summary
      };
    }
    return output;
  }

  // Translation available
  output.verdictText = dictionary[data.overallVerdict] || data.overallVerdict;
  
  for (const [asp, aspectData] of Object.entries(data.summaryAspects)) {
    const aspectName = dictionary[asp.charAt(0).toUpperCase() + asp.slice(1)] || asp;
    const translatedText = dictionary[aspectData.summary] || aspectData.summary;
    output.aspects[asp] = {
      name: aspectName,
      score: aspectData.score,
      summary: translatedText
    };
  }

  return output;
}
