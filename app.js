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
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        setTheme(savedTheme);
    } else {
        setTheme(tg.colorScheme === 'light' ? 'light' : 'dark');
    }
}

function setTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        themeToggleBtn.innerHTML = '☀️';
    } else {
        document.body.classList.remove('light-theme');
        themeToggleBtn.innerHTML = '🌙';
    }
    localStorage.setItem('theme', theme);
    if (tg.setHeaderColor) tg.setHeaderColor(theme === 'light' ? '#ffffff' : '#000000');
}

function toggleTheme() {
    hapticImpact('light');
    setTheme(document.body.classList.contains('light-theme') ? 'dark' : 'light');
}

function init() {
    initTheme();
    checkStopList();
    fetchStopListFromGitHub();
    renderCategories();
    renderMenu();
}

async function fetchStopListFromGitHub() {
    try {
        const timestamp = new Date().getTime();
        const response = await fetch(`stoplist.json?v=${timestamp}`);
        if (response.ok) {
            const githubStopList = await response.json();
            if (Array.isArray(githubStopList)) {
                stopList = githubStopList;
                renderMenu();
            }
        }
    } catch (e) { console.log("Stoplist fetch failed", e); }
}

function hapticImpact(style = 'light') { if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred(style); }
function hapticSelection() { if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged(); }
function hapticNotification(type = 'success') { if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred(type); }

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
    if (isUnavailable) return `<div class="price" style="opacity: 0.5;">${price} ₽</div><div class="qty-btn unavailable-btn">НЕТ В НАЛИЧИИ</div>`;
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
        }`;
}

function addToCart(key) { hapticImpact('medium'); updateQty(key, 1); }

function updateQty(key, delta) {
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
        q += cart[key]; s += price * cart[key];
    }
    cartQty.innerText = q; cartSum.innerText = s + ' ₽';

    const progressBar = document.getElementById('cart-progress');
    const statusLabel = document.getElementById('delivery-status-label');

    if (q > 0) {
        cartFloat.classList.add('active');
        let percent = Math.min(100, (s / FREE_DELIVERY_THRESHOLD) * 100);
        progressBar.style.width = percent + '%';
        if (s >= FREE_DELIVERY_THRESHOLD) {
            statusLabel.innerHTML = "🎉 Бесплатная доставка!";
            statusLabel.style.color = "#4cd964";
        } else {
            statusLabel.innerHTML = `Доставка 99 ₽ (еще ${FREE_DELIVERY_THRESHOLD - s} ₽ до бесплатной)`;
            statusLabel.style.color = "inherit";
        }
    } else {
        cartFloat.classList.remove('active');
    }
}

function showCartView() { hapticImpact('medium'); document.getElementById('cart-view').classList.add('active'); renderCart(); }
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
            <div class="cart-item-info"><h4>${item.name}${size ? ' (' + size + 'см)' : ''}</h4><p>${price} ₽</p></div>
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
    const fb = document.getElementById('final-btn');
    const isMinOk = foodSum >= MIN_ORDER_SUM;
    warn.style.display = isMinOk ? 'none' : 'block';
    if (!isMinOk) document.getElementById('min-sum-diff').innerText = MIN_ORDER_SUM - foodSum;
    fb.style.opacity = isMinOk ? '1' : '0.5';
    fb.style.pointerEvents = isMinOk ? 'auto' : 'none';

    currentDeliveryFee = (deliveryMode === 'delivery' && foodSum < FREE_DELIVERY_THRESHOLD) ? FIXED_DELIVERY_FEE : 0;
    const total = foodSum + currentDeliveryFee;
    fb.innerHTML = `ЗАКАЗАТЬ: ${total} ₽`;
}

function showAddressView() { hapticImpact('heavy'); document.getElementById('address-view').classList.add('active'); updateFinalButton(); }
function hideAddressView() { document.getElementById('address-view').classList.remove('active'); }

function formatPhone(input) {
    let matrix = "+7 (___) ___-__-__", i = 0, val = input.value.replace(/\D/g, "");
    input.value = matrix.replace(/./g, a => /[_\d]/.test(a) && i < val.length ? val.charAt(i++) : i >= val.length ? "" : a);
}

function finalizeOrder() {
    const phone = document.getElementById('f-phone').value.trim();
    if (phone.replace(/\D/g, "").length < 11) { tg.showAlert("Введите номер!"); return; }
    let finalData = { items: [], comment: document.getElementById('f-comment').value.trim(), phone: phone, mode: deliveryMode };
    for (let key in cart) { for (let i = 0; i < cart[key]; i++) finalData.items.push(key); }

    if (deliveryMode === 'delivery') {
        const city = document.getElementById('f-city').value.trim();
        const street = document.getElementById('f-street').value.trim();
        const house = document.getElementById('f-house').value.trim();
        const apt = document.getElementById('f-apt').value.trim();
        if (!city || !street || !house || !apt) { tg.showAlert("Заполните адрес!"); return; }
        finalData.address = `${city}, ул. ${street}, д. ${house}, кв. ${apt}`;
        finalData.delivery_price = currentDeliveryFee;
    } else {
        finalData.address = "САМОВЫВОЗ: Невский пр. 28";
        finalData.delivery_price = 0;
    }

    saveOrderToLocalHistory(finalData);
    tg.sendData(JSON.stringify(finalData));
}

function saveOrderToLocalHistory(order) {
    let history = JSON.parse(localStorage.getItem('order_history') || '[]');
    order.id = 'RP-' + Math.floor(1000 + Math.random() * 9000);
    order.date = new Date().toLocaleString('ru-RU');
    order.timestamp = Date.now();
    order.status = 'pending';
    let totalSum = 0;
    order.itemsDetails = [];
    order.items.forEach(itemKey => {
        const [id, size] = itemKey.split('_');
        const item = ALL_ITEMS.find(x => x.id === id);
        if (item) {
            const price = size ? item.variants.find(v => v.s == size).p : item.price;
            order.itemsDetails.push({ name: item.name + (size ? ` ${size}см` : ''), price: price });
            totalSum += price;
        }
    });
    order.totalSum = totalSum + (order.delivery_price || 0);
    history.unshift(order);
    localStorage.setItem('order_history', JSON.stringify(history.slice(0, 20)));
}

function showHistoryView() {
    try {
        hapticImpact('medium');
        const view = document.getElementById('history-view');
        const list = document.getElementById('history-list');
        list.innerHTML = '';
        const history = JSON.parse(localStorage.getItem('order_history') || '[]');
        if (history.length === 0) {
            list.innerHTML = '<p style="text-align:center; padding:40px; opacity:0.5;">У вас нет заказов</p>';
        } else {
            history.forEach((order, index) => {
                const item = document.createElement('div');
                item.className = 'history-card-v2';
                const statusMap = { 'pending': '⏳ ОЖИДАЕТ', 'accepted': '✅ ПРИНЯТ', 'paid': '✅ ОПЛАЧЕН', 'delivered': '🎉 ДОСТАВЛЕНО', 'cancelled': '❌ ОТМЕНЕН' };
                const itemsStr = order.itemsDetails ? order.itemsDetails.map(i => `<div style="display:flex; justify-content:space-between; font-size:12px;"><span>${i.name}</span><b>${i.price}₽</b></div>`).join('') : 'Детали в чате';
                item.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;"><b>Заказ ${order.id}</b><b>${order.totalSum}₽</b></div>
                    <div style="font-size:10px; opacity:0.5; margin-bottom:10px;">${order.date} | ${statusMap[order.status] || order.status}</div>
                    <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:10px;">${itemsStr}</div>
                    <button class="reorder-btn-v2" onclick="reorderFromHistory(${index})">ПОВТОРИТЬ</button>`;
                list.appendChild(item);
            });
        }
        view.classList.add('active');
    } catch (e) { console.error(e); }
}

function reorderFromHistory(index) {
    const history = JSON.parse(localStorage.getItem('order_history') || '[]');
    const order = history[index];
    if (order && order.items) {
        cart = {}; order.items.forEach(k => cart[k] = (cart[k] || 0) + 1);
        hideHistoryView(); renderMenu(); updateCartUI();
        tg.showAlert('Заказ добавлен в корзину!');
    }
}

function hideHistoryView() { document.getElementById('history-view').classList.remove('active'); }
function filterMenu() { searchTerm = searchInput.value; renderMenu(); }
init();
