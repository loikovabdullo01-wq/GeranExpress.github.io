const fs = require('fs');
const path = require('path');

const files = ['geran_raw.json','geran_raw_2.json','geran_raw_3.json','geran_raw_4.json','geran_raw_5.json','geran_raw_6.json'];
let raw = [];
for (const f of files) {
  raw = raw.concat(JSON.parse(fs.readFileSync(path.join(__dirname, f), 'utf8')));
}
console.log('Total raw items:', raw.length);

// ---- category keyword classifier -----------------------------------------
const RULES = [
  { cat: 'services', kws: ['услуга','услуги','усто ','усто-','усто|','ремонт','настройк','установк','перевозк','такси','электрик','сварчик','парикмахер','сартарош','моторол','погрузчик','лодр','вулканиз','мастер','доставк','куръер','курьер','аренда','растамож','мечаспонем','фрион мезанем','духтур','кандани','апаловка','монолитщик','подключение','подключ'] },
  { cat: 'realty', kws: ['хона','квартир','кварти','этажн','соток','жк ','жк«','жк"','недвижим'] },
  { cat: 'transport', kws: ['opel','toyota','camry','мотоцикл','мотосикл','мототцикл','скутер','электровелосипед','электроскутер','велосипед','газель','газел','камаз','зил ','зил қ','трактор','portер','портер фуруши','moto','truck bike','daeevo','лада','нива','вектра','форланд','мтз'] },
  { cat: 'animals', kws: ['бузи','пишак','гову мол','кошка','собака','гов, гусфанд'] },
  { cat: 'electronics', kws: ['iphone','айфон','redmi','samsung','xiaomi','ipad','наушник','гарнитур','зарядник','зарядно','кабель usb','usb ','usb-','клавиатур','мышк','web камера','вебкамер','монитор','пульт xbox','playstation','диск-xbox','ноутбук','laptop','ardor gaming','rtx','core i5','windows','соати ҳушманд','микрофон','колонка','кулер','alcatel','apple 17','sm-b310e','флешка','powerbank'] },
  { cat: 'tools', kws: ['молоток','дрель','ключ','кувалда','пассатиж','ножниц','шпакл','болгарк','перфоратор','шуруповерт','yatw','total ','насос','вентилятор запчаст'] },
  { cat: 'home', kws: ['холодильник','диван','шкаф','кресло','стол ','мебель','индук','миксер','фен ','терка','тёрка','натижной потолок','рабочее место'] },
  { cat: 'beauty', kws: ["men's collection",'eclat','venture power','scope time loop','шампун'] },
  { cat: 'fashion', kws: ['футболк','майки','кроссов','куртк','платье','шлёпк','шлепк','тапочк'] },
  { cat: 'hobby', kws: ['кубик рубик','стикер'] },
  { cat: 'sport', kws: ['мяч ','скейт'] },
  { cat: 'books', kws: ['английского языка'] },
];

function classify(title) {
  const t = title.toLowerCase();
  for (const rule of RULES) {
    if (rule.kws.some((k) => t.includes(k))) return rule.cat;
  }
  return 'other';
}

// ---- price parsing ---------------------------------------------------------
function parsePrice(rawPrice) {
  const trimmed = rawPrice.trim();
  const withoutC = trimmed.replace(/\s*c\.?$/i, '').trim();
  const numeric = withoutC.replace(/\s+/g, '').replace(',', '.');
  if (/^\d+(\.\d+)?$/.test(numeric)) {
    return { price: parseFloat(numeric), priceText: null };
  }
  return { price: 0, priceText: withoutC || trimmed };
}

function isSold(priceText, title) {
  if (!priceText) return false;
  const s = (priceText + ' ' + title).toLowerCase();
  return s.includes('продано') || s.includes('нет в наличии');
}

// ---- date parsing (DD.MM.YY -> timestamp) ----------------------------------
function parseDate(d) {
  const m = /^(\d{2})\.(\d{2})\.(\d{2})$/.exec(d.trim());
  if (!m) return Date.now();
  const [, dd, mm, yy] = m;
  return new Date(2000 + parseInt(yy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10)).getTime();
}

// ---- condition mapping ------------------------------------------------------
function parseCondition(c) {
  const s = c.trim().toLowerCase();
  if (s.startsWith('нов')) return 'Новое';
  if (s.startsWith('б.у') || s.startsWith('б/у')) return 'Б/у';
  return 'Новое';
}

function esc(s) { return s; }

let seed = 1;
function rand() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }

const CAT_ICON = {
  services: '🛠️', realty: '🏠', transport: '🚗', animals: '🐾', electronics: '📱',
  tools: '🔧', home: '🛋️', beauty: '💄', fashion: '👕', hobby: '🎨', sport: '🏀', books: '📚', other: '🏷️',
};
const GRADIENTS = [
  ['#16A34A','#4ADE80'], ['#22C55E','#38BDF8'], ['#34D399','#22C58B'], ['#4ADE80','#16A34A'],
  ['#10B981','#4ADE80'], ['#22C58B','#4FACFE'], ['#16A34A','#84CC16'], ['#059669','#34D399'],
];

const catCounts = {};
const processed = raw.map((item, i) => {
  const cat = classify(item.title);
  catCounts[cat] = (catCounts[cat] || 0) + 1;
  const { price, priceText } = parsePrice(item.price);
  const village = item.meta[0].replace('📍', '').trim();
  const createdAt = parseDate(item.meta[1]);
  const condition = parseCondition(item.meta[2] || 'Новый');
  const sold = isSold(priceText, item.title);
  const g = GRADIENTS[i % GRADIENTS.length];

  return {
    id: 'gr' + (i + 1),
    title: item.title.trim(),
    price: price,
    priceText: priceText,
    category: cat,
    condition: condition,
    description: `Объявление с сайта geran-express.online. Локация: ${village}. Состояние: ${condition}.`,
    city: village || 'Дехаи Геран',
    sellerId: 'geran',
    icon: CAT_ICON[cat] || '🏷️',
    gradient: g,
    photos: [item.img],
    createdAt: createdAt,
    views: Math.floor(rand() * 300) + 5,
    status: sold ? 'sold' : 'active',
    mine: false,
  };
});

console.log('Category distribution:', catCounts);
console.log('Sold items:', processed.filter((p) => p.status === 'sold').length);
console.log('Non-numeric price (priceText) items:', processed.filter((p) => p.priceText).length);

const outPath = path.join(__dirname, '..', 'js', 'geran-listings.js');
const header = `/* ==========================================================================
   Real listings imported from https://geran-express.online (the user's live
   Geran Express marketplace). Titles, prices, categories (best-effort from
   card text), villages, dates and PHOTOS (linked directly from the site's
   i.ibb.co image host) are the real scraped data. Descriptions are generic
   placeholders — full descriptions live only on each item's detail page on
   the source site and were not scraped (255 detail pages was out of scope).
   Auto-generated by scripts/process_geran.js — do not hand-edit, regenerate
   instead if the raw data changes.
   ========================================================================== */

const GERAN_CATALOG_LISTINGS = `;

fs.writeFileSync(outPath, header + JSON.stringify(processed, null, 2) + ';\n');
console.log('Wrote', outPath);
