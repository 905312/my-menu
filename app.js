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
let map, marker, selectedAddress = "";

const FOOD_DATA = {
    "🍕 Пицца": [
        { id: "p1", name: "Пепперони", price: 519, desc: "Пикантная колбаса, моцарелла, томатный соус" },
        { id: "p2", name: "Карбонара", price: 569, desc: "Бекон, сливочный соус, яйцо" },
        { id: "p3", name: "4 Сыра", price: 519, desc: "Пармезан, чеддер, блю чиз" },
        { id: "p12", name: "Груша горгондзола", price: 569, desc: "Сладкая груша, сыр горгондзола" },
        { id: "p20", name: "Том ям", price: 679, desc: "Креветки, кальмары, соус том-ям" },
        { id: "p31", name: "Цезарь", price: 689, desc: "Курица, салат айсберг, соус цезарь" },
        { id: "p16", name: "С лососем и рукколой", price: 719, desc: "Лосось, сливочный сыр, руккола" }
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
        { id: "d14", name: "Латте", price: 119, desc: "Нежный кофе" },
        { id: "d20", name: "Вода", price: 111, desc: "0.5 л" }
    ]
};

const ALL_ITEMS = Object.entries(FOOD_DATA).flatMap(([cat, items]) => items);

function init() {
    if (localStorage.getItem('theme') === 'light') document.body.classList.add('light-theme');
    renderCategories();
    renderMenu();
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
}

function renderCategories() {
    categoriesContainer.innerHTML = '';
    Object.keys(FOOD_DATA).forEach(cat => {
        const span = document.createElement('span');
        span.className = `cat-item ${cat === currentCategory ? 'active' : ''}`;
        span.innerText = cat;
        span.onclick = () => {
            currentCategory = cat; searchTerm = ""; searchInput.value = "";
            renderCategories(); renderMenu();
        };
        categoriesContainer.appendChild(span);
    });
}

function renderMenu() {
    menuContainer.innerHTML = '';
    let items = searchTerm ? ALL_ITEMS.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase())) : FOOD_DATA[currentCategory];
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        const imgUrl = `img/${encodeURIComponent(item.name)}.jpg`;
        card.innerHTML = `
            <div id="img-${item.id}" class="card-img" style="background-image: url('${imgUrl}')"></div>
            <h3>${item.name}</h3><p>${item.desc}</p>
            <div class="card-footer" id="footer-${item.id}">${getFooterHTML(item)}</div>
        `;
        menuContainer.appendChild(card);
    });
}

function getFooterHTML(item) {
    const qty = cart[item.id] || 0;
    return `
        <div class="price">${item.price} ₽</div>
        ${qty === 0
            ? `<div class="qty-btn" onclick="addToCart(event, '${item.id}')">ДОБАВИТЬ</div>`
            : `<div class="stepper">
                <div class="step-btn" onclick="updateQty('${item.id}', -1)">−</div>
                <div style="font-weight:700;">${qty}</div>
                <div class="step-btn" onclick="addToCart(event, '${item.id}')">+</div>
               </div>`
        }
    `;
}

function addToCart(event, id) {
    const btn = event.currentTarget; const rect = btn.getBoundingClientRect(); const cartRect = cartFloat.getBoundingClientRect();
    const flyer = document.createElement('div'); flyer.className = 'fly-item';
    flyer.style.backgroundImage = document.getElementById(`img-${id}`)?.style.backgroundImage || '';
    flyer.style.left = `${rect.left}px`; flyer.style.top = `${rect.top}px`;
    document.body.appendChild(flyer);
    setTimeout(() => {
        flyer.style.transform = `translate(${cartRect.left - rect.left + 20}px, ${cartRect.top - rect.top}px) scale(0.1)`;
        flyer.style.opacity = '0';
    }, 10);
    setTimeout(() => flyer.remove(), 600);
    updateQty(id, 1);
}

function updateQty(id, delta) {
    const newQty = Math.max(0, (cart[id] || 0) + delta);
    if (newQty === 0) delete cart[id]; else cart[id] = newQty;

    // Обновляем футер в меню
    const f = document.getElementById(`footer-${id}`);
    if (f) f.innerHTML = getFooterHTML(ALL_ITEMS.find(x => x.id === id));

    // Если мы в корзине, обновляем её
    if (document.getElementById('cart-view').classList.contains('active')) renderCart();

    updateCartUI();
}

function updateCartUI() {
    let q = 0, s = 0;
    for (let id in cart) { const i = ALL_ITEMS.find(x => x.id === id); q += cart[id]; s += i.price * cart[id]; }
    cartQty.innerText = q; cartSum.innerText = s + ' ₽';
    if (q > 0) cartFloat.classList.add('active'); else { cartFloat.classList.remove('active'); hideCartView(); }
}

// CART VIEW LOGIC
function showCartView() { document.getElementById('cart-view').classList.add('active'); renderCart(); }
function hideCartView() { document.getElementById('cart-view').classList.remove('active'); }

function renderCart() {
    const list = document.getElementById('cart-items-list');
    list.innerHTML = '';
    let totalS = 0;
    for (let id in cart) {
        const item = ALL_ITEMS.find(x => x.id === id);
        totalS += item.price * cart[id];
        const row = document.createElement('div');
        row.className = 'cart-item-row';
        row.innerHTML = `
            <div class="cart-item-img" style="background-image: url('img/${encodeURIComponent(item.name)}.jpg')"></div>
            <div class="cart-item-info"><h4>${item.name}</h4><p>${item.price} ₽</p></div>
            <div class="cart-item-stepper">
                <div class="stepper">
                    <div class="step-btn" onclick="updateQty('${item.id}', -1)">−</div>
                    <div style="font-weight:700;">${cart[id]}</div>
                    <div class="step-btn" onclick="updateQty('${item.id}', 1)">+</div>
                </div>
            </div>
        `;
        list.appendChild(row);
    }
    document.getElementById('cart-total-items').innerText = totalS + ' ₽';
    document.getElementById('cart-total-final').innerText = totalS + ' ₽';
}

// ADDRESS LOGIC
function showAddressView() {
    if (Object.keys(cart).length === 0) return;
    document.getElementById('address-view').classList.add('active');
    initMap();
}
function hideAddressView() { document.getElementById('address-view').classList.remove('active'); }

function initMap() {
    if (map) return;
    map = L.map('map').setView([55.7558, 37.6173], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    map.on('click', e => {
        if (marker) marker.setLatLng(e.latlng); else marker = L.marker(e.latlng).addTo(map);
        selectedAddress = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
        document.getElementById('curr-addr').innerText = `Координаты: ${selectedAddress}`;
    });
}

async function searchAddress() {
    const q = document.getElementById('addr-search').value;
    const resDiv = document.getElementById('addr-results');
    if (q.length < 3) { resDiv.style.display = 'none'; return; }
    const resp = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=ru&countrycode=ru`);
    const data = await resp.json();
    resDiv.innerHTML = '';
    data.features.forEach(f => {
        const p = f.properties;
        const div = document.createElement('div'); div.className = 'res-item';
        let parts = [];
        if (p.street) parts.push(p.street); else if (p.name) parts.push(p.name);
        if (p.housenumber) parts.push(p.housenumber);
        const city = p.city || p.town || p.village; if (city) parts.push(city);
        const full = parts.join(', '); div.innerText = full;
        div.onclick = () => {
            const [lng, lat] = f.geometry.coordinates;
            map.setView([lat, lng], 17);
            if (marker) marker.setLatLng([lat, lng]); else marker = L.marker([lat, lng]).addTo(map);
            document.getElementById('addr-search').value = full;
            selectedAddress = full; resDiv.style.display = 'none';
        };
        resDiv.appendChild(div);
    });
    resDiv.style.display = 'block';
}

function showSuccessView() {
    if (!selectedAddress) return tg.showAlert("Выберите адрес на карте!");
    document.getElementById('success-view').classList.add('active');
}

function closeApp() {
    const full = `${selectedAddress} (Кв: ${document.getElementById('f-apt').value}, Эт: ${document.getElementById('f-floor').value})`;
    const data = {
        items: Object.entries(cart).flatMap(([id, qty]) => Array(qty).fill(id)),
        address: full, est_time: 30 + (Object.keys(cart).length * 5)
    };
    tg.sendData(JSON.stringify(data));
}

function filterMenu() { searchTerm = searchInput.value; renderMenu(); }
init();
