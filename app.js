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
function checkParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const stop = urlParams.get('stop');
    if (stop) {
        stopList = stop.split(',').filter(x => x);
    }
    const cloudHistoryRaw = urlParams.get('h');
    if (cloudHistoryRaw) {
        try {
            const cloudHistory = JSON.parse(decodeURIComponent(cloudHistoryRaw));
            if (Array.isArray(cloudHistory)) {
                mergeHistory(cloudHistory);
            }
        } catch (e) {
            console.error("❌ Cloud Error:", e);
        }
    }
}

function mergeHistory(cloudHistory) {
    if (!Array.isArray(cloudHistory)) return;
    try {
        let localHistory = JSON.parse(localStorage.getItem('order_history') || '[]');
        if (!Array.isArray(localHistory)) localHistory = [];

        cloudHistory.forEach(ch => {
            const cloudId = String(ch.id).trim();
            const cloudStatus = String(ch.status || 'pending').toLowerCase().trim();
            const cloudTs = parseInt(ch.ts || 0);
            const localIdx = localHistory.findIndex(o => String(o.id).trim() === cloudId);

            if (localIdx !== -1) {
                // ПРИНУДИТЕЛЬНО ОБНОВЛЯЕМ статус и время
                localHistory[localIdx].status = cloudStatus;
                if (cloudTs > 0) localHistory[localIdx].timestamp = cloudTs;
            } else {
                localHistory.unshift({
                    id: cloudId,
                    totalSum: parseInt(ch.sum || 0),
                    status: cloudStatus,
                    timestamp: cloudTs,
                    date: new Date(cloudTs || Date.now()).toLocaleString('ru-RU'),
                    itemsDetails: null,
                    isCloud: true
                });
            }
        });
        localHistory.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        localStorage.setItem('order_history', JSON.stringify(localHistory.slice(0, 20)));
    } catch (e) { console.error("Merge error:", e); }
}

let deliveryMode = 'delivery';
const FIXED_DELIVERY_FEE = 99;
const FREE_DELIVERY_THRESHOLD = 1500;
const MIN_ORDER_SUM = 700;

const FOOD_DATA = {
    "🍕 Пицца": [
        { id: "p1", name: "Пепперони", desc: "Пикантная колбаса, моцарелла, томатный соус", variants: [{ s: 20, p: 399 }, { s: 30, p: 519 }, { s: 40, p: 699 }] },
        { id: "p2", name: "Карбонара", desc: "Бекон, сливочный соус, яйцо", variants: [{ s: 20, p: 449 }, { s: 30, p: 569 }, { s: 40, p: 749 }] },
        { id: "p3", name: "4 Сыра", desc: "Пармезан, чеддер, блю чиз", variants: [{ s: 20, p: 399 }, { s: 30, p: 519 }, { s: 40, p: 699 }] },
        { id: "p12", name: "Груша горгондзола", desc: "Сладкая груша, сыр горгондзола", variants: [{ s: 20, p: 449 }, { s: 30, p: 569 }, { s: 40, p: 749 }] },
        { id: "p20", name: "Том ям", desc: "Креветки, кальмары, соус том-ям", variants: [{ s: 20, p: 559 }, { s: 30, p: 679 }, { s: 40, p: 859 }] },
        { id: "p31", name: "Цезарь", desc: "Курица, салат айсберг, соус цезарь", variants: [{ s: 20, p: 569 }, { s: 30, p: 689 }, { s: 40, p: 869 }] }
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

function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved) setTheme(saved);
    else setTheme(tg.colorScheme === 'light' ? 'light' : 'dark');
}

function setTheme(theme) {
    const btn = document.querySelector('.theme-toggle');
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        if (btn) btn.innerHTML = '☀️';
    } else {
        document.body.classList.remove('light-theme');
        if (btn) btn.innerHTML = '🌙';
    }
    localStorage.setItem('theme', theme);
    if (tg.setHeaderColor) tg.setHeaderColor(theme === 'light' ? '#ffffff' : '#000000');
}

function toggleTheme() { hapticImpact('light'); setTheme(document.body.classList.contains('light-theme') ? 'dark' : 'light'); }

async function fetchStopList() {
    try {
        const r = await fetch(`stoplist.json?v=${Date.now()}`);
        if (r.ok) {
            const list = await r.json();
            if (Array.isArray(list)) { stopList = list; renderMenu(); }
        }
    } catch (e) { console.log("Stop fetch error", e); }
}

function hapticImpact(s = 'light') { if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred(s); }
function hapticSelection() { if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged(); }

function renderCategories() {
    categoriesContainer.innerHTML = '';
    Object.keys(FOOD_DATA).forEach(cat => {
        const span = document.createElement('span');
        span.className = `cat-item ${cat === currentCategory ? 'active' : ''}`;
        span.innerText = cat;
        span.onclick = () => { hapticSelection(); currentCategory = cat; searchTerm = ""; if (searchInput) searchInput.value = ""; renderCategories(); renderMenu(); };
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
        let sizeHTML = '', price = item.price, key = item.id;
        if (item.variants) {
            const sIdx = selectedSizes[item.id] !== undefined ? selectedSizes[item.id] : 1;
            const v = item.variants[sIdx];
            price = v.p; key = `${item.id}_${v.s}`;
            sizeHTML = `<div class="size-picker">` + item.variants.map((v, i) => `<div class="size-btn ${i === sIdx ? 'active' : ''}" onclick="${isUnavailable ? '' : `changeSize('${item.id}', ${i})`}">${v.s}см</div>`).join('') + `</div>`;
        }
        const badge = isUnavailable ? '<div class="unavailable-badge">🚫 НЕТ</div>' : '';
        card.innerHTML = `<div class="card-img" style="background-image:url('img/${encodeURIComponent(item.name)}.jpg')">${badge}</div>
            <h3>${item.name}</h3><p>${item.desc}</p>${sizeHTML}
            <div class="card-footer">${getFooterHTML(item, key, price, isUnavailable)}</div>`;
        menuContainer.appendChild(card);
    });
}

function changeSize(id, i) { hapticImpact('light'); selectedSizes[id] = i; renderMenu(); }

function getFooterHTML(item, key, p, un) {
    if (un) return `<div class="price" style="opacity:0.5">${p} ₽</div><div class="qty-btn unavailable-btn">НЕТ</div>`;
    const q = cart[key] || 0;
    return `<div class="price">${p} ₽</div>` + (q === 0
        ? `<div class="qty-btn" onclick="addToCart('${key}')">В КОРЗИНУ</div>`
        : `<div class="stepper"><div class="step-btn" onclick="updateQty('${key}', -1)">−</div><div style="font-weight:700; width:25px; text-align:center;">${q}</div><div class="step-btn" onclick="updateQty('${key}', 1)">+</div></div>`);
}

function addToCart(k) { hapticImpact('medium'); updateQty(k, 1); }
function updateQty(k, d) {
    const n = Math.max(0, (cart[k] || 0) + d);
    if (n === 0) delete cart[k]; else cart[k] = n;
    renderMenu(); updateCartUI();
    if (document.getElementById('cart-view').classList.contains('active')) renderCart();
}

function updateCartUI() {
    let q = 0, s = 0;
    for (let k in cart) {
        const [id, size] = k.split('_');
        const item = ALL_ITEMS.find(x => x.id === id);
        if (item) {
            const p = size ? item.variants.find(v => v.s == size).p : item.price;
            q += cart[k]; s += p * cart[k];
        }
    }
    cartQty.innerText = q; cartSum.innerText = s + ' ₽';
    const bar = document.getElementById('cart-progress'), label = document.getElementById('delivery-status-label');
    if (q > 0) {
        cartFloat.classList.add('active');
        let per = Math.min(100, (s / FREE_DELIVERY_THRESHOLD) * 100);
        if (bar) bar.style.width = per + '%';
        if (label) {
            if (s >= FREE_DELIVERY_THRESHOLD) { label.innerHTML = "🎉 Бесплатная доставка!"; label.style.color = "#4cd964"; }
            else { label.innerHTML = `Доставка 99 ₽ (еще ${FREE_DELIVERY_THRESHOLD - s} ₽ до 0₽)`; label.style.color = "inherit"; }
        }
    } else { cartFloat.classList.remove('active'); }
}

function showCartView() { hapticImpact('medium'); document.getElementById('cart-view').classList.add('active'); renderCart(); }
function hideCartView() { document.getElementById('cart-view').classList.remove('active'); }

function renderCart() {
    const list = document.getElementById('cart-items-list');
    list.innerHTML = ''; let sum = 0;
    for (let k in cart) {
        const [id, size] = k.split('_');
        const item = ALL_ITEMS.find(x => x.id === id);
        if (!item) continue;
        const p = size ? item.variants.find(v => v.s == size).p : item.price;
        sum += p * cart[k];
        const row = document.createElement('div');
        row.className = 'cart-item-row';
        row.innerHTML = `<div class="cart-item-img" style="background-image:url('img/${encodeURIComponent(item.name)}.jpg')"></div>
            <div class="cart-item-info"><h4>${item.name}${size ? ' (' + size + 'см)' : ''}</h4><p>${p} ₽</p></div>
            <div class="stepper"><div class="step-btn" onclick="updateQty('${k}', -1)">−</div><div style="font-weight:700; width:25px; text-align:center;">${cart[k]}</div><div class="step-btn" onclick="updateQty('${k}', 1)">+</div></div>`;
        list.appendChild(row);
    }
    document.getElementById('cart-total-final').innerText = sum + ' ₽';
}

function setMode(m) {
    hapticImpact('medium'); deliveryMode = m;
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
    const warn = document.getElementById('min-order-warn'), fb = document.getElementById('final-btn'), ok = s >= MIN_ORDER_SUM;
    if (warn) { warn.style.display = ok ? 'none' : 'block'; if (!ok) document.getElementById('min-sum-diff').innerText = MIN_ORDER_SUM - s; }
    if (fb) { fb.style.opacity = ok ? '1' : '0.5'; fb.style.pointerEvents = ok ? 'auto' : 'none'; const fee = (deliveryMode === 'delivery' && s < FREE_DELIVERY_THRESHOLD) ? FIXED_DELIVERY_FEE : 0; fb.innerHTML = `ЗАКАЗАТЬ: ${s + fee} ₽`; }
}

function showAddressView() { hapticImpact('heavy'); document.getElementById('address-view').classList.add('active'); updateFinalBtn(); }
function hideAddressView() { document.getElementById('address-view').classList.remove('active'); }

function formatPhone(input) {
    let v = input.value.replace(/\D/g, "");
    if (v.startsWith('8')) v = '7' + v.substring(1);
    if (v.length > 11) v = v.substring(0, 11);
    let m = "+7 (___) ___-__-__", val = "", dataIdx = (v.startsWith('7')) ? 1 : 0;
    for (let j = 0; j < m.length; j++) {
        if (m[j] === '_') {
            if (dataIdx < v.length) val += v[dataIdx++];
            else val += '_';
        } else val += m[j];
    }
    input.value = val;
}

function finalizeOrder() {
    const ph = document.getElementById('f-phone').value.trim();
    if (ph.replace(/\D/g, "").length < 11) { tg.showAlert("Введите номер!"); return; }
    const orderId = 'RP-' + Math.floor(1000 + Math.random() * 9000);
    let res = { id: orderId, items: [], comment: document.getElementById('f-comment').value.trim(), phone: ph, mode: deliveryMode };
    for (let k in cart) for (let i = 0; i < cart[k]; i++) res.items.push(k);
    if (deliveryMode === 'delivery') {
        const c = document.getElementById('f-city').value.trim(), st = document.getElementById('f-street').value.trim(), h = document.getElementById('f-house').value.trim(), a = document.getElementById('f-apt').value.trim(), ent = document.getElementById('f-ent').value.trim(), fl = document.getElementById('f-floor').value.trim(), cd = document.getElementById('f-code').value.trim();
        if (!c || !st || !h || !a) { tg.showAlert("Заполните адрес!"); return; }
        let addr = `${c}, ул. ${st}, д. ${h}, кв. ${a}`;
        if (ent) addr += `, под. ${ent}`; if (fl) addr += `, эт. ${fl}`; if (cd) addr += `, код ${cd}`;
        res.address = addr; res.delivery_price = (cartSum.innerText.replace(/\D/g, '') < FREE_DELIVERY_THRESHOLD ? FIXED_DELIVERY_FEE : 0);
    } else { res.address = "САМОВЫВОЗ: Невский пр. 28"; res.delivery_price = 0; }
    saveToHistory(res); tg.sendData(JSON.stringify(res));
}

function saveToHistory(order) {
    let h = JSON.parse(localStorage.getItem('order_history') || '[]');
    order.date = new Date().toLocaleString('ru-RU'); order.timestamp = Date.now(); order.status = 'pending';
    let s = 0; order.itemsDetails = [];
    order.items.forEach(k => {
        const [id, size] = k.split('_'), item = ALL_ITEMS.find(x => x.id === id);
        if (item) { const p = size ? item.variants.find(v => v.s == size).p : item.price; order.itemsDetails.push({ name: item.name + (size ? ` ${size}см` : ''), price: p }); s += p; }
    });
    order.totalSum = s + (order.delivery_price || 0); h.unshift(order); localStorage.setItem('order_history', JSON.stringify(h.slice(0, 20)));
}

function showHistoryView() {
    try {
        hapticImpact('medium');
        const view = document.getElementById('history-view'), list = document.getElementById('history-list');
        if (!view || !list) return;
        list.innerHTML = ''; const history = JSON.parse(localStorage.getItem('order_history') || '[]');
        if (history.length === 0) list.innerHTML = '<p style="text-align:center; padding:40px; opacity:0.5;">У вас нет заказов</p>';
        else {
            const now = Date.now();
            history.forEach((o, i) => {
                let currentStatus = String(o.status || 'pending').toLowerCase().trim();
                const activeStatuses = ['accepted', 'paid', 'pending'];
                if (o.timestamp && activeStatuses.includes(currentStatus)) {
                    const diffMinutes = Math.floor((now - o.timestamp) / (1000 * 60));
                    if (diffMinutes >= 70) currentStatus = 'delivered';
                }
                const card = document.createElement('div'); card.className = 'history-card-v2';
                const map = { 'pending': '⏳ ОЖИДАЕТ', 'accepted': '✅ ПРИНЯТ', 'paid': '✅ ОПЛАЧЕН', 'delivered': '🎉 ДОСТАВЛЕНО', 'cancelled': '❌ ОТМЕНЕН', 'refunded': '💰 ВОЗВРАТ', 'resolved': '💎 РЕШЕНО' };
                const det = o.itemsDetails ? o.itemsDetails.map(it => `<div style="display:flex; justify-content:space-between; font-size:12px;"><span>${it.name}</span><b>${it.price}₽</b></div>`).join('') : 'Детали в чате';
                card.innerHTML = `<div style="display:flex; justify-content:space-between; margin-bottom:8px;"><b>Заказ ${o.id}</b><b>${o.totalSum}₽</b></div>
                    <div style="font-size:10px; opacity:0.5; margin-bottom:10px;">${o.date} | ${map[currentStatus] || currentStatus}</div>
                    <div style="background:rgba(255,255,255,0.03); padding:10px; border-radius:10px;">${det}</div>
                    <button class="reorder-btn-v2" onclick="reorder(${i})">ПОВТОРИТЬ</button>`;
                list.appendChild(card);
            });
        }
        view.classList.add('active');
    } catch (e) { console.error("History error", e); }
}

function reorder(i) {
    const h = JSON.parse(localStorage.getItem('order_history') || '[]'); const o = h[i];
    if (o && o.items) { cart = {}; o.items.forEach(k => cart[k] = (cart[k] || 0) + 1); hideHistoryView(); renderMenu(); updateCartUI(); tg.showAlert('Заказ добавлен в корзину!'); }
}
function hideHistoryView() { document.getElementById('history-view').classList.remove('active'); }
function filterMenu() { searchTerm = searchInput.value; renderMenu(); }
function init() { initTheme(); checkParams(); fetchStopList(); renderCategories(); renderMenu(); setInterval(fetchStopList, 10000); }
init();
