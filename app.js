import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAnalytics, logEvent } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js';
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, where, onSnapshot, serverTimestamp, increment, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ==================== ИНИЦИАЛИЗАЦИЯ ПОСЛЕ ЗАГРУЗКИ DOM ====================
document.addEventListener('DOMContentLoaded', () => {
  // Шрифты
  if ('fonts' in document) {
    document.fonts.ready.then(() => document.documentElement.classList.add('fonts-loaded'));
  } else {
    document.documentElement.classList.add('fonts-loaded');
  }

  // Google Analytics
  window.gtag = function(){ window.dataLayer.push(arguments); };
  window.dataLayer = window.dataLayer || [];
  window.gtag('js', new Date());
  window.gtag('config', 'G-WP2S70R07C', { send_page_view: false });

  const firebaseConfig = {
    apiKey: "AIzaSyBcg07lrmxf7ixeHxa29rSrkWxb03G4w4U",
    authDomain: "geran-express.firebaseapp.com",
    projectId: "geran-express",
    storageBucket: "geran-express.firebasestorage.app",
    messagingSenderId: "100329986906",
    appId: "1:100329986906:web:4998c36eecc975b46bf163",
    measurementId: "G-WP2S70R07C"
  };

  let db = null;
  let analytics = null;
  let firebaseReady = false;
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    analytics = getAnalytics(app);
    firebaseReady = true;
    logEvent(analytics, 'page_view');
    console.log("Firebase + Analytics OK (Firestore)");
  } catch (e) {
    console.warn('Firebase init error:', e.message);
  }

  // ==================== ДАТЧИК ОНЛАЙНА (ПОЧИНЕН) ====================
  // ==================== ДАТЧИК ОНЛАЙНА (ПОЧИНЕН) ====================
  (function() {
    if (!db || !firebaseReady) {
      console.warn('Presence: Firestore not available');
      return;
    }

    const presenceCollection = collection(db, 'presence');
    
    function generateSessionId() {
      return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    let sessionId = sessionStorage.getItem('geran_session_id');
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionStorage.setItem('geran_session_id', sessionId);
    }
    
    const myPresenceDoc = doc(presenceCollection, sessionId);
    
    window.updateOnlinePresence = function() {
      updateDoc(myPresenceDoc, {
        online: true,
        lastSeen: serverTimestamp(),
        sessionId: sessionId
      }).catch(function() {});
    };
    
    window.updateOnlinePresence();
    const heartbeatInterval = setInterval(window.updateOnlinePresence, 60000);
    
    window.addEventListener('beforeunload', function() {
      clearInterval(heartbeatInterval);
      deleteDoc(myPresenceDoc).catch(function() {});
    });
    
    window.cleanupOnlineSessions = function() {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      getDocs(query(presenceCollection, where('lastSeen', '<', threeMinutesAgo)))
        .then(function(snapshot) {
          if (snapshot.empty) return;
          const batch = writeBatch(db);
          snapshot.forEach(function(docSnap) {
            batch.delete(docSnap.ref);
          });
          return batch.commit();
        })
        .catch(function() {});
    };
    
    setInterval(window.cleanupOnlineSessions, 5 * 60 * 1000);
    window.cleanupOnlineSessions();
    
    const onlineDot = document.getElementById('online-dot');
    const onlineCount = document.getElementById('online-count');
    
    let cachedCount = -1;
    let debounceTimer = null;
    
    onSnapshot(presenceCollection, function(snapshot) {
      if (debounceTimer) return;
      
      debounceTimer = setTimeout(function() {
        debounceTimer = null;
        
        const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
        let count = 0;
        
        snapshot.forEach(function(docSnap) {
          const data = docSnap.data();
          if (data.lastSeen && data.lastSeen.toDate) {
            const lastSeenDate = data.lastSeen.toDate();
            if (lastSeenDate >= threeMinutesAgo) {
              count++;
            }
          } else if (data.online === true) {
            count++;
          }
        });
        
        if (count !== cachedCount) {
          cachedCount = count;
          
          if (onlineCount) {
            onlineCount.textContent = count;
          }
          
          if (onlineDot) {
            onlineDot.classList.remove('offline', 'zero');
            if (count === 0) {
              onlineDot.classList.add('zero');
            }
          }
        }
      }, 2000);
    }, function(error) {
      console.warn('Presence: listener error', error.message);
    });
    
    window.getOnlineCount = function() { return cachedCount; };
  })();
  // ==================== КОНЕЦ ДАТЧИКА ОНЛАЙНА ====================
  // ==================== КОНЕЦ ДАТЧИКА ОНЛАЙНА ====================

  // ==================== АДАПТИВНАЯ ГАЛЕРЕЯ С ЗУМОМ ====================
  function initGallery() {
    const PLACEHOLDER_IMG = 'https://cdn-icons-png.flaticon.com/512/2922/2922510.png';
    let galleryImages = [];
    let currentIndex = 0;
    let currentScale = 1;
    let translateX = 0;
    let translateY = 0;
    let initialDistance = 0;
    let initialScale = 1;
    let initialTranslateX = 0;
    let initialTranslateY = 0;
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;
    let lastTapTime = 0;
    const DOUBLE_TAP_DELAY = 300;
    const MIN_SCALE = 0.5;
    const MAX_SCALE = 4;
    const ZOOM_STEP = 1.5;

    // Создаем модальное окно галереи, если его нет в DOM
    if (!document.getElementById('gallery-modal')) {
      const modal = document.createElement('div');
      modal.id = 'gallery-modal';
      modal.className = 'gallery-modal';
      modal.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;align-items:center;justify-content:center;';
      modal.innerHTML = `
        <div class="gallery-backdrop" style="position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);cursor:pointer;"></div>
        <div class="gallery-content" style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;z-index:1;">
          <button class="gallery-close" id="gallery-close" style="position:absolute;top:16px;right:16px;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:28px;cursor:pointer;z-index:10;">&times;</button>
          <div class="gallery-image-wrapper" id="gallery-image-wrapper" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:none;">
            <img src="" alt="Просмотр фото" id="gallery-image" draggable="false" style="max-width:100%;max-height:100%;object-fit:contain;transition:transform 0.1s ease-out;transform-origin:center center;user-select:none;cursor:grab;">
          </div>
          <button class="gallery-nav gallery-prev" id="gallery-prev" style="position:absolute;top:50%;left:12px;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:24px;cursor:pointer;z-index:10;">&#8249;</button>
          <button class="gallery-nav gallery-next" id="gallery-next" style="position:absolute;top:50%;right:12px;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:24px;cursor:pointer;z-index:10;">&#8250;</button>
          <div class="gallery-counter" id="gallery-counter" style="position:absolute;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,0.15);color:#fff;padding:6px 16px;border-radius:20px;font-size:0.85rem;z-index:10;">1 / 1</div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const modal = document.getElementById('gallery-modal');
    const closeBtn = document.getElementById('gallery-close');
    const backdrop = modal.querySelector('.gallery-backdrop');
    const prevBtn = document.getElementById('gallery-prev');
    const nextBtn = document.getElementById('gallery-next');
    const imageWrapper = document.getElementById('gallery-image-wrapper');
    const galleryImage = document.getElementById('gallery-image');
    const counter = document.getElementById('gallery-counter');

    function openGallery(images, startIndex) {
      if (!images || images.length === 0) return;
      
      const validImages = images.filter(src => src && (src.startsWith('data:image/') || src.startsWith('http')));
      if (validImages.length === 0) return;
      
      galleryImages = validImages;
      currentIndex = Math.max(0, Math.min(startIndex, galleryImages.length - 1));
      currentScale = 1;
      translateX = 0;
      translateY = 0;
      
      updateGalleryImage();
      updateCounter();
      
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      
      if (galleryImages.length <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        counter.style.display = 'none';
      } else {
        prevBtn.style.display = '';
        nextBtn.style.display = '';
        counter.style.display = '';
      }
      
      applyTransform();
    }

    function closeGallery() {
      modal.style.display = 'none';
      document.body.style.overflow = '';
      galleryImages = [];
      currentIndex = 0;
    }

    function updateGalleryImage() {
      galleryImage.src = galleryImages[currentIndex] || PLACEHOLDER_IMG;
      resetZoom();
    }

    function updateCounter() {
      counter.textContent = (currentIndex + 1) + ' / ' + galleryImages.length;
    }

    function resetZoom() {
      currentScale = 1;
      translateX = 0;
      translateY = 0;
      applyTransform();
    }

    function applyTransform() {
      galleryImage.style.transform = 'translate(' + translateX + 'px, ' + translateY + 'px) scale(' + currentScale + ')';
    }

    function navigateGallery(direction) {
      if (galleryImages.length <= 1) return;
      
      const newIndex = currentIndex + direction;
      if (newIndex < 0 || newIndex >= galleryImages.length) return;
      
      currentIndex = newIndex;
      resetZoom();
      updateGalleryImage();
      updateCounter();
    }

    function zoomTo(newScale, offsetX, offsetY) {
      const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
      
      if (clampedScale <= 1) {
        resetZoom();
        return;
      }
      
      const scaleRatio = clampedScale / currentScale;
      
      translateX = offsetX - (offsetX - translateX) * scaleRatio;
      translateY = offsetY - (offsetY - translateY) * scaleRatio;
      currentScale = clampedScale;
      
      applyTransform();
    }

    // Обработчики событий
    closeBtn.addEventListener('click', closeGallery);
    backdrop.addEventListener('click', closeGallery);
    
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); navigateGallery(-1); });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); navigateGallery(1); });

    // Клавиатура
    document.addEventListener('keydown', function(e) {
      if (modal.style.display !== 'flex') return;
      
      switch(e.key) {
        case 'Escape': closeGallery(); break;
        case 'ArrowLeft': navigateGallery(-1); break;
        case 'ArrowRight': navigateGallery(1); break;
        case '+': case '=': zoomTo(currentScale * ZOOM_STEP, window.innerWidth / 2, window.innerHeight / 2); break;
        case '-': zoomTo(currentScale / ZOOM_STEP, window.innerWidth / 2, window.innerHeight / 2); break;
        case '0': resetZoom(); break;
      }
    });

    // Зум колесиком мыши
    imageWrapper.addEventListener('wheel', function(e) {
      e.preventDefault();
      const rect = imageWrapper.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      const direction = e.deltaY > 0 ? -1 : 1;
      const newScale = currentScale * (1 + direction * 0.1);
      zoomTo(newScale, offsetX, offsetY);
    }, { passive: false });

    // Двойной клик для зума
    galleryImage.addEventListener('click', function(e) {
      e.stopPropagation();
      const now = Date.now();
      if (now - lastTapTime < DOUBLE_TAP_DELAY) {
        e.preventDefault();
        if (currentScale > 1.1) {
          resetZoom();
        } else {
          const rect = galleryImage.getBoundingClientRect();
          const offsetX = e.clientX - rect.left;
          const offsetY = e.clientY - rect.top;
          zoomTo(MAX_SCALE, offsetX, offsetY);
        }
      }
      lastTapTime = now;
    });

    // Панорамирование (ПК)
    galleryImage.addEventListener('mousedown', function(e) {
      if (currentScale > 1.1) {
        e.stopPropagation();
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        initialTranslateX = translateX;
        initialTranslateY = translateY;
        galleryImage.style.cursor = 'grabbing';
      }
    });

    document.addEventListener('mousemove', function(e) {
      if (!isPanning || currentScale <= 1.1) return;
      const dx = e.clientX - panStartX;
      const dy = e.clientY - panStartY;
      translateX = initialTranslateX + dx;
      translateY = initialTranslateY + dy;
      applyTransform();
    });

    document.addEventListener('mouseup', function() {
      if (isPanning) {
        isPanning = false;
        galleryImage.style.cursor = 'grab';
      }
    });

    // Жесты на мобильных устройствах
    imageWrapper.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) {
        if (currentScale > 1.1) {
          isPanning = true;
          panStartX = e.touches[0].clientX;
          panStartY = e.touches[0].clientY;
          initialTranslateX = translateX;
          initialTranslateY = translateY;
        }
      } else if (e.touches.length === 2) {
        isPanning = false;
        initialDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialScale = currentScale;
        initialTranslateX = translateX;
        initialTranslateY = translateY;
      }
    }, { passive: false });

    imageWrapper.addEventListener('touchmove', function(e) {
      if (e.touches.length === 1 && isPanning && currentScale > 1.1) {
        const dx = e.touches[0].clientX - panStartX;
        const dy = e.touches[0].clientY - panStartY;
        translateX = initialTranslateX + dx;
        translateY = initialTranslateY + dy;
        applyTransform();
        e.preventDefault();
      } else if (e.touches.length === 2) {
        const newDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        
        if (initialDistance > 0 && newDistance > 0) {
          const scaleChange = newDistance / initialDistance;
          const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, initialScale * scaleChange));
          
          const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          
          const scaleRatio = newScale / initialScale;
          translateX = centerX - (centerX - initialTranslateX) * scaleRatio;
          translateY = centerY - (centerY - initialTranslateY) * scaleRatio;
          currentScale = newScale;
          
          applyTransform();
        }
        e.preventDefault();
      }
    }, { passive: false });

    imageWrapper.addEventListener('touchend', function() {
      isPanning = false;
    });

    // Экспортируем функции
    window._openGallery = openGallery;
    window._closeGallery = closeGallery;
  }

  // Запускаем инициализацию галереи
  initGallery();
  // ==================== КОНЕЦ ГАЛЕРЕИ ====================

  const translations = {
    tg: {
      search: 'ҷустуҷӯ', search_placeholder: 'Ҷустуҷӯ аз рӯи ном...', home: 'Асосӣ', favorites: 'Интихобшуда',
      my: 'Эълонҳо', profile: 'Профил', fav_title: 'Интихобшуда', my_title: 'Эълонҳои ман', user: 'Корбар',
      edit_name: 'Ном', edit_phone: 'Рақами телефон', village_label: '📍 Деҳаи ман', lang_label: '🌐 Забон / Язык',
      save_btn: 'Тағйиротро захира кунед', listings_label: 'эълон', views_label: 'тамошо', favs_label: 'интихобшуда',
      dark_theme: 'Реҷаи торик', logout: 'Баромад', create_title: 'Эълони нав', title_placeholder: 'Ном',
      desc_placeholder: 'Тавсиф', cond_new: 'Нав', cond_used: 'Истифодашуда', price_placeholder: 'Нарх (с.)',
      phone_placeholder: 'Телефон', photo_btn: 'Сурат', submit_btn: 'Нашр кунед', login_subtitle: 'Дар наздикӣ харед ва фурӯшед',
      login_btn: 'Ворид', no_listings: 'Эълон нест', no_favs: 'Интихобшуда нест', no_my: 'Эълон нест',
      no_search: 'Ҳеҷ чиз ёфт нашуд', free: 'Ройгон', call: 'Занг занед', profile_updated: 'Профил навсозӣ шуд!',
      login_required: 'Барои илова ба интихобшуда ворид шавед', fill_fields: 'Ном ва телефонро пур кунед',
      delete_confirm: 'Эълонро нест кунед?', min_photos: 'Илтимос, ҳадди ақал 5 сурат бор кунед!',
      upload_error: 'Хатогӣ дар боргузории суратҳо!', cloud_save_error: 'Хатогӣ дар сабти абрӣ!',
      cat_all: 'Ҳама', cat_electronics: 'Электроника', cat_computers: 'Компютерҳо', cat_appliances: 'Техникаи маишӣ',
      cat_auto: 'Авто', cat_moto: 'Мото', cat_realestate: 'Кӯчонанда', cat_tools: 'Асбобҳо', cat_parts: 'Қисмҳои эҳтиётӣ',
      cat_clothes: 'Либос', cat_services: 'Хизматрасониҳо', cat_other: 'Дигар',
      online_text: 'онлайн', whatsapp_btn: 'WhatsApp', location_btn: '📍 Локация',
      sort_all: 'Ҳама', sort_new: 'Нав', sort_old: 'Кӯҳна',
    },
    ru: {
      search: 'поиск', search_placeholder: 'Поиск по названию...', home: 'Главная', favorites: 'Избранное',
      my: 'Публикации', profile: 'Профиль', fav_title: 'Избранное', my_title: 'Мои публикации', user: 'Пользователь',
      edit_name: 'Имя', edit_phone: 'Номер телефона', village_label: '📍 Моё село', lang_label: '🌐 Забон / Язык',
      save_btn: 'Сохранить изменения', listings_label: 'объявлений', views_label: 'просмотров', favs_label: 'избранных',
      dark_theme: 'Тёмная тема', logout: 'Выйти', create_title: 'Новое объявление', title_placeholder: 'Название',
      desc_placeholder: 'Описание', cond_new: 'Новый', cond_used: 'Б.у.', price_placeholder: 'Цена (с.)',
      phone_placeholder: 'Телефон', photo_btn: 'Фото', submit_btn: 'Опубликовать', login_subtitle: 'Покупайте и продавайте рядом',
      login_btn: 'Войти', no_listings: 'Нет объявлений', no_favs: 'Нет избранных', no_my: 'Нет публикаций',
      no_search: 'Ничего не найдено', free: 'Бесплатно', call: 'Позвонить', profile_updated: 'Профиль обновлён!',
      login_required: 'Войдите, чтобы добавлять в избранное', fill_fields: 'Заполните название и телефон',
      delete_confirm: 'Удалить объявление?', min_photos: 'Пожалуйста, загрузите минимум 5 изображений!',
      upload_error: 'Ошибка загрузки изображений!', cloud_save_error: 'Ошибка сохранения в облаке!',
      cat_all: 'Все', cat_electronics: 'Электроника', cat_computers: 'Компьютеры', cat_appliances: 'Бытовая техника',
      cat_auto: 'Авто', cat_moto: 'Мото', cat_realestate: 'Недвижимость', cat_tools: 'Инструменты', cat_parts: 'Запчасти',
      cat_clothes: 'Одежда', cat_services: 'Услуги', cat_other: 'Другое',
      online_text: 'онлайн', whatsapp_btn: 'WhatsApp', location_btn: '📍 Локация',
      sort_all: 'Все', sort_new: 'Новые', sort_old: 'Старые',
    }
  };

  let currentLang = localStorage.getItem('geran_lang') || 'ru';
  function t(key) { return translations[currentLang]?.[key] || translations['ru']?.[key] || key; }

  function updateLangUI() {
    document.documentElement.lang = currentLang;
    const langBtn = document.getElementById('lang-switch-btn');
    if (langBtn) {
      langBtn.textContent = currentLang === 'tg' ? 'TJ' : 'RU';
      langBtn.title = currentLang === 'tg' ? 'Русский' : 'Тоҷикӣ';
    }
    const langSelect = document.getElementById('edit-lang');
    if (langSelect) langSelect.value = currentLang;
    
    const onlineTextEl = document.getElementById('online-text');
    if (onlineTextEl) onlineTextEl.textContent = t('online_text');
  }

  function applyLanguage() {
    updateLangUI();
    const searchEl = document.getElementById('search-placeholder');
    if (searchEl) searchEl.textContent = t('search');
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.placeholder = t('search_placeholder');
    document.querySelectorAll('.nav-text').forEach(el => {
      const key = el.dataset.key;
      if (key && t(key)) el.textContent = t(key);
    });
    const favTitle = document.getElementById('fav-title');
    if (favTitle) favTitle.textContent = t('fav_title');
    const myTitle = document.getElementById('my-title');
    if (myTitle) myTitle.textContent = t('my_title');
    const villageLabel = document.getElementById('village-label');
    if (villageLabel) villageLabel.textContent = t('village_label');
    const langLabel = document.getElementById('lang-label');
    if (langLabel) langLabel.textContent = t('lang_label');
    const saveBtn = document.getElementById('save-profile-btn');
    if (saveBtn) saveBtn.textContent = t('save_btn');
    const listingsLabel = document.getElementById('stat-listings-label');
    if (listingsLabel) listingsLabel.textContent = t('listings_label');
    const viewsLabel = document.getElementById('stat-views-label');
    if (viewsLabel) viewsLabel.textContent = t('views_label');
    const favsLabel = document.getElementById('stat-favs-label');
    if (favsLabel) favsLabel.textContent = t('favs_label');
    const darkLabel = document.getElementById('dark-theme-label');
    if (darkLabel) darkLabel.textContent = t('dark_theme');
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.textContent = t('logout');
    const profileName = document.getElementById('profile-name');
    if (profileName && !state.user?.name) profileName.textContent = t('user');
    const editName = document.getElementById('edit-name');
    if (editName) editName.placeholder = t('edit_name');
    const editPhone = document.getElementById('edit-phone');
    if (editPhone) editPhone.placeholder = t('edit_phone');
    const createTitleLabel = document.getElementById('create-title-label');
    if (createTitleLabel) createTitleLabel.textContent = t('create_title');
    const createTitle = document.getElementById('create-title');
    if (createTitle) createTitle.placeholder = t('title_placeholder');
    const createDesc = document.getElementById('create-desc');
    if (createDesc) createDesc.placeholder = t('desc_placeholder');
    document.querySelectorAll('.cond-new-text').forEach(el => el.textContent = t('cond_new'));
    document.querySelectorAll('.cond-used-text').forEach(el => el.textContent = t('cond_used'));
    const createPrice = document.getElementById('create-price');
    if (createPrice) createPrice.placeholder = t('price_placeholder');
    const createPhone = document.getElementById('create-phone');
    if (createPhone) createPhone.placeholder = '📞 ' + t('phone_placeholder');
    const photoText = document.getElementById('photo-upload-text');
    if (photoText) photoText.textContent = t('photo_btn');
    const submitBtn = document.getElementById('submit-create');
    if (submitBtn) submitBtn.textContent = t('submit_btn');
    const loginSub = document.getElementById('login-subtitle');
    if (loginSub) loginSub.textContent = t('login_subtitle');
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.textContent = t('login_btn');
    const villageNames = {
      'Деҳаи Геран': { tg: 'Деҳаи Геран', ru: 'Дехаи Геран' },
      'Деҳаи Якум': { tg: 'Деҳаи Якум', ru: 'Дехаи Якум' },
      'Деҳаи Дуввум': { tg: 'Деҳаи Дуввум', ru: 'Дехаи Дуввум' },
      'Деҳаи Севвум': { tg: 'Деҳаи Севвум', ru: 'Дехаи Севвум' },
      'Деҳаи Чахорум': { tg: 'Деҳаи Чаҳорум', ru: 'Дехаи Чахорум' },
      'Деҳаи Панчум': { tg: 'Деҳаи Панҷум', ru: 'Дехаи Панчум' },
      'Деҳаи Шашум': { tg: 'Деҳаи Шашум', ru: 'Дехаи Шашум' },
      'Деҳаи Хафтум': { tg: 'Деҳаи Ҳафтум', ru: 'Дехаи Хафтум' },
      'Деҳаи Хаштум': { tg: 'Деҳаи Ҳаштум', ru: 'Дехаи Хаштум' },
      'Деҳаи Нухум': { tg: 'Деҳаи Нуҳум', ru: 'Дехаи Нухум' },
      'Деҳаи Дахум': { tg: 'Деҳаи Даҳум', ru: 'Дехаи Дахум' },
      'Раёни Чайхун': { tg: 'Раёни Чайхун', ru: 'Райони Чайхун' },
      'Бозор': { tg: 'Бозор', ru: 'Бозор' },
      'Аэрапорт': { tg: 'Аэрапорт', ru: 'Аэропорт' },
      'Новая Земля': { tg: 'Новая Земля', ru: 'Новая Земля' },
      'Рисавхоз': { tg: 'Рисавхоз', ru: 'Рисавхоз' },
      'Карадум': { tg: 'Карадум', ru: 'Карадум' },
      'Каврак': { tg: 'Каврак', ru: 'Каврак' },
      'Турмано': { tg: 'Турмано', ru: 'Турмано' },
      'Далин 1': { tg: 'Далин 1', ru: 'Далин 1' },
      'Далин 2': { tg: 'Далин 2', ru: 'Далин 2' },
      'Далин 3': { tg: 'Далин 3', ru: 'Далин 3' },
      'Далин 4': { tg: 'Далин 4', ru: 'Далин 4' },
      'Панч': { tg: 'Панч', ru: 'Панч' }
    };
    document.querySelectorAll('#edit-village option, #create-village option').forEach(opt => {
      const names = villageNames[opt.value];
      if (names) opt.textContent = names[currentLang] || opt.value;
    });
    document.querySelectorAll('#create-category option').forEach(opt => {
      const catKey = opt.value;
      const translationKey = categoryTransKeys[catKey] || ('cat_' + catKey);
      if (translations[currentLang] && translations[currentLang][translationKey]) {
        opt.textContent = translations[currentLang][translationKey];
      }
    });
    
    updateFilterBarTexts();
    
    if (state.currentScreen) renderScreen(state.currentScreen);
  }

  const SHOW_DEFAULT_LISTINGS = false;
  const DEFAULT_LISTINGS = SHOW_DEFAULT_LISTINGS ? [
    { id: '1', title: 'Установка и настройка спутниковой тарелки', desc: 'Установка спутниковой антенны, настройка каналов. Гарантия качества.', price: 35, isFree: false, category: 'Услуги', phone: '+992 971 220 800', village: 'Деҳаи Геран', images: ['311.png'], date: Date.now(), userId: 'demo', condition: 'new', isVIP: false },
    { id: '7', title: 'Установка Windows и драйверов', desc: 'Профессиональная установка Windows и драйверов на ПК или ноутбук. Гарантия качества.', price: 50, isFree: false, category: 'Услуги', phone: '+992 971 220 800', village: 'Деҳаи Геран', images: ['34.jpg'], date: Date.now(), userId: 'demo', condition: 'new', isVIP: false },
    { id: '8', title: 'Монтаж электропроводки и электрики', desc: 'Монтаж электропроводки, установка розеток и выключателей. Гарантия качества на все работы.', price: 70, isFree: false, category: 'Услуги', phone: '+992 971 220 800', village: 'Деҳаи Геран', images: ['35.jpg'], date: Date.now(), userId: 'demo', condition: 'new', isVIP: false }
  ] : [];

  function normalizeListing(listing) {
    if (!listing || typeof listing !== 'object') return listing;
    listing.normalizedVillage = normalizeVillageName(listing.village);
    listing.titleLower = (listing.title || '').toLowerCase();
    listing.dateMs = getDateMs(listing.date);
    return listing;
  }

  function normalizeListings(listings = []) {
    return listings.map(normalizeListing);
  }

  function getActiveListings() {
    return state.listings.filter(l => l.isActive !== false);
  }

  let favoritesSet = new Set(JSON.parse(localStorage.getItem('geran_favorites')) || []);
  function refreshFavoritesSet() {
    favoritesSet = new Set(state.favorites);
  }

  const state = {
    user: JSON.parse(localStorage.getItem('geran_user')) || null,
    listings: normalizeListings([...DEFAULT_LISTINGS]),
    favorites: JSON.parse(localStorage.getItem('geran_favorites')) || [],
    currentScreen: 'home',
    editId: null,
    searchQuery: '',
    activeCategory: null,
    selectedCondition: 'new',
    uploadedPhotos: [],
    selectedVillage: null,
    dateSort: null,
    filterCategory: null,
  };

  refreshFavoritesSet();

  let selectedImages = [];
  const MAX_PHOTOS = 5;
  const PLACEHOLDER_IMG = 'https://cdn-icons-png.flaticon.com/512/2922/2922510.png';
  let savedScrollPosition = 0;
  let shouldRestoreScroll = false;
  let isChangingCategory = false;

  const save = () => {
    localStorage.setItem('geran_favorites', JSON.stringify(state.favorites));
    if (state.user) localStorage.setItem('geran_user', JSON.stringify(state.user));
    refreshFavoritesSet();
  };

  function formatDate(timestamp) {
    if (!timestamp) return '19.07.26';
    try {
      let date;
      if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'number' || typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else {
        return '19.07.26';
      }
      
      if (isNaN(date.getTime())) return '19.07.26';
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      
      return `${day}.${month}.${year}`;
    } catch (e) {
      return '19.07.26';
    }
  }

  function cardHTML(l) {
    const liked = favoritesSet.has(l.id);
    const priceVal = l.price || 0;
    const hasCurrency = typeof priceVal === 'string' && (priceVal.includes('Р') || priceVal.includes('р') || priceVal.includes('P'));
    
    let priceText;
    if (l.isFree === true || l.isFree === 'true' || priceVal === 0 || priceVal === '0' || priceVal === '' || priceVal === null || priceVal === undefined) {
      priceText = `<div class="card-price free">${t('free')}</div>`;
    } else {
      const formattedPrice = hasCurrency ? priceVal : priceVal.toLocaleString() + ' c.';
      priceText = `<div class="card-price">${formattedPrice}</div>`;
    }
    
    let finalSrc = PLACEHOLDER_IMG;
    if (l.images && l.images.length > 0) {
      let raw = l.images[0];
      if (raw && (raw.startsWith('data:image/') || raw.startsWith('http://') || raw.startsWith('https://'))) {
        finalSrc = raw;
      } else if (raw) {
        finalSrc = raw;
      }
    }
    const vipClass = l.isVIP ? 'vip-card' : '';
    const vipBadge = l.isVIP ? '<div class="card-badge vip-badge">VIP</div>' : '';
    const dateFormatted = formatDate(l.date);
    
    // Подготавливаем изображения для галереи
    const galleryImages = (l.images && l.images.length > 0) 
      ? l.images.filter(src => src && (src.startsWith('data:image/') || src.startsWith('http')))
      : [PLACEHOLDER_IMG];
    const imagesJSON = JSON.stringify(galleryImages).replace(/"/g, '&quot;');
    
    return `
      <div class="card ${vipClass}" onclick="window._openDetail('${l.id}')">
        <div class="card-img" onclick="event.stopPropagation(); window._openGallery(${JSON.stringify(galleryImages)}, 0)">
          <img src="${finalSrc}" alt="${l.title}" loading="lazy" onerror="this.style.display='none';" onload="this.style.display='block';">
          ${vipBadge}
          <div class="card-heart ${liked?'liked':''}" onclick="window._toggleFav(event, '${l.id}')">
            <span class="material-symbols-rounded">${liked ? 'favorite' : 'favorite'}</span>
          </div>
        </div>
        <div class="card-body">
          <div>
            ${priceText}
            <div class="card-title">${l.title}</div>
          </div>
          <div class="card-meta">
            <span>📍 ${l.village || 'Деҳаи Геран'}</span>
            <span> ${dateFormatted}</span>
            <span>${l.condition === 'new' ? t('cond_new') : t('cond_used')}</span>
          </div>
        </div>
      </div>`;
  }

  const categoryKeys = ['Услуги', 'Электроника', 'Бытовая техника', 'Компьютеры', 'Авто', 'Мото', 'Недвижимость', 'Инструменты', 'Запчасти', 'Одежда', 'Другое'];
  const categoryIcons = {
    'Услуги': 'handyman', 'Электроника': 'smartphone', 'Бытовая техника': 'tv', 'Компьютеры': 'computer',
    'Авто': 'directions_car', 'Мото': 'two_wheeler', 'Недвижимость': 'home', 'Инструменты': 'build',
    'Запчасти': 'build_circle', 'Одежда': 'checkroom', 'Другое': 'category'
  };
  const categoryTransKeys = {
    'Услуги': 'cat_services', 'Электроника': 'cat_electronics', 'Бытовая техника': 'cat_appliances',
    'Компьютеры': 'cat_computers', 'Авто': 'cat_auto', 'Мото': 'cat_moto', 'Недвижимость': 'cat_realestate',
    'Инструменты': 'cat_tools', 'Запчасти': 'cat_parts', 'Одежда': 'cat_clothes', 'Другое': 'cat_other'
  };

  const villagesList = [
    "Дехаи Геран", "Дехаи Якум", "Дехаи Дуввум", "Дехаи Севвум", "Дехаи Чахорум",
    "Дехаи Панчум", "Дехаи Шашум", "Дехаи Хафтум", "Дехаи Хаштум", "Дехаи Нухум",
    "Дехаи Дахум", "Раёни Чайхун", "Бозор", "Аэрапорт", "Новая Земля", "Рисавхоз",
    "Карадум", "Каврак", "Турмано", "Далин 1", "Далин 2", "Далин 3", "Далин 4", "Панч"
  ];

  function normalizeVillageName(name) {
    if (!name) return '';
    let normalized = name.trim().replace(/\s+/g, ' ').toLowerCase();
    normalized = normalized.replace(/ҳ/g, 'х').replace(/ҷ/g, 'ч').replace(/ғ/g, 'г').replace(/ӣ/g, 'и').replace(/қ/g, 'к').replace(/ӯ/g, 'у');
    return normalized;
  }

  function getDateMs(dateField) {
    if (!dateField) return 0;
    try {
      if (dateField && typeof dateField.toDate === 'function') {
        return dateField.toDate().getTime();
      } else if (dateField instanceof Date) {
        return dateField.getTime();
      } else if (typeof dateField === 'number') {
        return dateField;
      } else if (typeof dateField === 'string') {
        return new Date(dateField).getTime();
      }
    } catch (e) {}
    return 0;
  }

  function getFilteredListings() {
    let filtered = getActiveListings();
    
    if (state.selectedVillage) {
      const normalizedSelected = normalizeVillageName(state.selectedVillage);
      filtered = filtered.filter(l => l.normalizedVillage === normalizedSelected);
    }
    
    if (state.filterCategory) {
      filtered = filtered.filter(l => l.category === state.filterCategory);
    }
    
    if (state.dateSort === 'new') {
      filtered = filtered.slice().sort((a, b) => getDateMs(b.date) - getDateMs(a.date));
    } else if (state.dateSort === 'old') {
      filtered = filtered.slice().sort((a, b) => getDateMs(a.date) - getDateMs(b.date));
    }
    
    return filtered;
  }

  const HOME_RENDER_CHUNK = 20;
  let homeRenderToken = 0;

  function renderHomeListingsChunked(container, listings) {
    const token = ++homeRenderToken;
    container.innerHTML = '';
    const template = document.createElement('template');
    let index = 0;

    function renderNext() {
      if (token !== homeRenderToken) return;

      const end = Math.min(index + HOME_RENDER_CHUNK, listings.length);
      let html = '';
      for (; index < end; index++) {
        html += cardHTML(listings[index]);
      }

      template.innerHTML = html;
      const fragment = document.createDocumentFragment();
      fragment.appendChild(template.content.cloneNode(true));
      container.appendChild(fragment);
      template.innerHTML = '';

      if (index < listings.length) {
        if (window.requestIdleCallback) {
          requestIdleCallback(renderNext, { timeout: 50 });
        } else {
          setTimeout(renderNext, 16);
        }
      }
    }

    renderNext();
  }

  function updateFilterBarTexts() {
    const locText = document.getElementById('filter-btn-location-text');
    const sortText = document.getElementById('filter-btn-sort-text');
    const catText = document.getElementById('filter-btn-category-text');
    const locBtn = document.getElementById('filter-btn-location');
    const sortBtn = document.getElementById('filter-btn-sort');
    const catBtn = document.getElementById('filter-btn-category');
    
    if (locText) locText.textContent = state.selectedVillage || t('location_btn');
    if (sortText) {
      if (state.dateSort === 'new') sortText.textContent = t('sort_new');
      else if (state.dateSort === 'old') sortText.textContent = t('sort_old');
      else sortText.textContent = t('sort_all');
    }
    if (catText) {
      if (!state.filterCategory) {
        const totalCount = state.listings.filter(l => l.isActive !== false).length;
        catText.textContent = (t('cat_all') || 'Все категории') + ' (' + totalCount + ')';
      } else {
        const catKey = categoryTransKeys[state.filterCategory] || ('cat_' + state.filterCategory);
        const catCount = state.listings.filter(l => l.isActive !== false && l.category === state.filterCategory).length;
        catText.textContent = (t(catKey) || state.filterCategory) + ' (' + catCount + ')';
      }
    }
    
    if (locBtn) locBtn.classList.toggle('active', !!state.selectedVillage);
    if (sortBtn) sortBtn.classList.toggle('active', state.dateSort !== null);
    if (catBtn) catBtn.classList.toggle('active', state.filterCategory !== null);
  }

  let cachedListings = null;
  let listingsPromise = null;
  let cacheTimestamp = 0;
  const CACHE_DURATION = 5 * 60 * 1000;

  async function loadFirestoreListings(forceRefresh = false) {
    if (!db || !firebaseReady) return [];
    
    if (!forceRefresh && cachedListings && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
      console.log("Using cached listings");
      return cachedListings;
    }
    
    if (!forceRefresh && listingsPromise) {
      return listingsPromise;
    }
    
    listingsPromise = (async () => {
      try {
        const listingsCol = collection(db, 'listings');
        const q = query(listingsCol, orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        const cloud = [];
        snapshot.forEach(docSnap => cloud.push(normalizeListing({ id: docSnap.id, ...docSnap.data() })));
        
        cachedListings = cloud;
        cacheTimestamp = Date.now();
        return cloud;
      } catch (e) {
        console.error('Firestore read error:', e);
        return cachedListings || [];
      } finally {
        listingsPromise = null;
      }
    })();
    
    return listingsPromise;
  }

  async function renderHome() {
    console.log("renderHome");
    
    const cloudListings = await loadFirestoreListings();
    const merged = [...cloudListings];
    DEFAULT_LISTINGS.forEach(item => {
      if (!merged.some(l => l.id === item.id)) merged.push(normalizeListing({ ...item }));
    });
    state.listings = merged.map(normalizeListing);
    
    let filtered = getFilteredListings();
    
    if (state.activeCategory) {
      filtered = filtered.filter(l => l.category === state.activeCategory);
    }

    if (state.dateSort === null) {
      const sessionId = sessionStorage.getItem("sessionId");
      const currentSessionId = window._sessionId || (window._sessionId = Date.now().toString());
      if (!sessionId || sessionId !== currentSessionId) {
        sessionStorage.removeItem("homeOrder");
        sessionStorage.setItem("sessionId", currentSessionId);
      }
      let order = sessionStorage.getItem("homeOrder");
      if (!order) {
        const allActive = state.listings.filter(l => l.isActive !== false);
        const shuffled = [...allActive];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        order = shuffled.map(x => x.id);
        sessionStorage.setItem("homeOrder", JSON.stringify(order));
      } else {
        order = JSON.parse(order);
      }
      const orderIndex = new Map(order.map((id, idx) => [id, idx]));
      filtered.sort((a, b) => {
        const ia = orderIndex.has(a.id) ? orderIndex.get(a.id) : Number.MAX_SAFE_INTEGER;
        const ib = orderIndex.has(b.id) ? orderIndex.get(b.id) : Number.MAX_SAFE_INTEGER;
        return ia - ib;
      });
    }

    const gridContainer = document.getElementById('home-listings-container');
    if (gridContainer) {
      if (!filtered.length) {
        gridContainer.innerHTML = `<p style="padding:20px;text-align:center;">${t('no_listings')}</p>`;
      } else if (filtered.length > HOME_RENDER_CHUNK) {
        renderHomeListingsChunked(gridContainer, filtered);
      } else {
        gridContainer.innerHTML = filtered.map(cardHTML).join('');
      }
    }

    const banner = document.getElementById('g-express-banner');
    const filterBar = document.getElementById('filter-bar');
    
    if (banner) {
      banner.style.display = 'block';
      requestAnimationFrame(() => {
        banner.classList.add('g-express-loaded');
      });
    }
    
    if (filterBar) {
      filterBar.style.display = 'flex';
      updateFilterBarTexts();
      filterBar.classList.add('visible');
    }

    setTimeout(initBannerCarousel, 50);

    if (isChangingCategory) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        isChangingCategory = false;
      });
    }
  }

  function openLocationModal() {
    const modal = document.createElement('div');
    modal.className = 'filter-modal-backdrop';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    const content = document.createElement('div');
    content.className = 'filter-modal-content';
    
    const title = document.createElement('h3');
    title.textContent = '📍 Выберите локацию';
    content.appendChild(title);
    
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Сбросить локацию';
    clearBtn.className = 'btn btn-outline';
    clearBtn.onclick = () => {
      state.selectedVillage = null;
      localStorage.setItem('geran_selected_village', 'ALL');
      modal.remove();
      renderHome();
    };
    content.appendChild(clearBtn);
    
    villagesList.forEach(village => {
      const btn = document.createElement('button');
      btn.textContent = village;
      btn.className = 'btn btn-outline';
      if (state.selectedVillage === village) {
        btn.style.background = 'var(--primary)';
        btn.style.color = 'white';
      }
      btn.onclick = () => {
        state.selectedVillage = village;
        localStorage.setItem('geran_selected_village', village);
        modal.remove();
        renderHome();
      };
      content.appendChild(btn);
    });
    
    modal.appendChild(content);
    document.body.appendChild(modal);
  }

  function openSortModal() {
    const modal = document.createElement('div');
    modal.className = 'filter-modal-backdrop';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    const content = document.createElement('div');
    content.className = 'filter-modal-content';
    
    const title = document.createElement('h3');
    title.textContent = 'Сортировка по дате';
    content.appendChild(title);
    
    const options = [
      { value: null, label: t('sort_all') },
      { value: 'new', label: t('sort_new') },
      { value: 'old', label: t('sort_old') }
    ];
    
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.textContent = opt.label;
      btn.className = 'btn btn-outline';
      if (state.dateSort === opt.value) {
        btn.style.background = 'var(--primary)';
        btn.style.color = 'white';
      }
      btn.onclick = () => {
        state.dateSort = opt.value;
        modal.remove();
        renderHome();
      };
      content.appendChild(btn);
    });
    
    modal.appendChild(content);
    document.body.appendChild(modal);
  }

  function openCategoryModal() {
    const modal = document.createElement('div');
    modal.className = 'filter-modal-backdrop';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    const content = document.createElement('div');
    content.className = 'filter-modal-content';
    
    const title = document.createElement('h3');
    title.textContent = 'Выберите категорию';
    content.appendChild(title);
    
    const activeListings = state.listings.filter(l => l.isActive !== false);
    const selectedVillageNormalized = state.selectedVillage ? normalizeVillageName(state.selectedVillage) : null;
    const filteredByVillage = selectedVillageNormalized
      ? activeListings.filter(l => l.normalizedVillage === selectedVillageNormalized)
      : activeListings;
    
    const totalCount = filteredByVillage.length;
    const allBtn = document.createElement('button');
    allBtn.textContent = (t('cat_all') || 'Все категории') + ' (' + totalCount + ')';
    allBtn.className = 'btn btn-outline';
    if (state.filterCategory === null) {
      allBtn.style.background = 'var(--primary)';
      allBtn.style.color = 'white';
    }
    allBtn.onclick = () => {
      state.filterCategory = null;
      modal.remove();
      renderHome();
    };
    content.appendChild(allBtn);
    
    const categoryCounts = filteredByVillage.reduce((counts, l) => {
      counts[l.category] = (counts[l.category] || 0) + 1;
      return counts;
    }, {});

    categoryKeys.forEach(cat => {
      const catName = t(categoryTransKeys[cat]) || cat;
      const catCount = categoryCounts[cat] || 0;
      const btn = document.createElement('button');
      btn.textContent = catName + ' (' + catCount + ')';
      btn.className = 'btn btn-outline';
      if (state.filterCategory === cat) {
        btn.style.background = 'var(--primary)';
        btn.style.color = 'white';
      }
      btn.onclick = () => {
        state.filterCategory = cat;
        modal.remove();
        renderHome();
      };
      content.appendChild(btn);
    });
    
    modal.appendChild(content);
    document.body.appendChild(modal);
  }

  window._openLocationFilter = openLocationModal;
  window._filterCategory = (cat) => { 
    state.filterCategory = cat; 
    shouldRestoreScroll = false; 
    isChangingCategory = true; 
    renderHome(); 
  };
  window._clearCategory = () => { 
    state.filterCategory = null; 
    shouldRestoreScroll = false; 
    isChangingCategory = true; 
    renderHome(); 
  };

  var LIST_RENDER_IDLE = window.requestIdleCallback ? window.requestIdleCallback.bind(window) : function(fn) { return setTimeout(fn, 0); };
  var LIST_RENDER_CANCEL = window.cancelIdleCallback ? window.cancelIdleCallback.bind(window) : function(id) { clearTimeout(id); };

  function renderHtmlListChunked(container, htmlItems, emptyHtml) {
    if (!container) return;
    if (container._renderTaskId) {
      LIST_RENDER_CANCEL(container._renderTaskId);
      container._renderTaskId = null;
    }
    container.innerHTML = '';
    if (!htmlItems.length) {
      container.innerHTML = emptyHtml;
      return;
    }
    var index = 0;
    var chunkSize = 50;
    function renderChunk() {
      var end = Math.min(index + chunkSize, htmlItems.length);
      var chunkHtml = htmlItems.slice(index, end).join('');
      container.insertAdjacentHTML('beforeend', chunkHtml);
      index = end;
      if (index < htmlItems.length) {
        container._renderTaskId = LIST_RENDER_IDLE(renderChunk);
      } else {
        container._renderTaskId = null;
      }
    }
    renderChunk();
  }

  function renderFavorites() {
    const favs = state.listings.filter(l => favoritesSet.has(l.id));
    renderHtmlListChunked(document.getElementById('favorites-container'), favs.map(cardHTML), `<p>${t('no_favs')}</p>`);
  }

  function renderMy() {
    const my = state.listings.filter(l => l.userId === (state.user?.uid || ''));
    const items = my.map(l => `
      <div class="card" style="padding:14px;margin-bottom:10px">
        <b>${l.title}</b> - ${l.isFree ? t('free') : (l.price||0).toLocaleString()+' с.'}
        <div style="margin-top:8px;display:flex;gap:8px">
          <button class="btn btn-outline" style="flex:0;padding:8px 12px" onclick="window._editListing('${l.id}')">✏️</button>
          <button class="btn btn-outline" style="flex:0;padding:8px 12px;color:red;border-color:red" onclick="window._deleteListing('${l.id}')">🗑️</button>
        </div>
      </div>`);
    renderHtmlListChunked(document.getElementById('my-container'), items, `<p>${t('no_my')}</p>`);
  }

  function renderProfile() {
    if (!state.user) { showScreen('login'); return; }
    document.getElementById('profile-name').textContent = state.user?.name || t('user');
    document.getElementById('profile-phone').textContent = state.user?.phone || '';
    document.getElementById('edit-name').value = state.user?.name || '';
    document.getElementById('edit-phone').value = state.user?.phone || '';
    const editVillageSelect = document.getElementById('edit-village');
    if (editVillageSelect) {
      if (!editVillageSelect.dataset.optionsPopulated) {
        editVillageSelect.innerHTML = villagesList.map(name => `<option value="${name}">${name}</option>`).join('');
        editVillageSelect.dataset.optionsPopulated = 'true';
      }
      editVillageSelect.value = state.user?.village || 'Дехаи Геран';
    }
    document.getElementById('edit-lang').value = currentLang;
    if (state.user?.avatar) document.getElementById('profile-avatar-img').src = state.user.avatar;
    const my = state.listings.filter(l => l.userId === (state.user?.uid || ''));
    document.getElementById('stat-listings').textContent = my.length;
    document.getElementById('stat-views').textContent = my.reduce((acc, l) => acc + (l.views || 0), 0);
    document.getElementById('stat-favs').textContent = state.favorites.length;
  }

  function renderCreateForm() {
    if (state.currentScreen === 'create' && !state.editId) return;
    if (state.editId) return;
    document.getElementById('create-title').value = '';
    document.getElementById('create-desc').value = '';
    document.getElementById('create-price').value = '';
    document.getElementById('create-phone').value = state.user?.phone || '';
    document.getElementById('create-whatsapp').value = '';
    document.getElementById('create-village').value = state.user?.village || 'Дехаи Геран';
    document.getElementById('create-category').value = 'Электроника';
    state.selectedCondition = 'new';
    document.querySelectorAll('#condition-selector .condition-option').forEach(el => {
      el.classList.toggle('active', el.dataset.condition === 'new');
    });
    selectedImages = [];
    renderSelectedPhotos();
    updatePhotoCounter();
    updateUploadButtonState();
  }

  function renderSelectedPhotos() {
    const container = document.getElementById('photo-previews-container');
    if (!container) return;
    if (!container.dataset.removeHandlerAttached) {
      container.addEventListener('click', function(e) {
        const btn = e.target.closest('.photo-thumb-remove');
        if (!btn) return;
        e.stopPropagation();
        const index = parseInt(btn.dataset.index, 10);
        if (!Number.isNaN(index) && index >= 0) {
          selectedImages.splice(index, 1);
          renderSelectedPhotos();
          updatePhotoCounter();
          updateUploadButtonState();
        }
      });
      container.dataset.removeHandlerAttached = 'true';
    }
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    selectedImages.forEach((photo, index) => {
      const thumb = document.createElement('div');
      thumb.className = 'photo-thumb';
      thumb.style.position = 'relative';
      thumb.style.width = '60px';
      thumb.style.height = '60px';
      thumb.innerHTML = `<img src="${photo}" alt=""><span class="photo-thumb-remove" data-index="${index}">×</span>`;
      fragment.appendChild(thumb);
    });
    container.appendChild(fragment);
  }

  function updatePhotoCounter() {
    const countEl = document.getElementById('photo-count');
    if (countEl) {
      countEl.textContent = selectedImages.length;
    }
  }

  function updateUploadButtonState() {
    const uploadBtn = document.getElementById('photo-upload-btn');
    if (!uploadBtn) return;
    
    if (selectedImages.length >= MAX_PHOTOS) {
      uploadBtn.classList.add('disabled');
    } else {
      uploadBtn.classList.remove('disabled');
    }
  }

  function showPhotoLimitMessage() {
    const limitMsg = document.getElementById('photo-limit-message');
    if (!limitMsg) return;
    
    limitMsg.classList.add('show');
    
    setTimeout(() => {
      limitMsg.classList.remove('show');
    }, 3000);
  }

  async function uploadImagesToImgBB(base64Array) {
    var apiKey = '044c84fb33e068293052ead694715174';
    var urls = [];
    if (!Array.isArray(base64Array) || base64Array.length === 0) return urls;
    for (var i = 0; i < base64Array.length; i++) {
      try {
        var rawString = base64Array[i];
        if (typeof rawString !== 'string') continue;
        var cleanBase64 = rawString.includes(',') ? rawString.split(',')[1] : rawString;
        var formData = new FormData();
        formData.append('image', cleanBase64);
        var res = await fetch('https://api.imgbb.com/1/upload?key=' + apiKey, { method: 'POST', body: formData });
        var data = await res.json();
        if (data && data.success && data.data && data.data.display_url) urls.push(data.data.display_url);
        else console.error('Ошибка ImgBB:', data);
      } catch (e) { console.error('Ошибка сети при загрузке изображения:', e); }
    }
    return urls;
  }

  document.getElementById('submit-create').addEventListener('click', async function (e) {
    e.preventDefault();
    const title = document.getElementById('create-title').value.trim();
    const phone = document.getElementById('create-phone').value.trim();
    if (!title || !phone) { alert(t('fill_fields')); return; }
    const btn = document.getElementById('submit-create');
    btn.disabled = true;
    btn.textContent = 'Загрузка и публикация...';
    try {
      let imageUrls = [];
      if (Array.isArray(selectedImages) && selectedImages.length > 0) {
        const newImages = selectedImages.filter(img => img.startsWith('data:'));
        const existingImages = selectedImages.filter(img => !img.startsWith('data:'));
        if (newImages.length > 0) {
          const uploadedUrls = await uploadImagesToImgBB(newImages.slice(0, MAX_PHOTOS));
          imageUrls = [...existingImages, ...uploadedUrls];
        } else { imageUrls = [...existingImages]; }
      }
      const isFree = document.getElementById('create-free')?.checked || false;
      const priceInput = document.getElementById('create-price');
      const activeCondition = document.querySelector('#condition-selector .condition-option.active');
      const whatsappValue = document.getElementById('create-whatsapp').value.trim();
      const listingData = {
        title: title,
        desc: document.getElementById('create-desc').value.trim(),
        price: isFree ? 0 : (parseInt(priceInput?.value) || 0),
        phone: phone,
        village: document.getElementById('create-village').value.trim() || 'Деҳаи Геран',
        images: imageUrls,
        date: serverTimestamp(),
        userId: state.user?.uid || 'demo',
        condition: activeCondition?.dataset.condition || 'new',
        isVIP: document.getElementById('create-vip')?.checked || false,
        category: document.getElementById('create-category').value,
        whatsapp: whatsappValue || null
      };
      
      listingData.isFree = isFree;
      
      if (state.editId) {
        const listingRef = doc(db, 'listings', state.editId);
        await updateDoc(listingRef, listingData);
        state.editId = null;
      } else {
        const listingsCol = collection(db, 'listings');
        await addDoc(listingsCol, listingData);
      }
      cachedListings = null;
      alert('Объявление успешно опубликовано!');
      document.getElementById('create-title').value = '';
      document.getElementById('create-desc').value = '';
      if (priceInput) priceInput.value = '';
      document.getElementById('create-phone').value = '+992 ';
      document.getElementById('create-whatsapp').value = '';
      document.getElementById('create-village').value = 'Деҳаи Геран';
      document.getElementById('create-category').value = 'Электроника';
      document.getElementById('create-free').checked = false;
      document.getElementById('create-vip').checked = false;
      document.getElementById('create-photo-input').value = '';
      selectedImages = [];
      renderSelectedPhotos();
      updatePhotoCounter();
      updateUploadButtonState();
      showScreen('home');
    } catch (error) { console.error('Ошибка публикации:', error); alert('Ошибка при публикации объявления.'); }
    finally { btn.disabled = false; btn.textContent = 'Нашр кунед'; }
  });

  window._toggleFav = (event, id) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (!state.user) {
      alert(t('login_required'));
      return false;
    }
    
    const index = state.favorites.indexOf(id);
    if (index !== -1) {
      state.favorites.splice(index, 1);
    } else {
      state.favorites.push(id);
    }
    
    save();
    renderScreen(state.currentScreen);
    return false;
  };

  window._openDetail = async (id) => {
    savedScrollPosition = window.scrollY;
    shouldRestoreScroll = true;
    const l = state.listings.find(x => x.id === id);
    if (!l) return;

    const viewedKey = 'viewed_listing_' + id;
    const userId = state.user?.uid || 'guest_' + (localStorage.getItem('geran_guest_id') || '');
    
    if (!state.user && !localStorage.getItem('geran_guest_id')) {
      localStorage.setItem('geran_guest_id', 'guest_' + Date.now());
    }
    
    const hasViewed = localStorage.getItem(viewedKey);
    
    if (db && firebaseReady && !hasViewed) {
      try {
        const listingRef = doc(db, 'listings', id);
        await updateDoc(listingRef, {
          views: increment(1)
        });
        localStorage.setItem(viewedKey, 'true');
        if (l.views !== undefined) l.views += 1;
        else l.views = 1;
      } catch (e) {
        console.warn('View increment error:', e);
      }
    }
    
    let images = (l.images && l.images.length > 0) 
      ? l.images.filter(src => src && (src.startsWith('data:image/') || src.startsWith('http')))
      : [PLACEHOLDER_IMG];
    
    if (images.length === 0) images = [PLACEHOLDER_IMG];
    
    let priceText;
    if (l.isFree === true || l.isFree === 'true' || l.price === 0 || l.price === '0' || l.price === '' || l.price === null || l.price === undefined) {
      priceText = t('free');
    } else {
      priceText = `${(l.price||0).toLocaleString()} с.`;
    }
    
    const catDisplayName = t(categoryTransKeys[l.category]) || l.category || '';
    const dateFormatted = formatDate(l.date);
    
    const rawWhatsapp = l.whatsapp || '';
    const cleanWhatsapp = rawWhatsapp.replace(/\D/g, '');
    const hasWhatsapp = cleanWhatsapp.length >= 9;
    
    const likesCount = l.likes || 0;
    const viewsCount = l.views || 0;
    const likedByUser = localStorage.getItem('liked_listing_' + id) === 'true';
    
    const whatsappButtonHtml = hasWhatsapp 
      ? `<a href="https://wa.me/${cleanWhatsapp}?text=Здравствуйте! Мне понравилось ваше объявление в Geran Express" target="_blank" class="btn-whatsapp" style="text-decoration:none;">
          <span class="material-symbols-rounded" style="font-size:20px;">chat</span> ${t('whatsapp_btn')}
        </a>`
      : `<button class="btn-whatsapp" disabled>
          <span class="material-symbols-rounded" style="font-size:20px;">chat</span> ${t('whatsapp_btn')}
        </button>`;
    
    document.getElementById('detail-content').innerHTML = `
      <div class="product-slider" id="product-slider" data-images='${JSON.stringify(images)}'>
        <div class="product-slider-viewport" id="product-slider-viewport" onclick="window._openGallery(${JSON.stringify(images)}, 0)">
          <div class="product-slider-track" id="product-slider-track">
          </div>
        </div>
        <button class="product-slider-arrow product-slider-arrow--left" id="product-slider-prev" aria-label="Назад">
          <span class="material-symbols-rounded">chevron_left</span>
        </button>
        <button class="product-slider-arrow product-slider-arrow--right" id="product-slider-next" aria-label="Вперёд">
          <span class="material-symbols-rounded">chevron_right</span>
        </button>
        <div class="product-slider-dots" id="product-slider-dots"></div>
      </div>
      
      <div class="product-info">
        <h2>${l.title}</h2>
        <h3 class="product-price">${priceText}</h3>
        <p class="product-desc">${l.desc}</p>
        <p class="product-meta">📍 ${l.village || 'Деҳаи Геран'} · ${catDisplayName} · ${l.condition==='new' ? t('cond_new') : t('cond_used')}</p>
        <p class="product-date">📅 Дата публикации: ${dateFormatted}</p>
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px; font-size: 0.85rem; color: var(--text-secondary);">
          <span style="display: flex; align-items: center; gap: 4px; cursor: pointer;" id="like-btn" data-id="${l.id}">
            <span class="material-symbols-rounded" style="font-size: 18px; color: ${likedByUser ? 'var(--accent-heart)' : 'inherit'};">favorite</span> <span id="likes-count-display">${likesCount}</span>
          </span>
          <span style="display: flex; align-items: center; gap: 4px;">
            <span class="material-symbols-rounded" style="font-size: 18px;">visibility</span> ${viewsCount}
          </span>
        </div>
        <div class="detail-actions">
          <a href="tel:${l.phone.replace(/\s+/g,'')}" class="btn" style="text-decoration:none;">
            <span class="material-symbols-rounded">call</span>${t('call')}
          </a>
          ${whatsappButtonHtml}
        </div>
      </div>`;
      
    showScreen('detail');
    
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    });
    
    initProductSlider();
    const detailContent = document.getElementById('detail-content');
    if (detailContent) {
      detailContent.removeEventListener('click', detailLikeHandler);
      detailContent.addEventListener('click', detailLikeHandler);
    }
  }

  function detailLikeHandler(e) {
    const likeBtn = e.target.closest('#like-btn');
    if (!likeBtn) return;
    e.preventDefault();
    e.stopPropagation();
    
    const listingId = likeBtn.dataset.id;
    if (!listingId || !db || !firebaseReady) return;
    
    const likedKey = 'liked_listing_' + listingId;
    const currentlyLiked = localStorage.getItem(likedKey) === 'true';
    
    (async function() {
      try {
        const listingRef = doc(db, 'listings', listingId);
        if (currentlyLiked) {
          await updateDoc(listingRef, {
            likes: increment(-1)
          });
          localStorage.setItem(likedKey, 'false');
          const listing = state.listings.find(x => x.id === listingId);
          if (listing) {
            listing.likes = Math.max(0, (listing.likes || 0) - 1);
            document.getElementById('likes-count-display').textContent = listing.likes;
          }
          likeBtn.querySelector('.material-symbols-rounded').style.color = 'inherit';
        } else {
          await updateDoc(listingRef, {
            likes: increment(1)
          });
          localStorage.setItem(likedKey, 'true');
          const listing = state.listings.find(x => x.id === listingId);
          if (listing) {
            listing.likes = (listing.likes || 0) + 1;
            document.getElementById('likes-count-display').textContent = listing.likes;
          }
          likeBtn.querySelector('.material-symbols-rounded').style.color = 'var(--accent-heart)';
        }
      } catch (innerErr) {
        console.warn('Like toggle error:', innerErr);
      }
    })();
  }

  function debounce(fn, delay) {
    let timer = null;
    return (...args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  function renderSearch() {
    const q = state.searchQuery.toLowerCase();
    const results = state.listings.filter(l => l.titleLower.includes(q));
    document.getElementById('search-results').innerHTML = results.length ? results.map(cardHTML).join('') : `<p>${t('no_search')}</p>`;
  }

  const debouncedRenderSearch = debounce(renderSearch, 120);

  window._editListing = (id) => {
    const l = state.listings.find(x => x.id === id);
    if (!l) return;
    state.editId = id;
    document.getElementById('create-title').value = l.title;
    document.getElementById('create-desc').value = l.desc;
    document.getElementById('create-category').value = l.category;
    document.getElementById('create-price').value = l.price;
    document.getElementById('create-phone').value = l.phone;
    document.getElementById('create-whatsapp').value = l.whatsapp || '';
    document.getElementById('create-village').value = l.village || 'Деҳаи Геран';
    state.selectedCondition = l.condition || 'new';
    document.querySelectorAll('#condition-selector .condition-option').forEach(el => el.classList.toggle('active', el.dataset.condition === state.selectedCondition));
    selectedImages = [...(l.images || [])];
    renderSelectedPhotos();
    updatePhotoCounter();
    updateUploadButtonState();
    showScreen('create');
  };

  window._deleteListing = async (id) => {
    if (confirm(t('delete_confirm'))) {
      if (db && firebaseReady) {
        try { 
          const listingRef = doc(db, 'listings', id);
          await deleteDoc(listingRef); 
        }
        catch (e) { console.error('Ошибка удаления из Firestore:', e); }
      }
      state.listings = state.listings.filter(l => l.id !== id);
      cachedListings = null;
      save();
      renderMy();
    }
  };

  const screens = {
    home: document.getElementById('screen-home'), favorites: document.getElementById('screen-favorites'),
    my: document.getElementById('screen-my'), profile: document.getElementById('screen-profile'),
    create: document.getElementById('screen-create'), detail: document.getElementById('screen-detail'),
    search: document.getElementById('screen-search'), login: document.getElementById('screen-login'),
    notifications: document.getElementById('screen-notifications')
  };
  const bottomNav = document.getElementById('bottom-nav');
  const mainHeader = document.getElementById('main-header');

  function showScreen(id) {
    if (id === 'profile' && !state.user) id = 'login';
    Object.values(screens).forEach(s => {
      if (s) s.classList.remove('active');
    });
    if (screens[id]) screens[id].classList.add('active');
    state.currentScreen = id;
    mainHeader.style.display = (id === 'login') ? 'none' : 'flex';
    bottomNav.classList.toggle('hidden', id === 'login');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-tab="${id}"]`);
    if (navItem) navItem.classList.add('active');
    if (id !== 'home' || !shouldRestoreScroll) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    if (id === 'home' && shouldRestoreScroll) {
      window.scrollTo({ top: savedScrollPosition, behavior: 'instant' });
      shouldRestoreScroll = false;
    }
    renderScreen(id);
  }

  function renderScreen(id) {
    switch (id) {
      case 'home': renderHome(); break;
      case 'favorites': renderFavorites(); break;
      case 'my': renderMy(); break;
      case 'profile': renderProfile(); break;
      case 'search': renderSearch(); break;
      case 'create': renderCreateForm(); break;
      case 'notifications': 
        break;
    }
  }

  document.getElementById('filter-btn-location')?.addEventListener('click', openLocationModal);
  document.getElementById('filter-btn-sort')?.addEventListener('click', openSortModal);
  document.getElementById('filter-btn-category')?.addEventListener('click', openCategoryModal);

  document.getElementById('condition-selector')?.addEventListener('click', (e) => {
    const option = e.target.closest('.condition-option');
    if (!option) return;
    document.querySelectorAll('#condition-selector .condition-option').forEach(el => el.classList.remove('active'));
    option.classList.add('active');
    state.selectedCondition = option.dataset.condition;
  });

  document.getElementById('create-free')?.addEventListener('change', function() {
    const priceInput = document.getElementById('create-price');
    if (this.checked) { priceInput.value = 0; priceInput.disabled = true; }
    else { priceInput.disabled = false; priceInput.value = ''; }
  });

  document.getElementById('photo-upload-btn')?.addEventListener('click', () => {
    const input = document.getElementById('create-photo-input');
    
    if (selectedImages.length >= MAX_PHOTOS) {
      showPhotoLimitMessage();
      return;
    }
    
    input.click();
  });
  
  document.getElementById('create-photo-input')?.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    const remainingSlots = MAX_PHOTOS - selectedImages.length;
    
    if (remainingSlots <= 0) {
      showPhotoLimitMessage();
      e.target.value = '';
      return;
    }
    
    const filesToAdd = files.slice(0, remainingSlots);
    
    if (files.length > remainingSlots) {
      showPhotoLimitMessage();
    }
    
    let loaded = 0;
    const totalToLoad = filesToAdd.length;
    
    filesToAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        selectedImages.push(ev.target.result);
        loaded++;
        if (loaded === totalToLoad) {
          renderSelectedPhotos();
          updatePhotoCounter();
          updateUploadButtonState();
        }
      };
      reader.readAsDataURL(file);
    });
    
    e.target.value = '';
  });

  document.getElementById('lang-switch-btn')?.addEventListener('click', () => {
    currentLang = currentLang === 'tg' ? 'ru' : 'tg';
    localStorage.setItem('geran_lang', currentLang);
    applyLanguage();
  });
  document.getElementById('edit-lang')?.addEventListener('change', (e) => {
    currentLang = e.target.value;
    localStorage.setItem('geran_lang', currentLang);
    applyLanguage();
  });
  document.getElementById('avatar-edit-btn')?.addEventListener('click', () => document.getElementById('avatar-file-input').click());
  document.getElementById('avatar-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { if (state.user) { state.user.avatar = ev.target.result; save(); document.getElementById('profile-avatar-img').src = ev.target.result; } };
    reader.readAsDataURL(file);
  });
  document.getElementById('save-profile-btn')?.addEventListener('click', () => {
    if (!state.user) return;
    state.user.name = document.getElementById('edit-name').value.trim() || state.user.name;
    state.user.phone = document.getElementById('edit-phone').value.trim() || state.user.phone;
    state.user.village = document.getElementById('edit-village').value;
    save();
    
    const savedManualVillage = localStorage.getItem('geran_selected_village');
    if (!savedManualVillage || savedManualVillage === '' || savedManualVillage === 'ALL') {
      if (savedManualVillage !== 'ALL') {
        state.selectedVillage = state.user.village;
        localStorage.setItem('geran_selected_village', state.user.village);
      }
    }
    
    renderProfile();
    alert(t('profile_updated'));
  });

  document.getElementById('search-trigger').addEventListener('click', () => showScreen('search'));
  document.getElementById('back-search').addEventListener('click', () => showScreen('home'));
  document.getElementById('back-detail').addEventListener('click', () => { shouldRestoreScroll = true; showScreen('home'); });
  
  document.getElementById('notif-btn').addEventListener('click', () => showScreen('notifications'));
  
  document.getElementById('profile-btn').addEventListener('click', () => showScreen('profile'));
  document.getElementById('logout-btn').addEventListener('click', () => { localStorage.removeItem('geran_user'); state.user = null; showScreen('login'); });
  document.getElementById('login-btn').addEventListener('click', () => {
    const phone = document.getElementById('login-phone').value.trim();
    if (phone) {
      state.user = { uid: 'user_'+Date.now(), phone, name: '', avatar: null, village: 'Деҳаи Геран' };
      localStorage.setItem('geran_user', JSON.stringify(state.user));
      
      initLocationFromStorage();
      showScreen('home');
    }
  });

  const themeCheckbox = document.getElementById('theme-checkbox');
  themeCheckbox?.addEventListener('change', e => { document.body.classList.toggle('dark', e.target.checked); localStorage.setItem('geran_dark', e.target.checked); });
  document.getElementById('search-input').addEventListener('input', e => { state.searchQuery = e.target.value; debouncedRenderSearch(); });
  document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', (e) => { const tab = item.dataset.tab; if (tab) showScreen(tab); }));

  if (localStorage.getItem('geran_dark') === 'true') { document.body.classList.add('dark'); themeCheckbox.checked = true; }

  function validateLoginPhone() {
    const phoneInput = document.getElementById('login-phone');
    const loginBtn = document.getElementById('login-btn');
    if (!phoneInput || !loginBtn) return;
    const digitsCount = phoneInput.value.length;
    if (digitsCount < 9 || digitsCount > 10) {
      loginBtn.disabled = true;
      loginBtn.style.opacity = '0.5';
      loginBtn.style.pointerEvents = 'none';
    } else {
      loginBtn.disabled = false;
      loginBtn.style.opacity = '1';
      loginBtn.style.pointerEvents = 'auto';
    }
  }

  document.getElementById('login-phone').addEventListener('input', function (e) {
    this.value = this.value.replace(/\D/g, '');
    if (this.value.length > 10) this.value = this.value.slice(0, 10);
    validateLoginPhone();
  });

  validateLoginPhone();

  function initLocationFromStorage() {
    const savedVillage = localStorage.getItem('geran_selected_village');
    
    if (savedVillage === 'ALL') {
      state.selectedVillage = null;
    } else if (savedVillage && savedVillage !== '') {
      state.selectedVillage = savedVillage;
    } else if (state.user && state.user.village) {
      state.selectedVillage = state.user.village;
      localStorage.setItem('geran_selected_village', state.user.village);
    } else {
      state.selectedVillage = null;
    }
  }

  function initBannerCarousel() {
    var track = document.getElementById('g-express-track');
    var dotsContainer = document.getElementById('g-express-dots');
    var slides = document.querySelectorAll('.g-express-slide');

    if (!track || !dotsContainer || slides.length === 0) {
      return;
    }

    if (track.dataset.bannerInitialized === 'true') {
      return;
    }
    track.dataset.bannerInitialized = 'true';

    var SLIDE_COUNT = slides.length;
    var INTERVAL_TIME = 8000;
    var currentSlide = 0;
    var autoPlayTimer = null;
    var touchStartX = 0;
    var touchEndX = 0;
    var mouseStartX = 0;
    var mouseEndX = 0;
    var isDragging = false;

    function createDots() {
      dotsContainer.innerHTML = '';
      for (var i = 0; i < SLIDE_COUNT; i++) {
        var dot = document.createElement('span');
        dot.className = 'g-express-dot';
        if (i === 0) {
          dot.classList.add('g-express-active');
        }
        (function (index) {
          dot.addEventListener('click', function (e) {
            e.stopPropagation();
            goToSlide(index);
          });
        })(i);
        dotsContainer.appendChild(dot);
      }
    }

    function updateDots(index) {
      var dots = dotsContainer.querySelectorAll('.g-express-dot');
      for (var i = 0; i < dots.length; i++) {
        if (i === index) {
          dots[i].classList.add('g-express-active');
        } else {
          dots[i].classList.remove('g-express-active');
        }
      }
    }

    function goToSlide(index) {
      if (index >= SLIDE_COUNT) {
        index = 0;
      } else if (index < 0) {
        index = SLIDE_COUNT - 1;
      }
      currentSlide = index;
      var offset = -(currentSlide * 100);
      track.style.transform = 'translate3d(' + offset + '%, 0, 0)';
      track.style.webkitTransform = 'translate3d(' + offset + '%, 0, 0)';
      updateDots(currentSlide);
    }

    function nextSlide() {
      goToSlide(currentSlide + 1);
    }

    function prevSlide() {
      goToSlide(currentSlide - 1);
    }

    function startAutoPlay() {
      stopAutoPlay();
      if (SLIDE_COUNT > 1) {
        autoPlayTimer = setInterval(nextSlide, INTERVAL_TIME);
      }
    }

    function stopAutoPlay() {
      if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
      }
    }

    createDots();
    goToSlide(0);
    startAutoPlay();

    var sliderContainer = track.parentElement;

    sliderContainer.addEventListener('touchstart', function (e) {
      touchStartX = e.touches[0].clientX;
      stopAutoPlay();
    }, { passive: true });

    sliderContainer.addEventListener('touchmove', function (e) {
      touchEndX = e.touches[0].clientX;
    }, { passive: true });

    sliderContainer.addEventListener('touchend', function () {
      var diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      }
      startAutoPlay();
    });

    sliderContainer.addEventListener('mousedown', function (e) {
      mouseStartX = e.clientX;
      isDragging = true;
      stopAutoPlay();
      sliderContainer.style.cursor = 'grabbing';
    });

    sliderContainer.addEventListener('mousemove', function (e) {
      if (!isDragging) return;
      mouseEndX = e.clientX;
    });

    sliderContainer.addEventListener('mouseup', function () {
      if (!isDragging) return;
      isDragging = false;
      sliderContainer.style.cursor = '';
      var diff = mouseStartX - mouseEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      }
      startAutoPlay();
    });

    sliderContainer.addEventListener('mouseleave', function () {
      if (isDragging) {
        isDragging = false;
        sliderContainer.style.cursor = '';
        startAutoPlay();
      }
    });
  }

  applyLanguage();
  
  initLocationFromStorage();
  
  if (state.user) {
    showScreen('home');
  } else {
    showScreen('login');
  }

  // Сохранение позиции скролла
  (function() {
    const SCROLL_KEY = 'geran_scroll_pos';
    const SCROLL_TIME_KEY = 'geran_scroll_time';
    const MAX_AGE_MS = 30 * 60 * 1000;
    
    function saveScrollPosition() {
      sessionStorage.setItem(SCROLL_KEY, window.scrollY || window.pageYOffset);
      sessionStorage.setItem(SCROLL_TIME_KEY, Date.now());
    }
    
    function restoreScrollPosition() {
      const savedY = parseFloat(sessionStorage.getItem(SCROLL_KEY));
      const savedTime = parseInt(sessionStorage.getItem(SCROLL_TIME_KEY), 10);
      
      if (isNaN(savedY) || isNaN(savedTime)) return;
      if (Date.now() - savedTime > MAX_AGE_MS) {
        sessionStorage.removeItem(SCROLL_KEY);
        sessionStorage.removeItem(SCROLL_TIME_KEY);
        return;
      }
      
      window.scrollTo({ top: savedY, behavior: 'instant' });
      sessionStorage.removeItem(SCROLL_KEY);
      sessionStorage.removeItem(SCROLL_TIME_KEY);
    }
    
    document.addEventListener('click', function(e) {
      var card = e.target.closest('.card');
      if (card) {
        if (!e.target.closest('.card-heart') && !e.target.closest('.card-img')) {
          saveScrollPosition();
        }
      }
    }, true);
    
    var originalOpenDetail = window._openDetail;
    if (typeof originalOpenDetail === 'function') {
      window._openDetail = function(id) {
        saveScrollPosition();
        return originalOpenDetail.apply(this, arguments);
      };
    }
    
    window.addEventListener('beforeunload', saveScrollPosition);
    
    window.addEventListener('pageshow', function(event) {
      if (event.persisted) {
        restoreScrollPosition();
      }
    });
  })();

  function initProductSlider() {
    var slider = document.getElementById('product-slider');
    if (!slider) return;
    
    if (slider.dataset.initialized === 'true') return;
    slider.dataset.initialized = 'true';
    
    var track = document.getElementById('product-slider-track');
    var dotsContainer = document.getElementById('product-slider-dots');
    var prevBtn = document.getElementById('product-slider-prev');
    var nextBtn = document.getElementById('product-slider-next');
    var viewport = document.getElementById('product-slider-viewport');
    
    var images = [];
    try {
      images = JSON.parse(slider.getAttribute('data-images') || '[]');
    } catch (e) {
      images = [PLACEHOLDER_IMG];
    }
    
    if (!images.length) images = [PLACEHOLDER_IMG];
    
    var slideCount = images.length;
    var currentIndex = 0;
    
    slider.setAttribute('data-slides', slideCount);
    
    track.innerHTML = '';
    images.forEach(function(src, idx) {
      var slide = document.createElement('div');
      slide.className = 'product-slider-slide';
      var img = document.createElement('img');
      img.src = src;
      img.alt = 'Фото товара';
      img.draggable = false;
      slide.addEventListener('click', function(e) {
        if (window._openGallery) {
          window._openGallery(images, idx);
        }
      });
      slide.appendChild(img);
      track.appendChild(slide);
    });
    
    dotsContainer.innerHTML = '';
    if (slideCount > 1) {
      for (var i = 0; i < slideCount; i++) {
        var dot = document.createElement('span');
        dot.className = 'product-slider-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('data-index', i);
        dot.addEventListener('click', function() {
          goToSlide(parseInt(this.getAttribute('data-index'), 10));
        });
        dotsContainer.appendChild(dot);
      }
    }
    
    function updateUI() {
      track.style.transform = 'translateX(-' + (currentIndex * 100) + '%)';
      
      var dots = dotsContainer.querySelectorAll('.product-slider-dot');
      dots.forEach(function(dot, idx) {
        dot.classList.toggle('active', idx === currentIndex);
      });
      
      if (prevBtn) prevBtn.style.opacity = currentIndex === 0 ? '0.4' : '1';
      if (nextBtn) nextBtn.style.opacity = currentIndex === slideCount - 1 ? '0.4' : '1';
    }
    
    function goToSlide(index) {
      if (index < 0) index = 0;
      if (index >= slideCount) index = slideCount - 1;
      currentIndex = index;
      updateUI();
    }
    
    if (prevBtn) {
      prevBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        goToSlide(currentIndex - 1);
      });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        goToSlide(currentIndex + 1);
      });
    }
    
    var touchStartX = 0;
    var touchEndX = 0;
    var isSwiping = false;
    var SWIPE_THRESHOLD = 50;
    
    viewport.addEventListener('touchstart', function(e) {
      if (e.touches.length > 1) return;
      touchStartX = e.touches[0].clientX;
      isSwiping = true;
    }, { passive: true });
    
    viewport.addEventListener('touchmove', function(e) {
      if (!isSwiping || e.touches.length > 1) return;
      touchEndX = e.touches[0].clientX;
    }, { passive: true });
    
    viewport.addEventListener('touchend', function() {
      if (!isSwiping) return;
      isSwiping = false;
      
      var diff = touchStartX - touchEndX;
      
      if (Math.abs(diff) > SWIPE_THRESHOLD) {
        if (diff > 0) {
          goToSlide(currentIndex + 1);
        } else {
          goToSlide(currentIndex - 1);
        }
      }
    });
    
    var mouseDown = false;
    var mouseStartX = 0;
    var mouseEndX = 0;
    
    viewport.addEventListener('mousedown', function(e) {
      mouseDown = true;
      mouseStartX = e.clientX;
      viewport.style.cursor = 'grabbing';
    });
    
    viewport.addEventListener('mousemove', function(e) {
      if (!mouseDown) return;
      mouseEndX = e.clientX;
    });
    
    viewport.addEventListener('mouseup', function() {
      if (!mouseDown) return;
      mouseDown = false;
      viewport.style.cursor = '';
      
      var diff = mouseStartX - mouseEndX;
      if (Math.abs(diff) > SWIPE_THRESHOLD) {
        if (diff > 0) {
          goToSlide(currentIndex + 1);
        } else {
          goToSlide(currentIndex - 1);
        }
      }
    });
    
    viewport.addEventListener('mouseleave', function() {
      if (mouseDown) {
        mouseDown = false;
        viewport.style.cursor = '';
      }
    });
    
    slider.addEventListener('gesturestart', function(e) {
      e.preventDefault();
    });
    
    slider.addEventListener('gesturechange', function(e) {
      e.preventDefault();
    });
    
    slider.addEventListener('gestureend', function(e) {
      e.preventDefault();
    });
    
    updateUI();
  }
});
