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
let myMap, myPlacemark, selectedAddress = "";
let suggestView;

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
        card.innerHTML = `
            <div class="card-img" style="background-image: url('img/${encodeURIComponent(item.name)}.jpg')"></div>
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
            ? `<div class="qty-btn" onclick="addToCart('${item.id}')">ДОБАВИТЬ</div>`
            : `<div class="stepper">
                <div class="step-btn" onclick="updateQty('${item.id}', -1)">−</div>
                <div style="font-weight:700;">${qty}</div>
                <div class="step-btn" onclick="updateQty('${item.id}', 1)">+</div>
               </div>`
        }
    `;
}

function addToCart(id) { updateQty(id, 1); }

function updateQty(id, delta) {
    const newQty = Math.max(0, (cart[id] || 0) + delta);
    if (newQty === 0) delete cart[id]; else cart[id] = newQty;
    const f = document.getElementById(`footer-${id}`);
    if (f) f.innerHTML = getFooterHTML(ALL_ITEMS.find(x => x.id === id));
    if (document.getElementById('cart-view').classList.contains('active')) renderCart();
    updateCartUI();
}

function updateCartUI() {
    let q = 0, s = 0;
    for (let id in cart) { const i = ALL_ITEMS.find(x => x.id === id); q += cart[id]; s += i.price * cart[id]; }
    cartQty.innerText = q; cartSum.innerText = s + ' ₽';
    if (q > 0) cartFloat.classList.add('active'); else { cartFloat.classList.remove('active'); hideCartView(); }
}

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
            <div class="cart-item-stepper"><div class="stepper">
                <div class="step-btn" onclick="updateQty('${item.id}', -1)">−</div>
                <div style="font-weight:700;">${cart[id]}</div>
                <div class="step-btn" onclick="updateQty('${item.id}', 1)">+</div>
            </div></div>
        `;
        list.appendChild(row);
    }
    document.getElementById('cart-total-items').innerText = totalS + ' ₽';
    document.getElementById('cart-total-final').innerText = totalS + ' ₽';
}

function showAddressView() {
    document.getElementById('address-view').classList.add('active');
    if (typeof ymaps !== 'undefined') {
        ymaps.ready(() => {
            initYandexMap();
            if (myMap) myMap.container.fitToViewport();
        });
    }
}
function hideAddressView() { document.getElementById('address-view').classList.remove('active'); }

function initYandexMap() {
    if (myMap) return;
    myMap = new ymaps.Map("map", { center: [55.7558, 37.6173], zoom: 12, controls: ['zoomControl', 'geolocationControl'] });

    // Клик по карте
    myMap.events.add('click', function (e) {
        const coords = e.get('coords');
        setMarker(coords);

        document.getElementById('addr-search').value = "Определяем адрес...";

        ymaps.geocode(coords).then(function (res) {
            const firstGeoObject = res.geoObjects.get(0);
            selectedAddress = firstGeoObject.getAddressLine();
            document.getElementById('addr-search').value = selectedAddress;
        });
    });

    // Поисковые подсказки
    suggestView = new ymaps.SuggestView('addr-search');
    suggestView.events.add('select', function (e) {
        const addr = e.get('item').value;
        selectedAddress = addr;
        ymaps.geocode(addr).then(function (res) {
            const coords = res.geoObjects.get(0).geometry.getCoordinates();
            myMap.setCenter(coords, 17);
            setMarker(coords);
        });
    });
}

function setMarker(coords) {
    if (myPlacemark) {
        myPlacemark.geometry.setCoordinates(coords);
    } else {
        myPlacemark = new ymaps.Placemark(coords, {}, { preset: 'islands#redIcon' });
        myMap.geoObjects.add(myPlacemark);
    }
}

function finalizeOrder() {
    const apt = document.getElementById('f-apt').value.trim();
    const ent = document.getElementById('f-ent').value.trim();
    const floor = document.getElementById('f-floor').value.trim();
    const code = document.getElementById('f-code').value.trim();
    const comment = document.getElementById('f-comment').value.trim();

    if (!selectedAddress || selectedAddress === "Определяем адрес...") { tg.showAlert("Выберите адрес на карте!"); return; }
    if (!apt || !ent || !floor) { tg.showAlert("Пожалуйста, заполните: Кв, Подъезд и Этаж!"); return; }

    const fullAddr = `${selectedAddress} (Кв: ${apt}, Под: ${ent}, Эт: ${floor}${code ? ', Код: ' + code : ''})`;
    const data = {
        items: Object.entries(cart).flatMap(([id, qty]) => Array(qty).fill(id)),
        address: fullAddr,
        comment: comment,
        est_time: 30 + (Object.keys(cart).length * 4)
    };

    tg.sendData(JSON.stringify(data));
    document.getElementById('success-view').classList.add('active');
}

function filterMenu() { searchTerm = searchInput.value; renderMenu(); }
init();
