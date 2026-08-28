
const CATEGORIES = [
  { id: "all", get name() { return t("cat.all"); }, icon: "✨" },
  { id: "services", get name() { return t("cat.services"); }, icon: "🛠️" },
  { id: "electronics", get name() { return t("cat.electronics"); }, icon: "📱" },
  { id: "fashion", get name() { return t("cat.fashion"); }, icon: "👕" },
  { id: "home", get name() { return t("cat.home"); }, icon: "🛋️" },
  { id: "transport", get name() { return t("cat.transport"); }, icon: "🚗" },
  { id: "realty", get name() { return t("cat.realty"); }, icon: "🏠" },
  { id: "tools", get name() { return t("cat.tools"); }, icon: "🔩" },
  { id: "kids", get name() { return t("cat.kids"); }, icon: "🧸" },
  { id: "hobby", get name() { return t("cat.hobby"); }, icon: "🎨" },
  { id: "sport", get name() { return t("cat.sport"); }, icon: "🏀" },
  { id: "beauty", get name() { return t("cat.beauty"); }, icon: "💄" },
  { id: "books", get name() { return t("cat.books"); }, icon: "📚" },
  { id: "animals", get name() { return t("cat.animals"); }, icon: "🐾" },
  { id: "other", get name() { return t("cat.other"); }, icon: "🏷️" },
];

const GRADIENTS = [
  ["#7C6CF6", "#B98CF0"],
  ["#FF8A65", "#FFC371"],
  ["#42D6A4", "#3FBFB2"],
  ["#4FACFE", "#7C6CF6"],
  ["#FF6B9C", "#FF8A65"],
  ["#38B6FF", "#42D6A4"],
  ["#FFB86B", "#FF6B9C"],
  ["#A66CF6", "#4FACFE"],
];

const CITIES = ["Душанбе", "Худжанд", "Бохтар", "Куляб", "Истаравшан", "Канибадом", "Турсунзаде", "Пенджикент", "Вахдат", "Хорог"];

const AVATAR_EMOJI = ["🧑", "👩", "🧔", "👨‍💻", "👩‍🎨", "🧑‍🚀", "👨‍🍳", "👩‍⚕️", "🧑‍🎤", "👴", "👵", "🧕"];

function pick(arr, seed) {
  return arr[seed % arr.length];
}

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const USERS = [
  { id: "me", name: "Вы", city: "Душанбе", avatar: "🙂", phone: "+992 900 00 00 00", memberSince: "2026", verified: false, about: "" },
  { id: "u1", name: "Азиз Каримов", city: "Душанбе", avatar: "🧑", phone: "+992 918 11 22 33", rating: 4.9, reviews: 34, sales: 61, memberSince: "2021", verified: true, about: "Электроника и гаджеты. Только рабочее состояние." },
  { id: "u2", name: "Дилноза Юсупова", city: "Худжанд", avatar: "👩", phone: "+992 927 22 33 44", rating: 4.7, reviews: 21, sales: 40, memberSince: "2022", verified: true, about: "Люблю красивые вещи и делюсь ими 💫" },
  { id: "u3", name: "Тимур Ахметов", city: "Бохтар", avatar: "🧔", phone: "+992 935 33 44 55", rating: 4.6, reviews: 15, sales: 22, memberSince: "2023", verified: false, about: "Продаю технику после апгрейда." },
  { id: "u4", name: "Мадина Рахимова", city: "Куляб", avatar: "👩‍🎨", phone: "+992 902 44 55 66", rating: 5.0, reviews: 9, sales: 14, memberSince: "2024", verified: true, about: "Хендмейд и винтаж." },
  { id: "u5", name: "Санжар Юлдашев", city: "Душанбе", avatar: "👨‍💻", phone: "+992 919 55 66 77", rating: 4.5, reviews: 27, sales: 33, memberSince: "2020", verified: true, about: "Быстрая доставка, честные фото." },
  { id: "u6", name: "Камила Ортикова", city: "Истаравшан", avatar: "🧑‍🎤", phone: "+992 927 66 77 88", rating: 4.9, reviews: 18, sales: 25, memberSince: "2022", verified: false, about: "" },
  { id: "geran", name: "Geran Express", city: "Деҳаи Геран", avatar: "🟢", avatarImg: "assets/logo-icon.png", phone: "+992 971 220 800", rating: 4.9, reviews: 46, sales: 212, memberSince: "2024", verified: true, about: "Официальная витрина маркетплейса Geran Express — товары и услуги со всего района. Тел.: +992 971 220 800" },
];

const LISTING_SEEDS = [
  { title: "iPhone 13 Pro, 256GB", price: 5800000, cat: "electronics", cond: "Б/у, отличное" },
  { title: "Наушники AirPods Pro 2", price: 950000, cat: "electronics", cond: "Новое" },
  { title: "Кожаная куртка, размер M", price: 420000, cat: "fashion", cond: "Б/у, хорошее" },
  { title: "Диван угловой, серый", price: 2100000, cat: "home", cond: "Б/у, хорошее" },
  { title: "Велосипед горный Trek", price: 1650000, cat: "sport", cond: "Б/у, отличное" },
  { title: "Автомобиль Chevrolet Cobalt 2019", price: 89000000, cat: "transport", cond: "Б/у" },
  { title: "Коляска детская 3в1", price: 1200000, cat: "kids", cond: "Б/у, хорошее" },
  { title: "Набор акварельных красок", price: 85000, cat: "hobby", cond: "Новое" },
  { title: "Гитара акустическая Yamaha", price: 980000, cat: "hobby", cond: "Б/у, отличное" },
  { title: "Кроссовки Nike Air Max, 42", price: 380000, cat: "fashion", cond: "Новое" },
  { title: "Фен Dyson Supersonic", price: 1450000, cat: "beauty", cond: "Б/у, отличное" },
  { title: "MacBook Air M2 13″", price: 8900000, cat: "electronics", cond: "Б/у, идеальное" },
  { title: "Стол письменный дубовый", price: 640000, cat: "home", cond: "Б/у, хорошее" },
  { title: "Мяч баскетбольный Wilson", price: 95000, cat: "sport", cond: "Новое" },
  { title: "Книги по программированию (10 шт)", price: 220000, cat: "books", cond: "Б/у, хорошее" },
  { title: "Клетка для попугая с аксессуарами", price: 310000, cat: "animals", cond: "Б/у, хорошее" },
  { title: "Игровая приставка PlayStation 5", price: 6200000, cat: "electronics", cond: "Б/у, отличное" },
  { title: "Платье вечернее, размер S", price: 290000, cat: "fashion", cond: "Новое" },
  { title: "Palette теней MAC", price: 150000, cat: "beauty", cond: "Новое" },
  { title: "Скейтборд Element", price: 340000, cat: "sport", cond: "Б/у, хорошее" },
  { title: "Часы Casio G-Shock", price: 520000, cat: "fashion", cond: "Б/у, отличное" },
  { title: "Кресло офисное эргономичное", price: 890000, cat: "home", cond: "Б/у, хорошее" },
  { title: "Самокат электрический Xiaomi", price: 2450000, cat: "transport", cond: "Б/у, отличное" },
  { title: "Конструктор LEGO Technic", price: 480000, cat: "kids", cond: "Новое" },
];

const GENERIC_SELLERS = USERS.filter((u) => u.id !== "me" && u.id !== "geran");

function buildListings() {
  const listings = [];
  LISTING_SEEDS.forEach((seed, i) => {
    const seller = pick(GENERIC_SELLERS, i + 3);
    const g = pick(GRADIENTS, i);
    const cat = CATEGORIES.find((c) => c.id === seed.cat);
    const daysAgo = Math.floor(seededRandom(i * 7 + 1) * 20);
    listings.push({
      id: "l" + (i + 1),
      title: seed.title,
      price: seed.price,
      category: seed.cat,
      condition: seed.cond,
      description:
        "Состояние: " + seed.cond + ". Продаю в связи с ненадобностью. Торг уместен при осмотре. Пишите в чат — отвечаю быстро, отправлю дополнительные фото по запросу.",
      city: pick(CITIES, i + 2),
      sellerId: seller.id,
      icon: cat.icon,
      gradient: g,
      createdAt: Date.now() - daysAgo * 86400000,
      views: 20 + Math.floor(seededRandom(i * 3 + 2) * 400),
      status: "active",
      mine: false,
    });
  });
  return listings;
}

const REVIEW_TEXTS = [
  "Всё супер, товар как на фото, продавец на связи!",
  "Быстрая сделка, рекомендую.",
  "Хорошее состояние, немного торговались — сошлись на цене.",
  "Продавец вежливый, встретились и всё забрал(а) без проблем.",
  "Чуть задержался с ответом, но в итоге всё отлично.",
  "Товар полностью соответствует описанию.",
];

function buildReviews() {
  const map = {};
  USERS.forEach((u, idx) => {
    if (u.id === "me") return;
    const count = 2 + (idx % 3);
    map[u.id] = Array.from({ length: count }).map((_, i) => ({
      id: u.id + "-r" + i,
      author: pick(USERS, idx + i + 1).name,
      avatar: pick(AVATAR_EMOJI, idx + i),
      rating: 4 + Math.round(seededRandom(idx * 11 + i)),
      text: pick(REVIEW_TEXTS, idx + i * 2),
      daysAgo: (idx + i) * 3 + 1,
    }));
  });
  return map;
}

const CITY_COORDS = {
  "\u0414\u0443\u0448\u0430\u043d\u0431\u0435": [38.5598, 68.7870],
  "\u0425\u0443\u0434\u0436\u0430\u043d\u0434": [40.2833, 69.6333],
  "\u0411\u043e\u0445\u0442\u0430\u0440": [37.8339, 68.7800],
  "\u041a\u0443\u043b\u044f\u0431": [37.9139, 69.7800],
  "\u0418\u0441\u0442\u0430\u0440\u0430\u0432\u0448\u0430\u043d": [39.9081, 69.0031],
  "\u041a\u0430\u043d\u0438\u0431\u0430\u0434\u043e\u043c": [40.2900, 70.4200],
  "\u0422\u0443\u0440\u0441\u0443\u043d\u0437\u0430\u0434\u0435": [38.5019, 68.2311],
  "\u041f\u0435\u043d\u0434\u0436\u0438\u043a\u0435\u043d\u0442": [39.4964, 67.6081],
  "\u0412\u0430\u0445\u0434\u0430\u0442": [38.5500, 69.0167],
  "\u0425\u043e\u0440\u043e\u0433": [37.4911, 71.5497],
  "\u0413\u043e\u0440\u043e\u0434 \u041a\u0430\u0437\u0430\u043d\u044c": [55.7963, 49.1088],
};
const GERAN_REGION_CENTER = [37.9900, 69.2500];

function coordsForLocation(name) {
  if (!name) return GERAN_REGION_CENTER.slice();
  const clean = normalizeCity(name);
  if (CITY_COORDS[clean]) return CITY_COORDS[clean].slice();
  let hash = 0;
  for (let i = 0; i < clean.length; i++) hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
  const dLat = (((hash >> 10) % 1000) / 1000 - 0.5) * 0.12;
  const dLng = ((hash % 1000) / 1000 - 0.5) * 0.16;
  return [GERAN_REGION_CENTER[0] + dLat, GERAN_REGION_CENTER[1] + dLng];
}

function normalizeCity(name) {
  if (!name) return name;
  return String(name)
    .replace(/\s*\([^)]*\)\s*/g, " ")   
    .replace(/\u04b3/g, "\u0445").replace(/\u04b2/g, "\u0425")     
    .replace(/\u0420\u0430\u0439\u043e\u043d\u0438/gi, "\u0420\u0430\u0451\u043d\u0438")
    .replace(/\s+/g, " ")
    .trim();
}

const MOCK_LISTINGS = [...(typeof GERAN_CATALOG_LISTINGS !== "undefined" ? GERAN_CATALOG_LISTINGS : [])];

const NEWS_ITEMS = [
  { id: "n1", icon: "\ud83c\udf89", title: "\u0414\u043e\u0431\u0440\u043e \u043f\u043e\u0436\u0430\u043b\u043e\u0432\u0430\u0442\u044c \u0432 Geran Express", text: "\u0412 \u043f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u0438 255 \u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u044b\u0445 \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0439 \u0441\u043e \u0432\u0441\u0435\u0433\u043e \u0440\u0430\u0439\u043e\u043d\u0430.", daysAgo: 0 },
  { id: "n2", icon: "\ud83d\udee0\ufe0f", title: "\u0423\u0441\u043b\u0443\u0433\u0438 \u0440\u044f\u0434\u043e\u043c \u0441 \u0432\u0430\u043c\u0438", text: "\u0423\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0430, \u0440\u0435\u043c\u043e\u043d\u0442, \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0430, \u0442\u0430\u043a\u0441\u0438 \u2014 \u0441\u043c\u043e\u0442\u0440\u0438\u0442\u0435 \u0432 \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u0438 \u00ab\u0423\u0441\u043b\u0443\u0433\u0438\u00bb.", daysAgo: 1 },
  { id: "n3", icon: "\ud83d\udcf1", title: "\u041d\u043e\u0432\u0430\u044f \u044d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u0438\u043a\u0430", text: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d\u044b, \u043d\u0430\u0443\u0448\u043d\u0438\u043a\u0438 \u0438 \u0430\u043a\u0441\u0435\u0441\u0441\u0443\u0430\u0440\u044b \u043a\u0430\u0436\u0434\u0443\u044e \u043d\u0435\u0434\u0435\u043b\u044e.", daysAgo: 2 },
  { id: "n4", icon: "\ud83d\udcac", title: "\u041f\u0438\u0448\u0438\u0442\u0435 \u043f\u0440\u043e\u0434\u0430\u0432\u0446\u0430\u043c \u043d\u0430\u043f\u0440\u044f\u043c\u0443\u044e", text: "\u041e\u0442\u043a\u0440\u043e\u0439\u0442\u0435 \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0435 \u0438 \u043d\u0430\u0436\u043c\u0438\u0442\u0435 \u00ab\u041d\u0430\u043f\u0438\u0441\u0430\u0442\u044c \u043f\u0440\u043e\u0434\u0430\u0432\u0446\u0443\u00bb.", daysAgo: 3 },
  { id: "n5", icon: "\ud83d\udce6", title: "\u0420\u0430\u0437\u043c\u0435\u0441\u0442\u0438\u0442\u0435 \u0441\u0432\u043e\u0439 \u0442\u043e\u0432\u0430\u0440", text: "\u041d\u0430\u0436\u043c\u0438\u0442\u0435 \u00ab+\u00bb \u0432\u043d\u0438\u0437\u0443 \u2014 \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u044f \u0431\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u0430\u044f.", daysAgo: 5 },
];

const DATA_VERSION = "2026-08-26-geran-255-map";
MOCK_LISTINGS.forEach((l) => {
  l.city = normalizeCity(l.city);
  if (l.lat == null || l.lng == null) {
    const [lat, lng] = coordsForLocation(l.city);
    l.lat = lat; l.lng = lng;
  }
});

const MOCK_REVIEWS = buildReviews();

function formatPrice(listing) {
  if (typeof listing === "number") return listing.toLocaleString("ru-RU") + " " + t("currency");
  if (listing && listing.priceText) return listing.priceText;
  return listing.price.toLocaleString("ru-RU") + " " + t("currency");
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return t("time.today");
  if (days === 1) return t("time.yesterday");
  if (days < 7) return days + " " + t("time.days");
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks + " " + t("time.weeks");
  return Math.floor(days / 30) + " " + t("time.months");
}

function conditionLabel(cond) {
  const c = String(cond || "");
  if (c.startsWith("Новое") || c.startsWith("Нов")) return t("cond.new");
  if (c.startsWith("Б/у, хорошее")) return t("cond.usedGood");
  if (c.startsWith("Б/у") || c.startsWith("Б.у")) return t("cond.used");
  return c;
}
