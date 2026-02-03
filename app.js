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

function checkParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const stop = urlParams.get('stop');
    if (stop) stopList = stop.split(',').filter(x => x);
    const cloudHistoryRaw = urlParams.get('h');
    if (cloudHistoryRaw) {
        try {
            const cloudHistory = JSON.parse(decodeURIComponent(cloudHistoryRaw));
            if (Array.isArray(cloudHistory)) mergeHistory(cloudHistory);
        } catch (e) { console.error(e); }
    }
}

function mergeHistory(cloudHistory) {
    if (!Array.isArray(cloudHistory)) return;
    try {
        let localHistory = JSON.parse(localStorage.getItem('order_history') || '[]');
        cloudHistory.forEach(ch => {
            const cloudId = String(ch.id).trim();
            const cloudStatus = String(ch.status || 'pending').toLowerCase().trim();
            const cloudTs = parseInt(ch.ts || 0);
            const localIdx = localHistory.findIndex(o => String(o.id).trim() === cloudId);
            if (localIdx !== -1) {
                localHistory[localIdx].status = cloudStatus;
                if (cloudTs > 0) localHistory[localIdx].timestamp = cloudTs;
            } else {
                localHistory.unshift({ id: cloudId, totalSum: parseInt(ch.sum || 0), status: cloudStatus, timestamp: cloudTs, date: new Date(cloudTs || Date.now()).toLocaleString() });
            }
        });
        localStorage.setItem('order_history', JSON.stringify(localHistory.slice(0, 20)));
    } catch (e) { console.error(e); }
}

let deliveryMode = 'delivery';
const FIXED_DELIVERY_FEE = 99;
const FREE_DELIVERY_THRESHOLD = 1500;
const MIN_ORDER_SUM = 700;

const FOOD_DATA = {
    "🍕 Пицца": [
        { id: "p1", name: "Пепперони", desc: "Колбаса, моцарелла", variants: [{ s: 20, p: 399 }, { s: 30, p: 519 }, { s: 40, p: 699 }] },
        { id: "p2", name: "Карбонара", desc: "Бекон, соус", variants: [{ s: 20, p: 449 }, { s: 30, p: 569 }, { s: 40, p: 749 }] },
        { id: "p3", name: "4 Сыра", desc: "Сыры", variants: [{ s: 20, p: 399 }, { s: 30, p: 519 }, { s: 40, p: 699 }] }
    ],
    "🍔 Бургеры": [
        { id: "b1", name: "Тройной чизбургер", price: 249, desc: "3 котлеты" },
        { id: "b2", name: "Биг Спешиал", price: 460, desc: "Говядина" }
    ]
};

const ALL_ITEMS = Object.entries(FOOD_DATA).flatMap(([cat, items]) => items);

function setTheme(theme) {
    if (theme === 'light') document.body.classList.add('light-theme');
    else document.body.classList.remove('light-theme');
    localStorage.setItem('theme', theme);
}
function toggleTheme() { setTheme(document.body.classList.contains('light-theme') ? 'dark' : 'light'); }

function renderCategories() {
    categoriesContainer.innerHTML = '';
    Object.keys(FOOD_DATA).forEach(cat => {
        const span = document.createElement('span');
        span.className = `cat-item ${cat === currentCategory ? 'active' : ''}`;
        span.innerText = cat;
        span.onclick = () => { currentCategory = cat; renderCategories(); renderMenu(); };
        categoriesContainer.appendChild(span);
    });
}

function renderMenu() {
    menuContainer.innerHTML = '';
    let items = searchTerm ? ALL_ITEMS.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())) : FOOD_DATA[currentCategory];
    items.forEach(item => {
        const card = document.createElement('div');
        const isUnavailable = stopList.includes(item.id);
        card.className = isUnavailable ? 'card unavailable' : 'card';
        let sizeHTML = '', price = item.price, key = item.id;
        if (item.variants) {
            const sIdx = 1; const v = item.variants[sIdx];
            price = v.p; key = `${item.id}_${v.s}`;
        }
        card.innerHTML = `<div class="card-img" style="background-image:url('img/${encodeURIComponent(item.name)}.jpg')"></div>
            <h3>${item.name}</h3><p>${item.desc}</p>
            <div class="card-footer">${getFooterHTML(item, key, price, isUnavailable)}</div>`;
        menuContainer.appendChild(card);
    });
}

function getFooterHTML(item, key, p, un) {
    if (un) return `<div class="price">${p} ₽</div><div class="qty-btn">НЕТ</div>`;
    const q = cart[key] || 0;
    return `<div class="price">${p} ₽</div>` + (q === 0
        ? `<div class="qty-btn" onclick="addToCart('${key}')">В КОРЗИНУ</div>`
        : `<div class="stepper"><div class="step-btn" onclick="updateQty('${key}', -1)">−</div><div>${q}</div><div class="step-btn" onclick="updateQty('${key}', 1)">+</div></div>`);
}

function addToCart(k) { updateQty(k, 1); }
function updateQty(k, d) {
    const n = Math.max(0, (cart[k] || 0) + d);
    if (n === 0) delete cart[k]; else cart[k] = n;
    renderMenu(); updateCartUI();
}

function updateCartUI() {
    let q = 0, s = 0;
    for (let k in cart) {
        const [id, size] = k.split('_'), item = ALL_ITEMS.find(x => x.id === id);
        if (item) s += (size ? item.variants.find(v => v.s == size).p : item.price) * cart[k];
        q += cart[k];
    }
    cartQty.innerText = q; cartSum.innerText = s + ' ₽';
    if (q > 0) cartFloat.classList.add('active'); else cartFloat.classList.remove('active');
    document.getElementById('cart-progress').style.width = Math.min(100, (s / FREE_DELIVERY_THRESHOLD) * 100) + '%';
}

function showCartView() { document.getElementById('cart-view').classList.add('active'); renderCart(); }
function hideCartView() { document.getElementById('cart-view').classList.remove('active'); }

function renderCart() {
    const list = document.getElementById('cart-items-list');
    list.innerHTML = ''; let sum = 0;
    for (let k in cart) {
        const [id, size] = k.split('_'), item = ALL_ITEMS.find(x => x.id === id);
        if (!item) continue;
        const p = size ? item.variants.find(v => v.s == size).p : item.price;
        sum += p * cart[k];
        list.innerHTML += `<div style="display:flex; justify-content:space-between; margin-bottom:10px;"><span>${item.name} x${cart[k]}</span><span>${p * cart[k]} ₽</span></div>`;
    }
    document.getElementById('cart-total-final').innerText = sum + ' ₽';
}

function setMode(m) {
    deliveryMode = m;
    document.getElementById('btn-delivery').classList.toggle('active', m === 'delivery');
    document.getElementById('btn-pickup').classList.toggle('active', m === 'pickup');
    document.getElementById('delivery-fields').style.display = (m === 'delivery' ? 'block' : 'none');
    document.getElementById('pickup-info').style.display = (m === 'pickup' ? 'block' : 'none');
    updateFinalBtn();
}

function updateFinalBtn() {
    let s = 0;
    for (let k in cart) {
        const [id, size] = k.split('_'), item = ALL_ITEMS.find(x => x.id === id);
        if (item) s += (size ? item.variants.find(v => v.s == size).p : item.price) * cart[k];
    }
    const ok = (deliveryMode === 'pickup') || (s >= MIN_ORDER_SUM);
    document.getElementById('min-order-warn').style.display = ok ? 'none' : 'block';
    const fb = document.getElementById('final-btn');
    fb.innerHTML = `ЗАКАЗАТЬ: ${s + (deliveryMode === 'delivery' && s < FREE_DELIVERY_THRESHOLD ? 99 : 0)} ₽`;
    fb.style.opacity = ok ? '1' : '0.5'; fb.style.pointerEvents = ok ? 'auto' : 'none';
}

function showAddressView() { document.getElementById('address-view').classList.add('active'); updateFinalBtn(); }
function hideAddressView() { document.getElementById('address-view').classList.remove('active'); }

function formatPhone(i) {
    let v = i.value.replace(/\D/g, "");
    if (v.length > 11) v = v.substring(0, 11);
    i.value = v;
}

function finalizeOrder() {
    const ph = document.getElementById('f-phone').value;
    if (ph.replace(/\D/g, "").length < 11) { tg.showAlert("Введите корректный номер телефона!"); return; }

    let addr = "Самовывоз: Невский пр. 28";
    if (deliveryMode === 'delivery') {
        const st = document.getElementById('f-street').value.trim();
        const h = document.getElementById('f-house').value.trim();
        const a = document.getElementById('f-apt').value.trim();

        if (!st || !h || !a) {
            tg.showAlert("Пожалуйста, заполните все обязательные поля (Улица, Дом, Квартира)!");
            return;
        }

        addr = `ул. ${st}, д. ${h}, кв. ${a}`;
        const ent = document.getElementById('f-ent').value.trim();
        const fl = document.getElementById('f-floor').value.trim();
        const cd = document.getElementById('f-code').value.trim();

        if (ent) addr += `, под. ${ent}`;
        if (fl) addr += `, эт. ${fl}`;
        if (cd) addr += `, код ${cd}`;
    }

    const res = {
        id: 'RP-' + Math.floor(1000 + Math.random() * 8999),
        itemsCount: cart, // Передаем объект корзины целиком для точности
        items: Object.keys(cart),
        phone: ph,
        mode: deliveryMode,
        address: addr,
        comment: document.getElementById('f-comment').value.trim()
    };
    tg.sendData(JSON.stringify(res));
}

function showHistoryView() {
    const list = document.getElementById('history-list');
    list.innerHTML = ''; const h = JSON.parse(localStorage.getItem('order_history') || '[]');
    h.forEach(o => {
        list.innerHTML += `<div class="history-card-v2"><b>Заказ ${o.id}</b><br><small>${o.date} - ${o.status}</small></div>`;
    });
    document.getElementById('history-view').classList.add('active');
}
function hideHistoryView() { document.getElementById('history-view').classList.remove('active'); }
function filterMenu() { searchTerm = searchInput.value; renderMenu(); }

checkParams(); renderCategories(); renderMenu();
if (localStorage.getItem('theme')) setTheme(localStorage.getItem('theme'));
