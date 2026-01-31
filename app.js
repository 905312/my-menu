const tg = window.Telegram.WebApp;
const menuContainer = document.getElementById('menu-container');
const categoriesContainer = document.getElementById('categories-container');
const cartFloat = document.getElementById('cart-float');
const cartQty = document.getElementById('cart-qty');
const cartSum = document.getElementById('cart-sum');
const searchInput = document.getElementById('searchInput');

tg.expand();
tg.ready();
tg.setHeaderColor('#000000');

let cart = {};
let currentCategory = "🍕 Пицца";
let searchTerm = "";

const FOOD_DATA = {
    "🍕 Пицца": [
        { id: "p1", name: "Пепперони", price: 519, desc: "Пикантная колбаса, моцарелла, томатный соус" },
        { id: "p2", name: "Карбонара", price: 569, desc: "Бекон, сливочный соус, яйцо, моцарелла" },
        { id: "p3", name: "4 сыра", price: 519, desc: "Пармезан, чеддер, блю чиз, моцарелла" },
        { id: "p12", name: "Груша горгондзола", price: 569, desc: "Сладкая груша, сыр горгондзола, карамель" },
        { id: "p20", name: "Том ям", price: 679, desc: "Креветки, кальмары, авторский соус том-ям" },
        { id: "p31", name: "Цезарь", price: 689, desc: "Курица, салат айсберг, соус цезарь, пармезан" },
        { id: "p16", name: "С лососем", price: 719, desc: "Лосось, сливочный сыр, свежая руккола" }
    ],
    "🍔 Бургеры": [
        { id: "b1", name: "Тройной Чизбургер", price: 249, desc: "3 котлеты, 3 сыра, фирменный соус" },
        { id: "b2", name: "Двойной Биг Спешиал", price: 460, desc: "Огромная говяжья котлета, овощи" }
    ],
    "🥤 Напитки": [
        { id: "d1", name: "Добрый Кола", price: 111, desc: "Освежающий напиток 0.5 л" }
    ]
};

const ALL_ITEMS = Object.entries(FOOD_DATA).flatMap(([cat, items]) => items);

function init() {
    renderCategories();
    renderMenu();
}

function renderCategories() {
    categoriesContainer.innerHTML = '';
    Object.keys(FOOD_DATA).forEach(cat => {
        const span = document.createElement('span');
        span.className = `cat-item ${cat === currentCategory ? 'active' : ''}`;
        span.innerText = cat;
        span.onclick = () => {
            currentCategory = cat;
            searchTerm = "";
            searchInput.value = "";
            tg.HapticFeedback.selectionChanged();
            renderCategories();
            renderMenu();
        };
        categoriesContainer.appendChild(span);
    });
}

function renderMenu() {
    menuContainer.innerHTML = '';
    let items = searchTerm
        ? ALL_ITEMS.filter(i =>
            i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.desc.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : FOOD_DATA[currentCategory];

    items.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.id = `item-${item.id}`;

        const imgUrl = `img/${encodeURIComponent(item.name)}.jpg`;
        const bgStyle = `background-image: url('${imgUrl}'); background-size: cover; background-position: center;`;

        card.innerHTML = `
            <div class="card-img" style="${bgStyle}"></div>
            <div class="card-info">
                <h3>${item.name}</h3>
                <p>${item.desc}</p>
            </div>
            <div class="card-footer" id="footer-${item.id}">
                ${getFooterHTML(item)}
            </div>
        `;
        menuContainer.appendChild(card);
    });
}

function getFooterHTML(item) {
    const qty = cart[item.id] || 0;
    return `
        <div class="price-row">
            <div class="price">${item.price} ₽</div>
        </div>
        ${qty === 0
            ? `<div class="qty-btn" onclick="updateQty('${item.id}', 1)">ДОБАВИТЬ</div>`
            : `<div class="stepper">
                <div class="step-btn" onclick="updateQty('${item.id}', -1)">−</div>
                <div class="qty-val">${qty}</div>
                <div class="step-btn" onclick="updateQty('${item.id}', 1)">+</div>
               </div>`
        }
    `;
}

function updateQty(id, delta) {
    const currentQty = cart[id] || 0;
    const newQty = Math.max(0, currentQty + delta);
    if (newQty === 0) { delete cart[id]; tg.HapticFeedback.impactOccurred('medium'); }
    else { cart[id] = newQty; tg.HapticFeedback.impactOccurred(delta > 0 ? 'light' : 'medium'); }

    const footer = document.getElementById(`footer-${id}`);
    if (footer) {
        const item = ALL_ITEMS.find(i => i.id === id);
        footer.innerHTML = getFooterHTML(item);
    }
    updateCartUI();
}

function filterMenu() {
    searchTerm = searchInput.value;
    if (searchTerm) document.querySelectorAll('.cat-item').forEach(c => c.classList.remove('active'));
    else renderCategories();
    renderMenu();
}

function updateCartUI() {
    let totalQty = 0; let totalPrice = 0;
    for (const id in cart) {
        const item = ALL_ITEMS.find(i => i.id === id);
        if (item) { totalQty += cart[id]; totalPrice += item.price * cart[id]; }
    }
    if (totalQty > 0) { cartFloat.classList.add('active'); cartQty.innerText = totalQty; cartSum.innerText = totalPrice + ' ₽'; }
    else { cartFloat.classList.remove('active'); }
}

function openCart() {
    tg.HapticFeedback.notificationOccurred('success');
    const flatItems = [];
    for (const id in cart) { for (let i = 0; i < cart[id]; i++) flatItems.push(id); }
    if (flatItems.length === 0) return;
    tg.sendData(JSON.stringify({ items: flatItems }));
    tg.close();
}

init();
