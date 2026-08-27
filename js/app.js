
(function () {
  "use strict";

  const LS = {
    theme: "bh_theme",
    favorites: "bh_favorites",
    listings: "bh_listings",
    chats: "bh_chats",
    dataVersion: "bh_data_version",
    notifSeen: "bh_notif_seen",
    meProfile: "bh_me_profile",
    authed: "bh_authed",
  };

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function saveJSON(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
    }
  }
  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  }
  function esc(str) {
    const d = document.createElement("div");
    d.textContent = str == null ? "" : String(str);
    return d.innerHTML;
  }

  function loadCatalog() {
    const cached = loadJSON(LS.listings, null);
    const cachedVersion = loadJSON(LS.dataVersion, null);
    const fresh = JSON.parse(JSON.stringify(MOCK_LISTINGS));
    if (!cached || cachedVersion !== DATA_VERSION) {
      const mine = (cached || []).filter((l) => l.mine);
      return [...mine, ...fresh];
    }
    return cached;
  }

  const state = {
    theme: loadJSON(LS.theme, null) || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
    favorites: new Set(loadJSON(LS.favorites, [])),
    listings: loadCatalog(),
    chats: loadJSON(LS.chats, {}),
    meProfile: loadJSON(LS.meProfile, {}),
    isAuthed: loadJSON(LS.authed, false),
    currentTab: "home",
    filters: { category: "all", query: "", location: null, priceMin: null, priceMax: null, condition: null, sort: "new" },
  };
  saveJSON(LS.listings, state.listings);
  saveJSON(LS.dataVersion, DATA_VERSION);

  function persistFavorites() { saveJSON(LS.favorites, Array.from(state.favorites)); }
  function persistListings() { saveJSON(LS.listings, state.listings); }
  function persistChats() { saveJSON(LS.chats, state.chats); }
  function persistMeProfile() { saveJSON(LS.meProfile, state.meProfile); }

  function getUser(id) {
    const u = USERS.find((x) => x.id === id) || USERS[0];
    return u.id === "me" ? { ...u, ...state.meProfile } : u;
  }
  function getListing(id) { return state.listings.find((l) => l.id === id); }

  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    saveJSON(LS.theme, theme);
    const sw = document.getElementById("profileThemeSwitch");
    if (sw) sw.checked = theme === "dark";
  }
  function toggleTheme() { applyTheme(state.theme === "dark" ? "light" : "dark"); }

  let toastTimer = null;
  function showToast(msg) {
    const t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  function gradientFallback(listing, cls) {
    const [c1, c2] = listing.gradient || ["#16A34A", "#4ADE80"];
    return `<div class="${cls}" style="background:linear-gradient(135deg, ${c1}, ${c2});"><span>${listing.icon || "\ud83d\udce6"}</span></div>`;
  }

  function cardPhotoInner(listing) {
    if (listing.photos && listing.photos.length) {
      return `<div class="photo-skeleton"></div>
        <img src="${esc(listing.photos[0])}" alt="" loading="lazy" data-photo="${esc(listing.id)}" />`;
    }
    return gradientFallback(listing, "photo-fallback");
  }

  function hydratePhotos(root) {
    root.querySelectorAll("img[data-photo]").forEach((img) => {
      if (img.dataset.hydrated) return;
      img.dataset.hydrated = "1";
      const listing = getListing(img.dataset.photo);
      const skeleton = img.previousElementSibling;

      const done = () => { img.classList.add("loaded"); if (skeleton) skeleton.classList.add("done"); };
      const fail = () => {
        img.remove();
        if (skeleton && listing) skeleton.outerHTML = gradientFallback(listing, "photo-fallback");
        else if (skeleton) skeleton.classList.add("done");
      };

      if (img.complete) {
        if (img.naturalWidth > 0) done(); else fail();
        return;
      }
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", fail, { once: true });
    });
  }

  function telHref(phone) {
    return String(phone || "").replace(/[^\d+]/g, "");
  }
  function waHref(phone, listing) {
    const digits = String(phone || "").replace(/\D/g, "");
    const text = encodeURIComponent(`Здравствуйте! Пишу по объявлению «${listing.title}» на Geran Express.`);
    return `https://wa.me/${digits}?text=${text}`;
  }

  function cardHTML(listing) {
    const fav = state.favorites.has(listing.id);
    const sold = listing.status === "sold";
    return `
    <article class="card" data-id="${listing.id}" role="button" tabindex="0">
      <div class="card-photo">
        ${cardPhotoInner(listing)}
        ${sold ? '<div class="badge-sold"><span>ПРОДАНО</span></div>' : ""}
        <button class="fav-btn ${fav ? "active" : ""}" data-fav="${listing.id}" aria-label="В избранное">
          <svg viewBox="0 0 24 24"><path d="M12 20.5s-7.6-4.7-10-9.4C.4 7.4 2.3 4 5.9 4c2 0 3.6 1 6.1 3.6C14.5 5 16.1 4 18.1 4c3.6 0 5.5 3.4 3.9 7.1-2.4 4.7-10 9.4-10 9.4Z"/></svg>
        </button>
      </div>
      <div class="card-body">
        <div class="card-price">${formatPrice(listing)}</div>
        <div class="card-title">${esc(listing.title)}</div>
        <div class="card-meta">
          <span>${esc(listing.city)}</span>
          <span>${timeAgo(listing.createdAt)}</span>
        </div>
      </div>
    </article>`;
  }

  function renderGrid(container, listings) {
    container.innerHTML = listings.map(cardHTML).join("");
    hydratePhotos(container);
  }

  function attachGridHandlers(container) {
    container.addEventListener("click", (e) => {
      const favBtn = e.target.closest("[data-fav]");
      if (favBtn) {
        e.stopPropagation();
        toggleFavorite(favBtn.dataset.fav, favBtn);
        return;
      }
      const card = e.target.closest(".card");
      if (card) openProductDetail(card.dataset.id);
    });
  }

  function toggleFavorite(id, btnEl) {
    const isFav = state.favorites.has(id);
    if (isFav) state.favorites.delete(id);
    else state.favorites.add(id);
    persistFavorites();
    if (btnEl) {
      btnEl.classList.toggle("active", !isFav);
      btnEl.classList.remove("pop");
      void btnEl.offsetWidth;
      btnEl.classList.add("pop");
    }
    document.querySelectorAll(`[data-fav="${id}"]`).forEach((b) => b.classList.toggle("active", !isFav));
    if (document.getElementById("tab-favorites").classList.contains("active")) renderFavoritesTab();
    if (!isFav) showToast("Добавлено в избранное ❤️");
  }

  function switchTab(tab) {
    state.currentTab = tab;
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    document.querySelectorAll(".tab-view").forEach((v) => v.classList.toggle("active", v.dataset.tab === tab));
    document.getElementById("searchRow").style.display = tab === "home" ? "flex" : "none";
    document.getElementById("quickFilterRow").style.display = tab === "home" ? "flex" : "none";
    document.getElementById("promoBanner").style.display = tab === "home" ? "block" : "none";
    if (tab === "favorites") renderFavoritesTab();
    if (tab === "listings") renderMyListingsTab();
    if (tab === "profile") renderProfileTab();
    document.getElementById("appMain").scrollTop = 0;
  }

  function updateQuickFilterUI() {
    const cat = CATEGORIES.find((c) => c.id === state.filters.category) || CATEGORIES[0];
    const isAll = state.filters.category === "all";
    document.getElementById("qfCategoryLabel").textContent = isAll ? "Категории" : cat.name;
    document.getElementById("qfCategoryEmo").textContent = isAll ? "\u{1F4C2}" : cat.icon;
    document.getElementById("qfCategory").classList.toggle("active", !isAll);

    document.getElementById("qfLocationLabel").textContent = state.filters.location || "Локация";
    document.getElementById("qfLocation").classList.toggle("active", !!state.filters.location);

    const oldFirst = state.filters.sort === "old";
    document.getElementById("qfSortLabel").textContent = oldFirst ? "Сначала старые" : "Сначала новые";
    document.getElementById("qfSort").classList.toggle("active", oldFirst);
    document.getElementById("qfPopular").classList.toggle("active", state.filters.sort === "popular");
  }

  function initQuickFilterRow() {
    document.getElementById("qfSort").addEventListener("click", () => {
      state.filters.sort = state.filters.sort === "old" ? "new" : "old";
      updateQuickFilterUI();
      renderHomeTab();
    });
    document.getElementById("qfPopular").addEventListener("click", () => {
      state.filters.sort = state.filters.sort === "popular" ? "new" : "popular";
      updateQuickFilterUI();
      renderHomeTab();
    });
    document.getElementById("qfCategory").addEventListener("click", openCategorySheet);
    document.getElementById("qfLocation").addEventListener("click", () =>
      openLocationSheet(state.filters.location, (loc) => {
        state.filters.location = loc;
        updateQuickFilterUI();
        renderHomeTab();
      })
    );
    document.getElementById("closeCategoryBtn").addEventListener("click", closeCategorySheet);
    document.getElementById("categoryOverlay").addEventListener("click", (e) => { if (e.target === e.currentTarget) closeCategorySheet(); });
    document.getElementById("closeLocationBtn").addEventListener("click", closeLocationSheet);
    document.getElementById("locationOverlay").addEventListener("click", (e) => { if (e.target === e.currentTarget) closeLocationSheet(); });
  }

  function openCategorySheet() {
    const grid = document.getElementById("categoryPickerGrid");
    grid.innerHTML = CATEGORIES.map(
      (c) => `<div class="category-opt ${c.id === state.filters.category ? "active" : ""}" data-cat="${c.id}"><span class="emo">${c.icon}</span>${c.name}</div>`
    ).join("");
    grid.querySelectorAll(".category-opt").forEach((opt) => {
      opt.addEventListener("click", () => {
        state.filters.category = opt.dataset.cat;
        updateQuickFilterUI();
        renderHomeTab();
        closeCategorySheet();
      });
    });
    document.getElementById("categoryOverlay").classList.add("open");
  }
  function closeCategorySheet() { document.getElementById("categoryOverlay").classList.remove("open"); }

  function openLocationSheet(currentValue, onSelect) {
    const majors = new Set(CITIES);
    const counts = {};
    state.listings.forEach((l) => { if (l.city) counts[l.city] = (counts[l.city] || 0) + 1; });

    const villages = Object.keys(counts).filter((c) => !majors.has(c)).sort((a, b) => counts[b] - counts[a]);
    const cityList = CITIES.slice().sort((a, b) => (counts[b] || 0) - (counts[a] || 0));

    const row = (name) => `
      <div class="location-item ${currentValue === name ? "active" : ""}" data-loc="${esc(name)}">
        <span class="loc-name">${esc(name)}</span>
        <span class="loc-count">${counts[name] || 0}</span>
        <span class="check">✓</span>
      </div>`;

    document.getElementById("locationList").innerHTML =
      `<div class="location-item ${!currentValue ? "active" : ""}" data-loc="">
         <span class="loc-name">Все локации</span>
         <span class="loc-count">${state.listings.length}</span>
         <span class="check">✓</span>
       </div>` +
      (villages.length ? `<div class="location-group-label">Районы и сёла</div>` + villages.map(row).join("") : "") +
      `<div class="location-group-label">Крупные города</div>` + cityList.map(row).join("");

    document.getElementById("locationList").querySelectorAll("[data-loc]").forEach((item) => {
      item.addEventListener("click", () => {
        onSelect(item.dataset.loc || null);
        closeLocationSheet();
      });
    });
    document.getElementById("locationOverlay").classList.add("open");
  }
  function closeLocationSheet() { document.getElementById("locationOverlay").classList.remove("open"); }

  function computeFilteredListings() {
    const f = state.filters;
    let list = state.listings.filter((l) => l.status !== "sold" || l.mine);
    if (f.category !== "all") list = list.filter((l) => l.category === f.category);
    if (f.location) list = list.filter((l) => l.city === f.location);
    if (f.query.trim()) {
      const q = f.query.trim().toLowerCase();
      list = list.filter((l) => l.title.toLowerCase().includes(q));
    }
    if (f.priceMin != null) list = list.filter((l) => l.price >= f.priceMin);
    if (f.priceMax != null) list = list.filter((l) => l.price <= f.priceMax);
    if (f.condition) list = list.filter((l) => l.condition.startsWith(f.condition === "Новое" ? "Новое" : "Б/у"));
    switch (f.sort) {
      case "old": list = list.slice().sort((a, b) => a.createdAt - b.createdAt); break;
      case "cheap": list = list.slice().sort((a, b) => a.price - b.price); break;
      case "expensive": list = list.slice().sort((a, b) => b.price - a.price); break;
      case "popular": list = list.slice().sort((a, b) => b.views - a.views); break;
      default: list = list.slice().sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  }

  function renderHomeTab() {
    const list = computeFilteredListings();
    const grid = document.getElementById("homeGrid");
    renderGrid(grid, list);
    document.getElementById("homeEmpty").hidden = list.length !== 0;
    grid.style.display = list.length ? "grid" : "none";
    document.getElementById("homeResultsCount").textContent = list.length ? list.length + " объявл." : "";
    const cat = CATEGORIES.find((c) => c.id === state.filters.category);
    document.getElementById("homeResultsTitle").textContent =
      state.filters.category === "all" ? "Все объявления" : cat.name;

    const hasActiveFilters = state.filters.priceMin != null || state.filters.priceMax != null || state.filters.condition || state.filters.sort !== "new";
    document.getElementById("openFilterBtn").classList.toggle("has-active", hasActiveFilters);
  }

  function renderFavoritesTab() {
    const list = state.listings.filter((l) => state.favorites.has(l.id));
    renderGrid(document.getElementById("favGrid"), list);
    document.getElementById("favGrid").style.display = list.length ? "grid" : "none";
    document.getElementById("favEmpty").hidden = list.length !== 0;
    document.getElementById("favCount").textContent = list.length ? list.length : "";
  }

  function myThumbInner(listing) {
    if (listing.photos && listing.photos.length) return `<img src="${listing.photos[0]}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:14px;" />`;
    const [c1, c2] = listing.gradient || ["#7C6CF6", "#B98CF0"];
    return `<div style="width:100%;height:100%;border-radius:14px;background:linear-gradient(135deg, ${c1}, ${c2});display:flex;align-items:center;justify-content:center;">${listing.icon || "📦"}</div>`;
  }

  function renderMyListingsTab() {
    const mine = state.listings.filter((l) => l.mine).sort((a, b) => b.createdAt - a.createdAt);
    const box = document.getElementById("myListingsList");
    box.innerHTML = mine
      .map(
        (l) => `
      <div class="my-item" data-id="${l.id}">
        <div class="my-thumb">${myThumbInner(l)}</div>
        <div class="my-info">
          <div class="my-title">${esc(l.title)}</div>
          <div class="my-price">${formatPrice(l)}</div>
          <span class="my-status ${l.status}">${l.status === "sold" ? "● Продано" : "● Активно"}</span>
        </div>
        <div class="my-actions">
          <button class="icon-action" data-edit="${l.id}" aria-label="Редактировать" title="Редактировать">
            <svg viewBox="0 0 24 24"><path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4Z"/></svg>
          </button>
          <button class="icon-action" data-toggle-sold="${l.id}" aria-label="Статус" title="Отметить продано">
            <svg viewBox="0 0 24 24"><path d="M5 12.5 9.5 17 19 7"/></svg>
          </button>
          <button class="icon-action danger" data-delete="${l.id}" aria-label="Удалить" title="Удалить">
            <svg viewBox="0 0 24 24"><path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13"/></svg>
          </button>
        </div>
      </div>`
      )
      .join("");
    document.getElementById("myEmpty").hidden = mine.length !== 0;
    document.getElementById("myCount").textContent = mine.length ? mine.length : "";

    box.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); openAddEditForm(getListing(b.dataset.edit)); }));
    box.querySelectorAll("[data-toggle-sold]").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const l = getListing(b.dataset.toggleSold);
        l.status = l.status === "sold" ? "active" : "sold";
        persistListings();
        renderMyListingsTab();
        showToast(l.status === "sold" ? "Отмечено как продано" : "Снова активно");
      })
    );
    box.querySelectorAll("[data-delete]").forEach((b) =>
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = b.dataset.delete;
        state.listings = state.listings.filter((l) => l.id !== id);
        state.favorites.delete(id);
        persistListings();
        persistFavorites();
        renderMyListingsTab();
        showToast("Объявление удалено");
      })
    );
    box.querySelectorAll(".my-item").forEach((item) =>
      item.addEventListener("click", () => openProductDetail(item.dataset.id))
    );
  }

  function renderProfileTab() {
    const me = getUser("me");
    const av = document.getElementById("profileAvatar");
    if (me.avatarPhoto) {
      av.textContent = "";
      av.style.backgroundImage = `url(${me.avatarPhoto})`;
    } else {
      av.style.backgroundImage = "";
      av.textContent = me.avatar;
    }
    document.getElementById("profileName").textContent = me.name;
    const addr = document.getElementById("addressValue");
    if (addr) addr.textContent = me.city || "";
    const ph = document.getElementById("phoneValue");
    if (ph) ph.textContent = me.phone || "";
    document.getElementById("profileMemberSince").textContent = "На Geran Express с " + (me.memberSince || "2026");
    document.getElementById("profileCity").textContent = "📍 " + me.city;
    const mine = state.listings.filter((l) => l.mine);
    document.getElementById("statListings").textContent = mine.filter((l) => l.status !== "sold").length;
    document.getElementById("statSold").textContent = mine.filter((l) => l.status === "sold").length;
    document.getElementById("statFavorites").textContent = state.favorites.size;
  }

  function starString(rating) {
    const full = Math.round(rating);
    return "★".repeat(full) + "☆".repeat(5 - full);
  }

  const stackEl = document.getElementById("screenStack");
  let stack = [];

  function pushScreen(innerHTML, mountFn) {
    const el = document.createElement("div");
    el.className = "screen";
    el.innerHTML = innerHTML;
    stackEl.appendChild(el);
    stack.push(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("enter")));
    const backBtn = el.querySelector("[data-back]");
    if (backBtn) backBtn.addEventListener("click", popScreen);
    if (mountFn) mountFn(el);
    return el;
  }

  function popScreen() {
    const el = stack.pop();
    if (!el) return;
    el.classList.remove("enter");
    el.classList.add("leaving");
    setTimeout(() => el.remove(), 400);
  }

  function screenHeader(title) {
    return `
    <div class="screen-header">
      <button class="back-btn" data-back aria-label="Назад">
        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M15 19 8 12l7-7"/></svg>
      </button>
      <div class="screen-title">${esc(title)}</div>
    </div>`;
  }

  function openProductDetail(id) {
    const listing = getListing(id);
    if (!listing) return;
    listing.views = (listing.views || 0) + 1;
    persistListings();
    const seller = getUser(listing.sellerId);
    const isMine = listing.mine;
    const fav = state.favorites.has(listing.id);
    const photos = listing.photos && listing.photos.length ? listing.photos : null;
    const hasCoords = typeof listing.lat === "number" && typeof listing.lng === "number";
    const contactPhone = listing.phone || seller.phone || "";

    const html = `
      ${screenHeader("Объявление")}
      <div class="screen-body">
        <div class="pd-gallery" id="pdGallery" style="${photos ? "" : `background:linear-gradient(135deg, ${listing.gradient[0]}, ${listing.gradient[1]})`}">
          ${photos
            ? `<div class="photo-skeleton"></div>
               <img id="pdGalleryImg" src="${esc(photos[0])}" alt="" data-photo="${esc(listing.id)}"
                    style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;" />`
            : `<span>${listing.icon}</span>`}
          <button class="fav-btn ${fav ? "active" : ""}" data-fav="${listing.id}" style="position:absolute;top:12px;right:12px;width:38px;height:38px;">
            <svg viewBox="0 0 24 24" width="19" height="19"><path d="M12 20.5s-7.6-4.7-10-9.4C.4 7.4 2.3 4 5.9 4c2 0 3.6 1 6.1 3.6C14.5 5 16.1 4 18.1 4c3.6 0 5.5 3.4 3.9 7.1-2.4 4.7-10 9.4-10 9.4Z"/></svg>
          </button>
        </div>
        <div class="pd-top-row">
          <div>
            <div class="pd-price">${formatPrice(listing)}</div>
            <span class="pd-condition">${esc(listing.condition)}</span>
          </div>
        </div>
        <div class="pd-title">${esc(listing.title)}</div>
        <div class="pd-meta">
          <span>📍 ${esc(listing.city)}</span>
          <span>· ${timeAgo(listing.createdAt)}</span>
          <span>· 👁 ${listing.views}</span>
        </div>
        <div class="pd-desc"><h4>Описание</h4>${esc(listing.description)}</div>
        ${hasCoords ? `
        <div class="pd-map-section">
          <div class="pd-map-head">
            <h4>Расположение</h4>
            <span class="pd-map-place">${esc(listing.city)}</span>
          </div>
          <div class="pd-map-card">
            <div class="pd-map" id="pdMap"></div>
            <div class="pd-map-bar">
              <span class="mb-pin">\ud83d\udccd</span>
              <div class="mb-text">
                <div class="mb-place">${esc(listing.city)}</div>
                <div class="mb-coords">${listing.lat.toFixed(4)}, ${listing.lng.toFixed(4)}</div>
              </div>
              <a class="mb-open" href="https://www.openstreetmap.org/?mlat=${listing.lat}&mlon=${listing.lng}#map=14/${listing.lat}/${listing.lng}" target="_blank" rel="noopener">Открыть</a>
            </div>
          </div>
        </div>` : ""}
        <div class="seller-card" id="sellerCardBtn">
          <div class="seller-avatar">${seller.avatar}</div>
          <div class="seller-info">
            <div class="seller-name">${esc(seller.name)} ${seller.verified ? '<span class="verified-badge">✓</span>' : ""}</div>
            <div class="seller-rating">${seller.rating ? `★ ${seller.rating.toFixed(1)} · ${seller.reviews} отзывов` : esc(seller.city || "")}</div>
          </div>
          <span class="chev">›</span>
        </div>
        <div class="pd-actions">
          ${isMine
            ? `<button class="btn btn-ghost btn-block" data-edit-mine>✎ Редактировать объявление</button>`
            : `<a class="btn btn-call" href="tel:${telHref(contactPhone)}">
                 <svg viewBox="0 0 24 24" width="18" height="18"><path d="M6.6 3.5h3l1.5 3.7-1.9 1.4a12.5 12.5 0 0 0 5.2 5.2l1.4-1.9 3.7 1.5v3a1.8 1.8 0 0 1-1.9 1.8A15.6 15.6 0 0 1 4.8 5.4 1.8 1.8 0 0 1 6.6 3.5Z"/></svg>
                 Позвонить
               </a>
               <a class="btn btn-whatsapp" href="${waHref(contactPhone, listing)}" target="_blank" rel="noopener">
                 <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.47-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.18-.3-.02-.46.13-.6.13-.14.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.03 1.02-1.03 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.62.71.23 1.36.2 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.18-1.42-.08-.12-.27-.2-.57-.34m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.37l-.36-.22-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26A9.88 9.88 0 0 1 20.05 5.1a9.83 9.83 0 0 1 2.9 7 9.88 9.88 0 0 1-9.9 9.68m8.42-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45c6.55 0 11.89-5.34 11.89-11.9a11.82 11.82 0 0 0-3.48-8.41"/></svg>
                 WhatsApp
               </a>
               <button class="fav-square ${fav ? "active" : ""}" data-fav-btn2="${listing.id}" aria-label="В избранное" title="В избранное">
                 <svg viewBox="0 0 24 24" width="21" height="21"><path d="M12 20.5s-7.6-4.7-10-9.4C.4 7.4 2.3 4 5.9 4c2 0 3.6 1 6.1 3.6C14.5 5 16.1 4 18.1 4c3.6 0 5.5 3.4 3.9 7.1-2.4 4.7-10 9.4-10 9.4Z"/></svg>
               </button>`}
        </div>
      </div>`;

    pushScreen(html, (el) => {
      el.querySelector("[data-fav]").addEventListener("click", (e) => toggleFavorite(listing.id, e.currentTarget));
      const fav2 = el.querySelector("[data-fav-btn2]");
      if (fav2) fav2.addEventListener("click", () => {
        toggleFavorite(listing.id);
        fav2.classList.toggle("active", state.favorites.has(listing.id));
        fav2.classList.remove("pop"); void fav2.offsetWidth; fav2.classList.add("pop");
      });
      el.querySelector("#sellerCardBtn").addEventListener("click", () => openSellerProfile(seller.id));
      const editBtn = el.querySelector("[data-edit-mine]");
      if (editBtn) editBtn.addEventListener("click", () => openAddEditForm(listing));
      hydratePhotos(el);
      if (hasCoords) renderProductMap(el, listing);
      const galleryImg = el.querySelector("#pdGalleryImg");
      if (galleryImg) galleryImg.addEventListener("click", () => openImageZoom(galleryImg.src));
    });
  }

  function openSellerProfile(sellerId) {
    const seller = getUser(sellerId);
    const reviews = MOCK_REVIEWS[sellerId] || [];
    const sellerListings = state.listings.filter((l) => l.sellerId === sellerId && l.status !== "sold");
    const sellerSold = state.listings.filter((l) => l.sellerId === sellerId && l.status === "sold").length;

    const html = `
      ${screenHeader(seller.name)}
      <div class="screen-body">
        <div class="seller-hero">
          <div class="seller-hero-avatar">${seller.avatar}</div>
          <div class="seller-hero-name">${esc(seller.name)} ${seller.verified ? '<span class="verified-badge">✓</span>' : ""}</div>
          <div class="profile-meta" style="justify-content:center;margin-top:4px;">
            ${seller.rating ? `<span class="stars">${starString(seller.rating)}</span><span>${seller.rating.toFixed(1)} · ${seller.reviews} отзывов</span>` : `<span>${esc(seller.city || "")}</span>`}
          </div>
          ${seller.about ? `<p class="seller-hero-about">${esc(seller.about)}</p>` : ""}
          <div class="profile-stats" style="max-width:280px;margin:18px auto 0;">
            <div class="stat"><b>${sellerListings.length}</b><span>Объявления</span></div>
            <div class="stat"><b>${seller.sales != null ? seller.sales : sellerSold}</b><span>Продано</span></div>
            <div class="stat"><b>${seller.memberSince}</b><span>На сайте с</span></div>
          </div>
        </div>
        ${sellerListings.length ? `<h4 style="margin:18px 0 10px;font-size:14px;">Объявления продавца</h4><div class="grid" id="sellerGrid"></div>` : ""}
        ${reviews.length ? `<h4 style="margin:22px 0 4px;font-size:14px;">Отзывы (${reviews.length})</h4>` : ""}
        ${reviews.length ? `<div id="sellerReviews">${reviews.map(reviewHTML).join("")}</div>` : ""}
      </div>`;

    pushScreen(html, (el) => {
      const g = el.querySelector("#sellerGrid");
      if (g) {
        renderGrid(g, sellerListings);
        attachGridHandlers(g);
      }
    });
  }

  function reviewHTML(r) {
    return `
    <div class="review-item">
      <div class="review-top">
        <div class="review-avatar">${r.avatar}</div>
        <div class="review-name">${esc(r.author)}</div>
        <div class="review-stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</div>
      </div>
      <div class="review-text">${esc(r.text)}</div>
      <div class="review-time">${r.daysAgo} дн. назад</div>
    </div>`;
  }

  function chatIdFor(sellerId) { return "chat_" + sellerId; }

  function ensureChat(sellerId, listingId) {
    const id = chatIdFor(sellerId);
    if (!state.chats[id]) {
      const seller = getUser(sellerId);
      const listing = listingId ? getListing(listingId) : null;
      state.chats[id] = {
        sellerId,
        listingId: listingId || null,
        unread: false,
        messages: [
          {
            from: "them",
            text: listing
              ? `Здравствуйте! Спасибо за интерес к объявлению «${listing.title}». Чем могу помочь?`
              : `Здравствуйте! Пишите, если появятся вопросы 🙂`,
            time: Date.now(),
          },
        ],
      };
      persistChats();
    }
    return state.chats[id];
  }

  function updateChatBadge() {
    const hasUnread = Object.values(state.chats).some((c) => c.unread);
    const badge = document.getElementById("chatBadge");
    if (badge) badge.hidden = !hasUnread;
  }

  function openChatList() {
    const entries = Object.entries(state.chats).sort((a, b) => lastMsgTime(b[1]) - lastMsgTime(a[1]));
    const html = `
      ${screenHeader("Сообщения")}
      <div class="screen-body" id="chatListBody">
        ${entries.length ? "" : `<div class="empty-state"><div class="empty-emoji">💬</div><p>Пока нет сообщений</p><span>Напишите продавцу из карточки товара</span></div>`}
        <div id="chatListItems"></div>
      </div>`;
    pushScreen(html, (el) => {
      const box = el.querySelector("#chatListItems");
      box.innerHTML = entries
        .map(([id, chat]) => {
          const seller = getUser(chat.sellerId);
          const last = chat.messages[chat.messages.length - 1];
          return `
          <div class="chat-list-item" data-chat="${id}">
            <div class="chat-list-avatar">${seller.avatar}${chat.unread ? '<span class="chat-unread-dot"></span>' : ""}</div>
            <div class="chat-list-info">
              <div class="chat-list-name">${esc(seller.name)}</div>
              <div class="chat-list-preview">${esc(last ? last.text : "")}</div>
            </div>
            <div class="chat-list-time">${last ? timeAgo(last.time) : ""}</div>
          </div>`;
        })
        .join("");
      box.querySelectorAll("[data-chat]").forEach((item) =>
        item.addEventListener("click", () => {
          const chat = state.chats[item.dataset.chat];
          openChatScreen(chat.sellerId, chat.listingId, true);
        })
      );
    });
  }

  function lastMsgTime(chat) {
    return chat.messages.length ? chat.messages[chat.messages.length - 1].time : 0;
  }

  function openChatScreen(sellerId, listingId, fromList) {
    const chat = ensureChat(sellerId, listingId);
    chat.unread = false;
    persistChats();
    updateChatBadge();
    const seller = getUser(sellerId);

    const html = `
      ${screenHeader(seller.name)}
      <div class="chat-screen-body" id="chatBody"></div>
      <div class="chat-input-row">
        <input type="text" id="chatInput" placeholder="Написать сообщение..." autocomplete="off" />
        <button class="send-btn" id="chatSendBtn" aria-label="Отправить">
          <svg viewBox="0 0 24 24" width="17" height="17"><path d="M4 12l16-7-6.5 16-2.7-6.8L4 12Z"/></svg>
        </button>
      </div>`;

    pushScreen(html, (el) => {
      const body = el.querySelector("#chatBody");
      const input = el.querySelector("#chatInput");
      const sendBtn = el.querySelector("#chatSendBtn");

      function renderMessages() {
        body.innerHTML = chat.messages
          .map(
            (m) => `<div class="bubble ${m.from === "me" ? "me" : "them"}">${esc(m.text)}<span class="bubble-time">${new Date(m.time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span></div>`
          )
          .join("");
        body.scrollTop = body.scrollHeight;
      }
      renderMessages();

      function send() {
        const text = input.value.trim();
        if (!text) return;
        chat.messages.push({ from: "me", text, time: Date.now() });
        persistChats();
        renderMessages();
        input.value = "";

        const typingEl = document.createElement("div");
        typingEl.className = "typing-indicator";
        typingEl.innerHTML = "<span></span><span></span><span></span>";
        body.appendChild(typingEl);
        body.scrollTop = body.scrollHeight;

        setTimeout(() => {
          typingEl.remove();
          const replies = [
            "Да, ещё актуально! Можем договориться о встрече.",
            "Конечно, отвечу на все вопросы 🙂",
            "Цена немного обсуждаема при осмотре.",
            "Спасибо за сообщение! Уточню детали и отвечу.",
            "Да, всё в наличии, могу отправить дополнительные фото.",
          ];
          chat.messages.push({ from: "them", text: replies[Math.floor(Math.random() * replies.length)], time: Date.now() });
          persistChats();
          renderMessages();
        }, 1100 + Math.random() * 900);
      }
      sendBtn.addEventListener("click", send);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
    });
  }

  function openAddEditForm(existing) {
    const isEdit = !!existing;
    const draft = isEdit
      ? { ...existing, photos: existing.photos ? [...existing.photos] : [] }
      : { title: "", price: "", category: "electronics", condition: "Новое", description: "",
          city: getUser("me").city, phone: getUser("me").phone || "", photos: [] };

    const catOptions = CATEGORIES.filter((c) => c.id !== "all");

    const html = `
      ${screenHeader(isEdit ? "Редактировать объявление" : "Новое объявление")}
      <div class="screen-body">
        <div class="form-group">
          <label>Фотографии</label>
          <div class="photo-grid" id="photoGrid"></div>
          <div class="form-hint">Первое фото будет обложкой. До 6 фото.</div>
          <input type="file" id="photoInput" accept="image/*" multiple hidden />
        </div>

        <div class="form-group">
          <label>Название</label>
          <input class="form-input" id="fTitle" maxlength="70" placeholder="Например: iPhone 13, 128 ГБ" value="${esc(draft.title)}" />
        </div>

        <div class="form-group">
          <label>Категория</label>
          <div class="category-grid" id="categoryGrid">
            ${catOptions.map((c) => `<div class="category-opt ${c.id === draft.category ? "active" : ""}" data-cat="${c.id}"><span class="emo">${c.icon}</span>${c.name}</div>`).join("")}
          </div>
        </div>

        <div class="form-group">
          <label>Цена, с.</label>
          <input class="form-input" id="fPrice" type="number" inputmode="numeric" placeholder="0" value="${esc(draft.price)}" />
        </div>

        <div class="form-group">
          <label>Локация</label>
          <button type="button" class="form-picker" id="fCityBtn">
            <span class="fp-left"><span class="fp-emo">📍</span><span id="fCityLabel">${esc(draft.city || "Выберите локацию")}</span></span>
            <span class="chev">›</span>
          </button>
        </div>

        <div class="form-group">
          <label>Телефон для связи</label>
          <input class="form-input" id="fPhone" type="tel" inputmode="tel" placeholder="+992 90 000 00 00" value="${esc(draft.phone || "")}" />
          <div class="form-hint">По этому номеру покупатели позвонят и напишут в WhatsApp.</div>
        </div>

        <div class="form-group">
          <label>Состояние</label>
          <div class="cond-toggle" id="condToggle">
            <button type="button" class="${draft.condition.startsWith("Новое") ? "active" : ""}" data-cond="Новое">Новое</button>
            <button type="button" class="${draft.condition.startsWith("Б/у") ? "active" : ""}" data-cond="Б/у, хорошее">Б/у</button>
          </div>
        </div>

        <div class="form-group">
          <label>Описание</label>
          <textarea class="form-textarea" id="fDesc" maxlength="600" placeholder="Расскажите подробнее о товаре...">${esc(draft.description)}</textarea>
        </div>

        <button class="btn btn-primary btn-block" id="submitListingBtn">${isEdit ? "Сохранить изменения" : "Опубликовать объявление"}</button>
        ${isEdit ? `<button class="btn btn-danger btn-block" id="deleteListingBtn" style="margin-top:10px;">Удалить объявление</button>` : ""}
      </div>`;

    pushScreen(html, (el) => {
      const photoGrid = el.querySelector("#photoGrid");
      const photoInput = el.querySelector("#photoInput");

      function renderPhotoGrid() {
        const slots = draft.photos.map(
          (src, i) => `<div class="photo-slot" data-existing="${i}"><img src="${src}" alt="" /><button class="photo-remove" data-remove="${i}">✕</button></div>`
        );
        if (draft.photos.length < 6) slots.push(`<div class="photo-slot" id="addPhotoSlot">+</div>`);
        photoGrid.innerHTML = slots.join("");
        const addSlot = photoGrid.querySelector("#addPhotoSlot");
        if (addSlot) addSlot.addEventListener("click", () => photoInput.click());
        photoGrid.querySelectorAll("[data-remove]").forEach((btn) =>
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            draft.photos.splice(Number(btn.dataset.remove), 1);
            renderPhotoGrid();
          })
        );
      }
      renderPhotoGrid();

      photoInput.addEventListener("change", () => {
        const files = Array.from(photoInput.files).slice(0, 6 - draft.photos.length);
        files.forEach((file) => {
          const reader = new FileReader();
          reader.onload = () => { draft.photos.push(reader.result); renderPhotoGrid(); };
          reader.readAsDataURL(file);
        });
        photoInput.value = "";
      });

      el.querySelector("#fCityBtn").addEventListener("click", () =>
        openLocationSheet(draft.city, (loc) => {
          if (!loc) return;
          draft.city = loc;
          el.querySelector("#fCityLabel").textContent = loc;
        })
      );

      el.querySelector("#categoryGrid").addEventListener("click", (e) => {
        const opt = e.target.closest(".category-opt");
        if (!opt) return;
        draft.category = opt.dataset.cat;
        el.querySelectorAll(".category-opt").forEach((o) => o.classList.toggle("active", o === opt));
      });

      el.querySelector("#condToggle").addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        draft.condition = btn.dataset.cond;
        el.querySelectorAll("#condToggle button").forEach((b) => b.classList.toggle("active", b === btn));
      });

      el.querySelector("#submitListingBtn").addEventListener("click", () => {
        const title = el.querySelector("#fTitle").value.trim();
        const price = Number(el.querySelector("#fPrice").value);
        const city = draft.city || getUser("me").city;
        const phone = el.querySelector("#fPhone").value.trim();
        const description = el.querySelector("#fDesc").value.trim();

        if (!title) { showToast("Укажите название"); el.querySelector("#fTitle").focus(); return; }
        if (!price || price <= 0) { showToast("Укажите корректную цену"); el.querySelector("#fPrice").focus(); return; }
        if (!description) { showToast("Добавьте описание"); el.querySelector("#fDesc").focus(); return; }
        if (!phone || phone.replace(/\D/g, "").length < 9) { showToast("Укажите телефон для связи"); el.querySelector("#fPhone").focus(); return; }

        const cat = CATEGORIES.find((c) => c.id === draft.category) || CATEGORIES[1];

        if (isEdit) {
          const [eLat, eLng] = coordsForLocation(city);
          Object.assign(existing, { title, price, city, phone, description, category: draft.category, condition: draft.condition, photos: draft.photos, icon: cat.icon, lat: eLat, lng: eLng });
          persistListings();
          showToast("Изменения сохранены");
        } else {
          const gradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
          const newListing = {
            id: uid("l"),
            title, price, city, phone, description,
            category: draft.category,
            condition: draft.condition,
            photos: draft.photos,
            icon: cat.icon,
            gradient,
            sellerId: "me",
            mine: true,
            status: "active",
            createdAt: Date.now(),
            views: 0,
            lat: coordsForLocation(city)[0],
            lng: coordsForLocation(city)[1],
          };
          state.listings.unshift(newListing);
          persistListings();
          showToast("Объявление опубликовано 🎉");
        }
        renderHomeTab();
        renderMyListingsTab();
        renderProfileTab();
        popScreen();
      });

      const delBtn = el.querySelector("#deleteListingBtn");
      if (delBtn) delBtn.addEventListener("click", () => {
        state.listings = state.listings.filter((l) => l.id !== existing.id);
        state.favorites.delete(existing.id);
        persistListings();
        persistFavorites();
        renderHomeTab();
        renderMyListingsTab();
        showToast("Объявление удалено");
        popScreen();
      });
    });
  }

  function initFilterSheet() {
    const overlay = document.getElementById("filterOverlay");
    const openBtn = document.getElementById("openFilterBtn");
    const closeBtn = document.getElementById("closeFilterBtn");
    const priceMin = document.getElementById("priceMin");
    const priceMax = document.getElementById("priceMax");
    const condPills = document.getElementById("conditionPills");
    const sortPills = document.getElementById("sortPills");

    function open() {
      priceMin.value = state.filters.priceMin ?? "";
      priceMax.value = state.filters.priceMax ?? "";
      condPills.querySelectorAll(".pill").forEach((p) => p.classList.toggle("active", p.dataset.cond === state.filters.condition));
      sortPills.querySelectorAll(".pill").forEach((p) => p.classList.toggle("active", p.dataset.sort === state.filters.sort));
      overlay.classList.add("open");
    }
    function close() { overlay.classList.remove("open"); }

    openBtn.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });

    condPills.addEventListener("click", (e) => {
      const pill = e.target.closest(".pill");
      if (!pill) return;
      const already = pill.classList.contains("active");
      condPills.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
      if (!already) pill.classList.add("active");
    });
    sortPills.addEventListener("click", (e) => {
      const pill = e.target.closest(".pill");
      if (!pill) return;
      sortPills.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
    });

    document.getElementById("applyFilterBtn").addEventListener("click", () => {
      state.filters.priceMin = priceMin.value ? Number(priceMin.value) : null;
      state.filters.priceMax = priceMax.value ? Number(priceMax.value) : null;
      const activeCond = condPills.querySelector(".pill.active");
      state.filters.condition = activeCond ? activeCond.dataset.cond : null;
      const activeSort = sortPills.querySelector(".pill.active");
      state.filters.sort = activeSort ? activeSort.dataset.sort : "new";
      close();
      updateQuickFilterUI();
      renderHomeTab();
    });
    document.getElementById("clearFilterBtn").addEventListener("click", () => {
      state.filters.priceMin = null; state.filters.priceMax = null; state.filters.condition = null; state.filters.sort = "new";
      priceMin.value = ""; priceMax.value = "";
      condPills.querySelectorAll(".pill").forEach((p) => p.classList.remove("active"));
      sortPills.querySelectorAll(".pill").forEach((p, i) => p.classList.toggle("active", i === 0));
      updateQuickFilterUI();
      renderHomeTab();
    });
    document.getElementById("resetFiltersBtn").addEventListener("click", () => {
      state.filters = { category: "all", query: "", location: null, priceMin: null, priceMax: null, condition: null, sort: "new" };
      document.getElementById("searchInput").value = "";
      document.getElementById("clearSearchBtn").hidden = true;
      updateQuickFilterUI();
      renderHomeTab();
    });
  }

  function initOnlineIndicator() {
    const el = document.getElementById("onlineCount");
    if (!el) return;
    let n = 96 + Math.floor(Math.random() * 90);
    el.textContent = n;
    setInterval(() => {
      n += Math.floor(Math.random() * 7) - 3;
      n = Math.max(42, Math.min(260, n));
      el.textContent = n;
    }, 3500);
  }

  function updateNotifBadge() {
    const seen = loadJSON(LS.notifSeen, 0);
    const badge = document.getElementById("notifBadge");
    if (badge) badge.hidden = seen >= NEWS_ITEMS.length;
  }

  function openNotificationsScreen() {
    saveJSON(LS.notifSeen, NEWS_ITEMS.length);
    updateNotifBadge();
    const html = `
      ${screenHeader("\u041d\u043e\u0432\u043e\u0441\u0442\u0438 Geran Express")}
      <div class="screen-body">
        ${NEWS_ITEMS.map((n) => `
          <div class="news-item">
            <div class="news-icon">${n.icon}</div>
            <div>
              <div class="news-title">${esc(n.title)}</div>
              <div class="news-text">${esc(n.text)}</div>
              <div class="news-time">${n.daysAgo === 0 ? "\u0441\u0435\u0433\u043e\u0434\u043d\u044f" : n.daysAgo + " \u0434\u043d. \u043d\u0430\u0437\u0430\u0434"}</div>
            </div>
          </div>`).join("")}
      </div>`;
    pushScreen(html);
  }

  const PROMO_SLIDES = [
    { title: "\u0421\u043a\u0438\u0434\u043a\u0438 \u043d\u0430 \u0443\u0441\u043b\u0443\u0433\u0438 \u0440\u0430\u0439\u043e\u043d\u0430", sub: "\u0423\u0441\u0442\u0430\u043d\u043e\u0432\u043a\u0430, \u0440\u0435\u043c\u043e\u043d\u0442, \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0430 \u2014 \u0440\u044f\u0434\u043e\u043c \u0441 \u0432\u0430\u043c\u0438", emo: "\ud83d\udee0\ufe0f", grad: ["#16A34A", "#4ADE80"] },
    { title: "255 \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0439 \u0438 \u0440\u0430\u0441\u0442\u0451\u0442", sub: "\u041d\u043e\u0432\u044b\u0435 \u0442\u043e\u0432\u0430\u0440\u044b \u043a\u0430\u0436\u0434\u044b\u0439 \u0434\u0435\u043d\u044c", emo: "\ud83d\udce6", grad: ["#22C58B", "#4FACFE"] },
    { title: "\u041f\u0440\u043e\u0434\u0430\u0432\u0430\u0439\u0442\u0435 \u0437\u0430 \u043f\u0430\u0440\u0443 \u043c\u0438\u043d\u0443\u0442", sub: "\u0420\u0430\u0437\u043c\u0435\u0441\u0442\u0438\u0442\u0435 \u043e\u0431\u044a\u044f\u0432\u043b\u0435\u043d\u0438\u0435 \u0431\u0435\u0441\u043f\u043b\u0430\u0442\u043d\u043e", emo: "\u26a1", grad: ["#4ADE80", "#16A34A"] },
    { title: "Geran Express \u0442\u0435\u043f\u0435\u0440\u044c \u0431\u044b\u0441\u0442\u0440\u0435\u0435", sub: "\u041f\u0438\u0448\u0438\u0442\u0435 \u043f\u0440\u043e\u0434\u0430\u0432\u0446\u0430\u043c \u043d\u0430\u043f\u0440\u044f\u043c\u0443\u044e", emo: "\ud83d\udcac", grad: ["#059669", "#34D399"] },
  ];

  function initPromoBanner() {
    const track = document.getElementById("promoTrack");
    const dotsWrap = document.getElementById("promoDots");
    if (!track) return;

    track.innerHTML = PROMO_SLIDES.map(
      (s) => `<div class="promo-slide" style="background:linear-gradient(135deg, ${s.grad[0]}, ${s.grad[1]})">
        <div class="promo-slide-text"><div class="promo-slide-title">${esc(s.title)}</div><div class="promo-slide-sub">${esc(s.sub)}</div></div>
        <span class="promo-slide-emo">${s.emo}</span>
      </div>`
    ).join("");
    dotsWrap.innerHTML = PROMO_SLIDES.map((_, i) => `<span class="promo-dot ${i === 0 ? "active" : ""}"></span>`).join("");
    const dots = dotsWrap.querySelectorAll(".promo-dot");

    let dotTimer = null;
    function setActiveDot() {
      const idx = Math.round(track.scrollLeft / track.clientWidth);
      dots.forEach((d, i) => d.classList.toggle("active", i === idx));
    }
    track.addEventListener("scroll", () => {
      clearTimeout(dotTimer);
      dotTimer = setTimeout(setActiveDot, 60);
    });

    let isDown = false, startX = 0, startScroll = 0;
    track.addEventListener("mousedown", (e) => {
      isDown = true; track.classList.add("dragging");
      startX = e.pageX; startScroll = track.scrollLeft;
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      track.scrollLeft = startScroll - (e.pageX - startX);
    });
    window.addEventListener("mouseup", () => {
      if (!isDown) return;
      isDown = false; track.classList.remove("dragging");
      const idx = Math.round(track.scrollLeft / track.clientWidth);
      track.scrollTo({ left: idx * track.clientWidth, behavior: "smooth" });
    });

    let autoplay = setInterval(next, 4500);
    function next() {
      const idx = Math.round(track.scrollLeft / track.clientWidth);
      const n = (idx + 1) % PROMO_SLIDES.length;
      track.scrollTo({ left: n * track.clientWidth, behavior: "smooth" });
    }
    function pause() { clearInterval(autoplay); }
    track.addEventListener("mousedown", pause);
    track.addEventListener("touchstart", pause, { passive: true });
  }

  function openAvatarEditor() {
    const me = getUser("me");
    const html = `
      ${screenHeader("Фото профиля")}
      <div class="screen-body">
        <div class="avatar-preview-big" id="avatarPreview"
             style="${me.avatarPhoto ? `background-image:url(${me.avatarPhoto})` : ""}">${me.avatarPhoto ? "" : me.avatar}</div>

        <div class="form-group">
          <button class="btn btn-primary btn-block" id="uploadAvatarBtn">📷 Загрузить фото</button>
          ${me.avatarPhoto ? `<button class="btn btn-ghost btn-block" id="removeAvatarBtn" style="margin-top:9px;">Убрать фото</button>` : ""}
          <div class="form-hint">Фото хранится только в вашем браузере.</div>
        </div>

        <div class="form-group">
          <label>Или выберите значок</label>
          <div class="avatar-emoji-grid" id="avatarEmojiGrid">
            ${AVATAR_EMOJI.map((e) => `<div class="avatar-emoji-opt ${!me.avatarPhoto && me.avatar === e ? "active" : ""}" data-emo="${e}">${e}</div>`).join("")}
          </div>
        </div>
      </div>`;

    pushScreen(html, (el) => {
      const fileInput = document.getElementById("avatarPhotoInput");
      el.querySelector("#uploadAvatarBtn").addEventListener("click", () => fileInput.click());

      fileInput.onchange = () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          state.meProfile.avatarPhoto = reader.result;
          persistMeProfile();
          renderProfileTab();
          fileInput.value = "";
          fileInput.onchange = null;
          popScreen();
          showToast("Фото обновлено");
        };
        reader.readAsDataURL(file);
      };

      const removeBtn = el.querySelector("#removeAvatarBtn");
      if (removeBtn) removeBtn.addEventListener("click", () => {
        state.meProfile.avatarPhoto = null;
        persistMeProfile();
        renderProfileTab();
        popScreen();
        showToast("Фото убрано");
      });

      el.querySelectorAll("[data-emo]").forEach((opt) =>
        opt.addEventListener("click", () => {
          state.meProfile.avatar = opt.dataset.emo;
          state.meProfile.avatarPhoto = null;
          persistMeProfile();
          renderProfileTab();
          popScreen();
          showToast("Значок обновлён");
        })
      );
    });
  }

  function openTextEditor({ title, label, value, placeholder, hint, inputType, onSave }) {
    const html = `
      ${screenHeader(title)}
      <div class="screen-body">
        <div class="form-group">
          <label>${esc(label)}</label>
          <input class="form-input" id="editorInput" type="${inputType || "text"}" maxlength="60"
                 placeholder="${esc(placeholder || "")}" value="${esc(value || "")}" />
          ${hint ? `<div class="form-hint">${esc(hint)}</div>` : ""}
        </div>
        <button class="btn btn-primary btn-block" id="editorSaveBtn">Сохранить</button>
      </div>`;
    pushScreen(html, (el) => {
      const input = el.querySelector("#editorInput");
      setTimeout(() => input.focus(), 350);
      const save = () => {
        const v = input.value.trim();
        if (!v) { showToast("Поле не может быть пустым"); return; }
        onSave(v);
        popScreen();
      };
      el.querySelector("#editorSaveBtn").addEventListener("click", save);
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
    });
  }

  function renderProductMap(el, listing) {
    const mapEl = el.querySelector("#pdMap");
    if (!mapEl) return;

    if (typeof L === "undefined") {
      mapEl.className = "pd-map-offline";
      mapEl.innerHTML = `<span class="off-emo">\ud83d\uddfa\ufe0f</span>
        <span>Карта недоступна без интернета</span>
        <span>${esc(listing.city)} \u00b7 ${listing.lat.toFixed(4)}, ${listing.lng.toFixed(4)}</span>`;
      return;
    }

    try {
      const map = L.map(mapEl, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,   
        doubleClickZoom: true,
        dragging: true,
      }).setView([listing.lat, listing.lng], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "\u00a9 OpenStreetMap",
      }).addTo(map);

      const icon = L.divIcon({
        className: "geran-pin",
        html: '<div class="pin-ring"></div><div class="pin-body"></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -30],
      });
      L.marker([listing.lat, listing.lng], { icon, title: listing.city })
        .addTo(map)
        .bindPopup(`<b>${esc(listing.title)}</b><br>${esc(listing.city)}`);

      setTimeout(() => map.invalidateSize(), 260);
      setTimeout(() => map.invalidateSize(), 700);
    } catch (err) {
      mapEl.className = "pd-map-offline";
      mapEl.innerHTML = `<span class="off-emo">\ud83d\uddfa\ufe0f</span><span>Карту не удалось загрузить</span>`;
    }
  }

  let zoomState = { scale: 1, x: 0, y: 0 };

  function initZoomViewer() {
    const overlay = document.getElementById("zoomOverlay");
    const img = document.getElementById("zoomImg");
    const hint = document.getElementById("zoomHint");

    document.getElementById("zoomCloseBtn").addEventListener("click", closeImageZoom);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeImageZoom(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeImageZoom(); });

    function apply() {
      img.style.transform = `translate(${zoomState.x}px, ${zoomState.y}px) scale(${zoomState.scale})`;
      if (hint) hint.style.opacity = zoomState.scale > 1 ? "0" : "1";
    }
    function setScale(next) {
      zoomState.scale = Math.max(1, Math.min(5, next));
      if (zoomState.scale === 1) { zoomState.x = 0; zoomState.y = 0; }
      apply();
    }
    overlay._reset = () => { zoomState = { scale: 1, x: 0, y: 0 }; img.style.transition = "none"; apply(); requestAnimationFrame(() => { img.style.transition = "transform .12s linear"; }); };

    overlay.addEventListener("wheel", (e) => {
      e.preventDefault();
      setScale(zoomState.scale * (e.deltaY < 0 ? 1.16 : 0.86));
    }, { passive: false });

    img.addEventListener("dblclick", () => setScale(zoomState.scale > 1 ? 1 : 2.5));
    let lastTap = 0;
    img.addEventListener("touchend", () => {
      const now = Date.now();
      if (now - lastTap < 280) setScale(zoomState.scale > 1 ? 1 : 2.5);
      lastTap = now;
    });

    const pointers = new Map();
    let startDist = 0, startScale = 1, dragFrom = null, panFrom = null;

    img.addEventListener("pointerdown", (e) => {
      img.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, e);
      if (pointers.size === 1 && zoomState.scale > 1) {
        dragFrom = { x: e.clientX, y: e.clientY };
        panFrom = { x: zoomState.x, y: zoomState.y };
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        startDist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        startScale = zoomState.scale;
        dragFrom = null;
      }
    });
    img.addEventListener("pointermove", (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, e);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        if (startDist > 0) setScale(startScale * (dist / startDist));
      } else if (dragFrom) {
        zoomState.x = panFrom.x + (e.clientX - dragFrom.x);
        zoomState.y = panFrom.y + (e.clientY - dragFrom.y);
        apply();
      }
    });
    function release(e) { pointers.delete(e.pointerId); if (pointers.size < 2) startDist = 0; if (pointers.size === 0) dragFrom = null; }
    img.addEventListener("pointerup", release);
    img.addEventListener("pointercancel", release);
  }

  function openImageZoom(src) {
    const overlay = document.getElementById("zoomOverlay");
    document.getElementById("zoomImg").src = src;
    if (overlay._reset) overlay._reset();
    overlay.classList.add("open");
  }
  function closeImageZoom() { document.getElementById("zoomOverlay").classList.remove("open"); }

  const SPLASH_STEPS = [
    { at: 120,  pct: 18,  text: "Подключение…" },
    { at: 620,  pct: 46,  text: "Загрузка каталога…" },
    { at: 1150, pct: 72,  text: "Обновление объявлений…" },
    { at: 1700, pct: 92,  text: "Почти готово…" },
    { at: 2050, pct: 100, text: "Готово" },
  ];

  function runSplash(onDone) {
    const splash = document.getElementById("splash");
    const bar = document.getElementById("splashBar");
    const status = document.getElementById("splashStatus");

    SPLASH_STEPS.forEach((step) => {
      setTimeout(() => {
        bar.style.width = step.pct + "%";
        status.textContent = step.text;
      }, step.at);
    });

    setTimeout(() => {
      splash.classList.add("hide");
      setTimeout(() => { splash.remove(); onDone(); }, 560);
    }, 2300);
  }

  function formatLocalPhone(digits) {
    const d = digits.slice(0, 9);
    const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
    return parts.join(" ");
  }

  function showAuthScreen(onDone) {
    const screen = document.getElementById("authScreen");
    const row = document.getElementById("authPhoneRow");
    const input = document.getElementById("authPhoneInput");
    const btn = document.getElementById("authSubmitBtn");
    const err = document.getElementById("authError");

    screen.classList.add("show");
    setTimeout(() => input.focus(), 450);

    const digitsOf = () => input.value.replace(/\D/g, "");

    input.addEventListener("input", () => {
      const d = digitsOf();
      input.value = formatLocalPhone(d);
      btn.disabled = d.length !== 9;
      row.classList.remove("invalid");
      err.textContent = "";
    });
    input.addEventListener("focus", () => row.classList.add("focus"));
    input.addEventListener("blur", () => row.classList.remove("focus"));
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !btn.disabled) btn.click(); });

    btn.addEventListener("click", () => {
      const d = digitsOf();
      if (d.length !== 9) {
        row.classList.add("invalid");
        err.textContent = "Введите 9 цифр номера";
        return;
      }
      btn.classList.add("loading");
      btn.disabled = true;

      setTimeout(() => {
        const phone = "+992 " + formatLocalPhone(d);
        state.meProfile.phone = phone;
        persistMeProfile();
        state.isAuthed = true;
        saveJSON(LS.authed, true);

        screen.style.transition = "opacity .4s var(--ease)";
        screen.style.opacity = "0";
        setTimeout(() => {
          screen.classList.remove("show");
          screen.remove();
          onDone();
          showToast("Добро пожаловать в Geran Express 👋");
        }, 420);
      }, 700);
    });
  }

  function init() {
    applyTheme(state.theme);

    document.getElementById("themeToggleBtn").addEventListener("click", toggleTheme);
    document.getElementById("profileThemeSwitch").addEventListener("change", (e) => applyTheme(e.target.checked ? "dark" : "light"));

    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.tab === "add") { openAddEditForm(null); return; }
        switchTab(btn.dataset.tab);
      });
    });

    document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.go)));

    document.getElementById("myEmptyAddBtn").addEventListener("click", () => openAddEditForm(null));
    document.getElementById("openMyListingsBtn").addEventListener("click", () => switchTab("listings"));
    document.getElementById("openFavFromProfileBtn").addEventListener("click", () => switchTab("favorites"));
    document.getElementById("openChatsBtn").addEventListener("click", openChatList);
    document.getElementById("notifBtn").addEventListener("click", openNotificationsScreen);
    document.getElementById("editAvatarBtn").addEventListener("click", openAvatarEditor);
    document.getElementById("editNameBtn").addEventListener("click", () =>
      openTextEditor({
        title: "Имя", label: "Ваше имя", value: getUser("me").name, placeholder: "Как вас зовут?",
        onSave: (v) => { state.meProfile.name = v; persistMeProfile(); renderProfileTab(); showToast("Имя обновлено"); },
      })
    );
    document.getElementById("openPhoneBtn").addEventListener("click", () =>
      openTextEditor({
        title: "Телефон", label: "Номер телефона", value: getUser("me").phone, inputType: "tel",
        placeholder: "+992 90 000 00 00",
        hint: "По этому номеру покупатели позвонят или напишут в WhatsApp по вашим объявлениям.",
        onSave: (v) => { state.meProfile.phone = v; persistMeProfile(); renderProfileTab(); showToast("Телефон обновлён"); },
      })
    );
    document.getElementById("openAddressBtn").addEventListener("click", () =>
      openLocationSheet(getUser("me").city, (loc) => {
        if (!loc) return;
        state.meProfile.city = loc;
        persistMeProfile();
        renderProfileTab();
        showToast("Адрес обновлён");
      })
    );
    document.getElementById("refreshDataBtn").addEventListener("click", () => {
      const mine = state.listings.filter((l) => l.mine);
      state.listings = [...mine, ...JSON.parse(JSON.stringify(MOCK_LISTINGS))];
      persistListings();
      saveJSON(LS.dataVersion, DATA_VERSION);
      renderHomeTab();
      renderMyListingsTab();
      renderProfileTab();
      showToast(`Каталог обновлён · ${state.listings.length} объявл.`);
    });
    document.getElementById("aboutBtn").addEventListener("click", () =>
      showToast("Geran Express · демо-маркетплейс ✨")
    );

    const searchInput = document.getElementById("searchInput");
    const clearBtn = document.getElementById("clearSearchBtn");
    let searchTimer = null;
    searchInput.addEventListener("input", () => {
      clearBtn.hidden = !searchInput.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.filters.query = searchInput.value;
        renderHomeTab();
      }, 180);
    });
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      clearBtn.hidden = true;
      state.filters.query = "";
      renderHomeTab();
      searchInput.focus();
    });

    updateQuickFilterUI();
    initQuickFilterRow();
    initFilterSheet();
    attachGridHandlers(document.getElementById("homeGrid"));
    attachGridHandlers(document.getElementById("favGrid"));
    renderHomeTab();
    renderProfileTab();
    updateChatBadge();
    updateNotifBadge();
    initOnlineIndicator();
    initPromoBanner();
    initZoomViewer();
    switchTab("home");
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(state.theme);
    runSplash(() => {
      if (state.isAuthed) { init(); return; }
      showAuthScreen(init);
    });
  });
})();
