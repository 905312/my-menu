const tg = window.Telegram.WebApp;
const menuContainer = document.getElementById('menu-container');
const categoriesContainer = document.getElementById('categories-container');
const cartFloat = document.getElementById('cart-float');
const cartQty = document.getElementById('cart-qty');
const cartSum = document.getElementById('cart-sum');
const searchInput = document.getElementById('searchInput');

tg.expand();
tg.ready();

let cart = {};
let currentCategory = "🍕 Пицца";
let searchTerm = "";
let stopList = [];

// Считываем стоп-лист и ОБЛАЧНУЮ историю из параметров URL
function checkStopList() {
    const urlParams = new URLSearchParams(window.location.search);
    const stop = urlParams.get('stop');
    if (stop) {
        stopList = stop.split(',');
        console.log("📍 Загружен стоп-лист:", stopList);
    }

    // ЛОГИКА ОБЛАЧНОЙ ИСТОРИИ (Синхронизация между устройствами)
    const cloudHistoryRaw = urlParams.get('h');
    if (cloudHistoryRaw) {
        try {
            const cloudHistory = JSON.parse(decodeURIComponent(cloudHistoryRaw));
            if (Array.isArray(cloudHistory)) {
                console.log("☁️ Получена история из облака:", cloudHistory);
                mergeHistory(cloudHistory);
            }
        } catch (e) {
            console.error("❌ Ошибка парсинга облачной истории:", e);
        }
    }
}

function mergeHistory(cloudHistory) {
    if (!Array.isArray(cloudHistory)) return;
    try {
        let localHistory = [];
        try {
            localHistory = JSON.parse(localStorage.getItem('order_history') || '[]');
            if (!Array.isArray(localHistory)) localHistory = [];
        } catch (e) { localHistory = []; }

        const formattedCloud = cloudHistory.map(ch => ({
            id: String(ch.id || 'N/A'),
            totalSum: parseInt(ch.sum || 0),
            status: String(ch.status || 'pending').toLowerCase() === 'paid' ? 'accepted' : String(ch.status || 'pending'),
            date: String(ch.date || ''),
            itemsDetails: null,
            isCloud: true
        }));

        const localIds = new Set(localHistory.map(o => o.id));
        formattedCloud.forEach(order => {
            if (!localIds.has(order.id)) {
                localHistory.unshift(order);
            }
        });

        localHistory.sort((a, b) => String(b.id).localeCompare(String(a.id)));
        localStorage.setItem('order_history', JSON.stringify(localHistory.slice(0, 20)));
    } catch (e) { console.error("Merge error:", e); }
}
let deliveryMode = 'delivery';
let currentDeliveryFee = 99;
const FIXED_DELIVERY_FEE = 99;
const FREE_DELIVERY_THRESHOLD = 1500;
const MIN_ORDER_SUM = 700;

// ТЕПЕРЬ С ВАРИАНТАМИ РАЗМЕРОВ
const FOOD_DATA = {
    "🍕 Пицца": [
        {
            id: "p1", name: "Пепперони", desc: "Пикантная колбаса, моцарелла, томатный соус",
            variants: [{ s: 20, p: 399 }, { s: 30, p: 519 }, { s: 40, p: 699 }]
        },
        {
            id: "p2", name: "Карбонара", desc: "Бекон, сливочный соус, яйцо",
            variants: [{ s: 20, p: 449 }, { s: 30, p: 569 }, { s: 40, p: 749 }]
        },
        {
            id: "p3", name: "4 Сыра", desc: "Пармезан, чеддер, блю чиз",
            variants: [{ s: 20, p: 399 }, { s: 30, p: 519 }, { s: 40, p: 699 }]
        },
        {
            id: "p12", name: "Груша горгондзола", desc: "Сладкая груша, сыр горгондзола",
            variants: [{ s: 20, p: 449 }, { s: 30, p: 569 }, { s: 40, p: 749 }]
        },
        {
            id: "p20", name: "Том ям", desc: "Креветки, кальмары, соус том-ям",
            variants: [{ s: 20, p: 559 }, { s: 30, p: 679 }, { s: 40, p: 859 }]
        },
        {
            id: "p31", name: "Цезарь", desc: "Курица, салат айсберг, соус цезарь",
            variants: [{ s: 20, p: 569 }, { s: 30, p: 689 }, { s: 40, p: 869 }]
        }
    ],
    "🍔 Бургеры": [
        { id: "b1", name: "Тройной чизбургер", price: 249, desc: "3 котлеты, 3 сыра" },
        { id: "b2", name: "Биг Спешиал", price: 460, desc: "Огромная говяжья котлета" },
        { id: "b5", name: "Биг Хит", price: 303, desc: "Легендарный соус" },
        { id: "b8", name: "Гранд", price: 327, desc: "Классика вкуса" },
        { id: "b14", name: "Цезарь ролл", price: 230, desc: "Курица в лепешке" }
    ],
    "🥤 Напитки": [
        { id: "d1", name: "Кола", price: 111, desc: "0.5 л" },
        { id: "d3", name: "Капучино", price: 159, desc: "Ароматный кофе" },
        { id: "d6", name: "Сок", price: 128, desc: "Апельсиновый 0.5 л" },
        { id: "d20", name: "Вода", price: 111, desc: "0.5 л" }
    ]
};

const ALL_ITEMS = Object.entries(FOOD_DATA).flatMap(([cat, items]) => items);

const themeToggleBtn = document.querySelector('.theme-toggle');

function initTheme() {
    // 1. Сначала проверяем, есть ли сохраненная настройка
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        // 2. Если нет, берем тему из Telegram
        if (tg.colorScheme === 'light') {
            setTheme('light');
        } else {
            setTheme('dark');
        }
    }
}

function setTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        themeToggleBtn.innerHTML = '☀️'; // Иконка солнца для светлой темы
    } else {
        document.body.classList.remove('light-theme');
        themeToggleBtn.innerHTML = '🌙'; // Иконка луны для темной темы
    }
    localStorage.setItem('theme', theme);

    // Сообщаем Телеграму, что цвет хедера изменился
    if (tg.setHeaderColor) {
        tg.setHeaderColor(theme === 'light' ? '#ffffff' : '#000000');
    }
    if (tg.setBackgroundColor) {
        tg.setBackgroundColor(theme === 'light' ? '#f5f5f7' : '#000000');
    }
}

function toggleTheme() {
    hapticImpact('light');
    if (document.body.classList.contains('light-theme')) {
        setTheme('dark');
    } else {
        setTheme('light');
    }
}

function init() {
    console.log("RESTO PREMIUM Loaded");
    initTheme();
    checkStopList(); // Берем данные из URL (как первичные)

    // СРАЗУ запрашиваем свежий список с GitHub
    fetchStopListFromGitHub();

    renderCategories();
    renderMenu();
}

// ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ СТОП-ЛИСТА С GITHUB
async function fetchStopListFromGitHub() {
    console.log("🔄 Синхронизация стоп-листа с WhatsApp/GitHub...");
    try {
        // Добавляем timestamp для обхода кэша гитхаба
        const timestamp = new Date().getTime();
        const response = await fetch(`stoplist.json?v=${timestamp}`);

        if (response.ok) {
            const githubStopList = await response.json();
            if (Array.isArray(githubStopList)) {
                console.log("✅ Стоп-лист синхронизирован с GitHub:", githubStopList);
                stopList = githubStopList;
                renderMenu();
            }
        }
    } catch (e) {
        console.log("ℹ️ Файл stoplist.json еще не создан или недоступен:", e);
    }
}

function hapticImpact(style = 'light') {
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred(style);
}

function hapticSelection() {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function hapticNotification(type = 'success') {
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred(type);
}

function renderCategories() {
    categoriesContainer.innerHTML = '';
    Object.keys(FOOD_DATA).forEach(cat => {
        const span = document.createElement('span');
        span.className = `cat-item ${cat === currentCategory ? 'active' : ''}`;
        span.innerText = cat;
        span.onclick = () => {
            hapticSelection();
            currentCategory = cat; searchTerm = "";
            if (searchInput) searchInput.value = "";
            renderCategories(); renderMenu();
        };
        categoriesContainer.appendChild(span);
    });
}

let selectedSizes = {};

function renderMenu() {
    menuContainer.innerHTML = '';
    let items = searchTerm ? ALL_ITEMS.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())) : FOOD_DATA[currentCategory];

    items.forEach(item => {
        const card = document.createElement('div');
        const isUnavailable = stopList.includes(item.id);
        card.className = isUnavailable ? 'card unavailable' : 'card';

        let sizePickerHTML = '';
        let currentPrice = item.price;
        let cartKey = item.id;

        if (item.variants) {
            const currentSizeIndex = selectedSizes[item.id] !== undefined ? selectedSizes[item.id] : 1;
            const variant = item.variants[currentSizeIndex];
            currentPrice = variant.p;
            cartKey = `${item.id}_${variant.s}`;

            sizePickerHTML = `<div class="size-picker">` +
                item.variants.map((v, idx) => `
                    <div class="size-btn ${idx === currentSizeIndex ? 'active' : ''}" 
                         onclick="${isUnavailable ? '' : `changeSize('${item.id}', ${idx})`}">${v.s}см</div>
                `).join('') + `</div>`;
        }

        const unavailableBadge = isUnavailable ? '<div class="unavailable-badge">🚫 НЕТ В НАЛИЧИИ</div>' : '';

        card.innerHTML = `
            <div class="card-img" style="background-image: url('img/${encodeURIComponent(item.name)}.jpg')">
                ${unavailableBadge}
            </div>
            <h3>${item.name}</h3><p>${item.desc}</p>
            ${sizePickerHTML}
            <div class="card-footer" id="footer-${cartKey}">${getFooterHTML(item, cartKey, currentPrice, isUnavailable)}</div>
        `;
        menuContainer.appendChild(card);
    });
}

function changeSize(id, idx) {
    hapticImpact('light');
    selectedSizes[id] = idx;
    renderMenu();
}

function getFooterHTML(item, cartKey, price, isUnavailable = false) {
    if (isUnavailable) {
        return `
            <div class="price" style="opacity: 0.5;">${price} ₽</div>
            <div class="qty-btn unavailable-btn">НЕТ В НАЛИЧИИ</div>
        `;
    }

    const qty = cart[cartKey] || 0;
    return `
        <div class="price">${price} ₽</div>
        ${qty === 0
            ? `<div class="qty-btn" onclick="addToCart('${cartKey}')">В КОРЗИНУ</div>`
            : `<div class="stepper">
                <div class="step-btn" onclick="updateQty('${cartKey}', -1)">−</div>
                <div style="font-weight:700; min-width: 20px; text-align: center;">${qty}</div>
                <div class="step-btn" onclick="updateQty('${cartKey}', 1)">+</div>
               </div>`
        }
    `;
}

function addToCart(key) {
    hapticImpact('medium');
    updateQty(key, 1);
}

function updateQty(key, delta) {
    if (delta !== 0) hapticImpact('light');
    const newQty = Math.max(0, (cart[key] || 0) + delta);
    if (newQty === 0) delete cart[key]; else cart[key] = newQty;

    renderMenu();
    if (document.getElementById('cart-view').classList.contains('active')) renderCart();
    updateCartUI();
}

function updateCartUI() {
    let q = 0, s = 0;
    for (let key in cart) {
        const [id, size] = key.split('_');
        const item = ALL_ITEMS.find(x => x.id === id);
        const price = size ? item.variants.find(v => v.s == size).p : item.price;
        q += cart[key];
        s += price * cart[key];
    }
    cartQty.innerText = q; cartSum.innerText = s + ' ₽';

    // PROGRESS BAR LOGIC (Delivery Club style)
    const progressBar = document.getElementById('cart-progress');
    const statusLabel = document.getElementById('delivery-status-label');

    if (q > 0) {
        cartFloat.classList.add('active');

        let percent = (s / FREE_DELIVERY_THRESHOLD) * 100;
        if (percent > 100) percent = 100;

        progressBar.style.width = percent + '%';

        if (s >= FREE_DELIVERY_THRESHOLD) {
            statusLabel.innerHTML = "🎉 Бесплатная доставка!";
            statusLabel.style.color = "#4cd964";
        } else {
            const diff = FREE_DELIVERY_THRESHOLD - s;
            statusLabel.innerHTML = `Доставка 99 ₽ (еще ${diff} ₽ до бесплатной)`;
            statusLabel.style.color = "inherit";
        }
    } else {
        progressBar.style.width = '0%';
        cartFloat.classList.remove('active');
        hideCartView();
    }
}

function showCartView() {
    hapticImpact('medium');
    document.getElementById('cart-view').classList.add('active');
    renderCart();
}
function hideCartView() { document.getElementById('cart-view').classList.remove('active'); }

function renderCart() {
    const list = document.getElementById('cart-items-list');
    list.innerHTML = '';
    let totalS = 0;
    for (let key in cart) {
        const [id, size] = key.split('_');
        const item = ALL_ITEMS.find(x => x.id === id);
        if (!item) continue;
        const price = size ? item.variants.find(v => v.s == size).p : item.price;
        totalS += price * cart[key];

        const row = document.createElement('div');
        row.className = 'cart-item-row';
        row.innerHTML = `
            <div class="cart-item-img" style="background-image: url('img/${encodeURIComponent(item.name)}.jpg')"></div>
            <div class="cart-item-info">
                <h4>${item.name}${size ? ' (' + size + 'см)' : ''}</h4>
                <p>${price} ₽</p>
            </div>
            <div class="stepper">
                <div class="step-btn" onclick="updateQty('${key}', -1)">−</div>
                <div style="font-weight:700; min-width: 20px; text-align: center;">${cart[key]}</div>
                <div class="step-btn" onclick="updateQty('${key}', 1)">+</div>
            </div>`;
        list.appendChild(row);
    }
    document.getElementById('cart-total-final').innerText = totalS + ' ₽';
}

function setMode(mode) {
    hapticImpact('medium');
    deliveryMode = mode;
    document.getElementById('btn-delivery').classList.toggle('active', mode === 'delivery');
    document.getElementById('btn-pickup').classList.toggle('active', mode === 'pickup');
    document.getElementById('delivery-fields').style.display = (mode === 'delivery') ? 'block' : 'none';
    document.getElementById('pickup-info').style.display = (mode === 'pickup') ? 'block' : 'none';
    updateFinalButton();
}

function updateFinalButton() {
    let foodSum = 0;
    for (let key in cart) {
        const [id, size] = key.split('_');
        const item = ALL_ITEMS.find(x => x.id === id);
        const price = size ? item.variants.find(v => v.s == size).p : item.price;
        foodSum += price * cart[key];
    }

    const warn = document.getElementById('min-order-warn');
    const deliveryBar = document.getElementById('delivery-info-bar');
    const fb = document.getElementById('final-btn');

    if (foodSum < MIN_ORDER_SUM) {
        warn.style.display = 'block';
        document.getElementById('min-sum-diff').innerText = MIN_ORDER_SUM - foodSum;
        fb.style.opacity = '0.5';
        fb.style.pointerEvents = 'none';
    } else {
        warn.style.display = 'none';
        fb.style.opacity = '1';
        fb.style.pointerEvents = 'auto';
    }

    if (deliveryMode === 'delivery') {
        if (foodSum >= FREE_DELIVERY_THRESHOLD) {
            currentDeliveryFee = 0;
            deliveryBar.innerHTML = "🎉 <b>Ура! У вас бесплатная доставка!</b>";
            deliveryBar.style.color = "#4cd964";
        } else {
            currentDeliveryFee = FIXED_DELIVERY_FEE;
            deliveryBar.innerHTML = `🚚 Доставка станет бесплатной от <b>${FREE_DELIVERY_THRESHOLD} ₽</b><br>(еще <b>${FREE_DELIVERY_THRESHOLD - foodSum} ₽</b>)`;
            deliveryBar.style.color = "var(--secondary-text)";
        }
    } else {
        deliveryBar.style.display = 'none';
        currentDeliveryFee = 0;
    }

    const total = foodSum + currentDeliveryFee;
    fb.innerHTML = `ЗАКАЗАТЬ: ${total} ₽ ${currentDeliveryFee === 0 && deliveryMode === 'delivery' ? '<span style="font-size:10px; opacity:0.7;">(Доставка 0₽)</span>' : ''}`;
}

function showAddressView() {
    hapticImpact('heavy');
    document.getElementById('address-view').classList.add('active');
    updateFinalButton();
}
function hideAddressView() { document.getElementById('address-view').classList.remove('active'); }

function formatPhone(input) {
    let matrix = "+7 (___) ___-__-__",
        i = 0,
        def = matrix.replace(/\D/g, ""),
        val = input.value.replace(/\D/g, "");
    if (def.length >= val.length) val = def;
    input.value = matrix.replace(/./g, function (a) {
        return /[_\d]/.test(a) && i < val.length ? val.charAt(i++) : i >= val.length ? "" : a
    });
}

function finalizeOrder() {
    const comment = document.getElementById('f-comment').value.trim();
    const phone = document.getElementById('f-phone').value.trim();

    let finalData = {
        items: [],
        comment: comment,
        phone: phone,
        mode: deliveryMode
    };

    for (let key in cart) {
        for (let i = 0; i < cart[key]; i++) finalData.items.push(key);
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 11) {
        hapticNotification('error');
        tg.showAlert("Введите полный номер телефона (11 цифр)!");
        return;
    }

    if (deliveryMode === 'delivery') {
        const city = document.getElementById('f-city').value.trim();
        const street = document.getElementById('f-street').value.trim();
        const house = document.getElementById('f-house').value.trim();
        const apt = document.getElementById('f-apt').value.trim();
        const ent = document.getElementById('f-ent').value.trim();
        const floor = document.getElementById('f-floor').value.trim();

        if (!city || !street || !house || !apt || !ent || !floor) {
            hapticNotification('error');
            tg.showAlert("Заполните все обязательные поля!"); return;
        }

        if (!city.toLowerCase().includes("санкт") && !city.toLowerCase().includes("спб")) {
            hapticNotification('error');
            tg.showAlert("Мы работаем только по Санкт-Петербургу!"); return;
        }

        finalData.address = `${city}, ул. ${street}, д. ${house}, кв. ${apt} (Под: ${ent}, Эт: ${floor})`;
        finalData.delivery_price = currentDeliveryFee;
    } else {
        finalData.address = "САМОВЫВОЗ: Невский пр. 28";
        finalData.delivery_price = 0;
    }

    // Проверяем стоп-лист перед отправкой заказа
    const unavailableItems = [];
    for (let key in cart) {
        // Извлекаем ID товара (например, из "p1_30" получаем "p1")
        const itemId = key.split('_')[0];
        if (stopList.includes(itemId)) {
            // Находим название товара
            const item = ALL_ITEMS.find(i => i.id === itemId);
            if (item) {
                const size = key.includes('_') ? key.split('_')[1] + 'см' : '';
                unavailableItems.push(`${item.name}${size ? ' ' + size : ''}`);
            }
        }
    }

    // Если есть недоступные товары - показываем уведомление
    if (unavailableItems.length > 0) {
        hapticNotification('error');
        const itemsList = unavailableItems.map(name => `🚫 ${name}`).join('\n');
        tg.showAlert(`⚠️ Некоторые позиции закончились:\n\n${itemsList}\n\nПожалуйста, удалите их из корзины и попробуйте снова.`);
        return;
    }

    hapticNotification('success');

    // Сохраняем заказ в локальную историю (Личный кабинет)
    saveOrderToLocalHistory(finalData);

    tg.sendData(JSON.stringify(finalData));
    tg.close();
}

// ФУНКЦИИ ДЛЯ ЛИЧНОГО КАБИНЕТА (LOCALSTORAGE)
function saveOrderToLocalHistory(order) {
    let history = JSON.parse(localStorage.getItem('order_history') || '[]');
    order.id = 'RP-' + Math.floor(1000 + Math.random() * 9000);
    order.date = new Date().toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    order.timestamp = Date.now(); // Для автообновления статуса
    order.status = 'pending'; // pending -> accepted -> delivered

    // Рассчитываем общую сумму заказа
    let totalSum = 0;
    order.itemsDetails = [];

    order.items.forEach(itemKey => {
        const [id, size] = itemKey.split('_');
        const item = ALL_ITEMS.find(x => x.id === id);
        if (item) {
            const price = size ? item.variants.find(v => v.s == size).p : item.price;
            const sizeText = size ? ` ${size}см` : '';
            order.itemsDetails.push({
                name: item.name + sizeText,
                price: price
            });
            totalSum += price;
        }
    });

    order.totalSum = totalSum + (order.delivery_price || 0);

    history.unshift(order); // Добавляем в начало

    // Ограничиваем историю 20 заказами
    if (history.length > 20) history = history.slice(0, 20);

    localStorage.setItem('order_history', JSON.stringify(history));
}

// Проверяем обновления каждые 5 минут
setInterval(fetchStopListFromGitHub, 5 * 60 * 1000);
// --- ЛИЧНЫЙ КАБИНЕТ (ИСТОРИЯ ЗАКАЗОВ) ---
function showHistoryView() {
    try {
        hapticImpact('medium');
        const historyView = document.getElementById('history-view');
        const list = document.getElementById('history-list');
        if (!historyView || !list) return;

        list.innerHTML = '';

        let history = [];
        try {
            history = JSON.parse(localStorage.getItem('order_history') || '[]');
            if (!Array.isArray(history)) history = [];
        } catch (e) { history = []; }

        const now = Date.now();
        let updated = false;
        history = history.map(order => {
            if (order && order.status === 'pending' && order.timestamp) {
                const elapsed = (now - order.timestamp) / 1000 / 60;
                if (elapsed >= 75) {
                    order.status = 'delivered';
                    updated = true;
                }
            }
            return order;
        }).filter(o => o !== null);

        if (updated) localStorage.setItem('order_history', JSON.stringify(history));
    } catch (e) { console.error("History view error:", e); }

    if (history.length === 0) {
        list.innerHTML = '<p style="text-align:center; padding: 40px 20px; opacity:0.5; font-size:14px;">📦 У вас еще нет заказов...</p>';
    } else {
        history.forEach((order, index) => {
            const item = document.createElement('div');
            item.className = 'history-card-v2';

            const statusMap = {
                'pending': { text: '⏳ ОЖИДАЕТ', color: '#FF9500', bg: 'rgba(255, 149, 0, 0.1)' },
                'accepted': { text: '✅ ПРИНЯТ', color: '#34C759', bg: 'rgba(52, 199, 89, 0.1)' },
                'delivered': { text: '🎉 ДОСТАВЛЕНО', color: '#007AFF', bg: 'rgba(0, 122, 255, 0.1)' },
                'cancelled': { text: '❌ ОТМЕНЁН', color: '#FF3B30', bg: 'rgba(255, 59, 48, 0.1)' }
            };

            const status = statusMap[order.status || 'pending'];
            const itemsList = order.itemsDetails ? order.itemsDetails.map(i =>
                `<div style="display:flex; justify-content:space-between; font-size:12px; margin:6px 0; border-bottom:1px dashed var(--border-color); padding-bottom:4px;">
                    <span style="opacity:0.8;">${i.name}</span>
                    <span style="font-weight:700;">${i.price} ₽</span>
                </div>`
            ).join('') : '<div style="font-size:12px; opacity:0.6; padding:10px 0;">📦 Детали заказа из старой версии</div>';

            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom: 12px;">
                    <div>
                        <div style="font-weight:900; font-size:17px;">Заказ ${order.id}</div>
                        <div style="font-size:11px; opacity:0.5; margin-top:2px;">${order.date}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:19px; font-weight:950; color:var(--accent-color);">${order.totalSum || 0} ₽</div>
                        <div class="status-badge-v2" style="color:${status.color}; background:${status.bg}; display:inline-block; margin-top:5px;">${status.text}</div>
                    </div>
                </div>
                <div style="background: rgba(255,255,255,0.03); border-radius:12px; padding:12px; margin: 10px 0;">
                    ${itemsList}
                </div>
                <button class="reorder-btn-v2" onclick="reorderFromHistory(${index})">
                    🔄 ПОВТОРИТЬ ЗАКАЗ
                </button>`;
            list.appendChild(item);
        });
    }
    historyView.classList.add('active');
}

function reorderFromHistory(index) {
    hapticImpact('medium');
    const history = JSON.parse(localStorage.getItem('order_history') || '[]');
    const order = history[index];

    if (!order || !order.items) {
        tg.showAlert('Не удалось загрузить заказ');
        return;
    }

    // Очищаем корзину и добавляем все позиции из заказа
    cart = {};
    order.items.forEach(itemKey => {
        cart[itemKey] = (cart[itemKey] || 0) + 1;
    });

    // Закрываем историю и обновляем UI
    hideHistoryView();
    renderMenu();
    updateCartUI();

    tg.showAlert('✅ Заказ добавлен в корзину!');
}

function hideHistoryView() { document.getElementById('history-view').classList.remove('active'); }


function filterMenu() { searchTerm = searchInput.value; renderMenu(); }
init();
