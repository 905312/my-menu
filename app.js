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

// ПОЛНЫЙ СПИСОК (для поиска и вкладок)
const FOOD_DATA = {
    "🍕 Пицца": [
        { id: "p1", name: "Пепперони", price: 519, desc: "Пикантная колбаса, моцарелла" },
        { id: "p2", name: "Карбонара", price: 569, desc: "Бекон, сливочный соус, яйцо" },
        { id: "p3", name: "4 сыра", price: 519, desc: "Пармезан, чеддер, блю чиз, моцарелла" },
        { id: "p12", name: "Груша горгондзола", price: 569, desc: "Груша, карамель, сыр дор-блю" },
        { id: "p20", name: "Том ям", price: 679, desc: "Креветки, кальмары, соус том-ям" },
        { id: "p31", name: "Цезарь", price: 689, desc: "Курица, соус цезарь, айсберг" },
        { id: "p16", name: "С лососем", price: 719, desc: "Лосось, сливочный сыр, руккола" }
    ],
    "🍔 Бургеры": [
        { id: "b1", name: "Тройной Чизбургер", price: 249, desc: "3 котлеты, 3 сыра" },
        { id: "b2", name: "Двойной Биг Спешиал", price: 460, desc: "Огромная говяжья котлета" },
        { id: "b5", name: "Двойной Биг Хит", price: 303, desc: "Тот самый легендарный соус" },
        { id: "b8", name: "Двойной Гранд", price: 327, desc: "Классика в двойном размере" },
        { id: "b14", name: "Цезарь Ролл", price: 230, desc: "Курица в пшеничной лепешке" }
    ],
    "🥤 Напитки": [
        { id: "d1", name: "Добрый Кола", price: 111, desc: "0.5 л" },
        { id: "d3", name: "Капучино Печенье-Орех", price: 159, desc: "330 мл" },
        { id: "d6", name: "Апельсиновый сок", price: 128, desc: "0.5 л" },
        { id: "d14", name: "Латте", price: 119, desc: "320 мл" },
        { id: "d20", name: "Вода негаз.", price: 111, desc: "500 мл" }
    ]
};

// Все товары для поиска по всему меню
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

    // Если есть поиск - ищем по ВСЕМУ списку ALL_ITEMS без учета категорий
    let items = searchTerm
        ? ALL_ITEMS.filter(i =>
            i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            i.desc.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : FOOD_DATA[currentCategory];

    // Удаляем дубликаты (на всякий случай)
    items = items.filter((obj, pos, arr) => {
        return arr.map(mapObj => mapObj.id).indexOf(obj.id) === pos;
    });

    if (items.length === 0) {
        menuContainer.innerHTML = '<div style="grid-column: 1/3; text-align: center; padding: 40px; color: #555;">Ничего не найдено...</div>';
        return;
    }

    items.forEach((item, index) => {
        const qty = cart[item.id] || 0;
        const card = document.createElement('div');
        card.className = 'card fade-in';
        card.style.animationDelay = `${index * 0.03}s`;

        card.innerHTML = `
            <div class="card-img"></div>
            <div class="card-info">
                <h3>${item.name}</h3>
                <p>${item.desc}</p>
            </div>
            <div class="card-footer">
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
            </div>
        `;
        menuContainer.appendChild(card);
    });
}

function updateQty(id, delta) {
    const currentQty = cart[id] || 0;
    const newQty = Math.max(0, currentQty + delta);

    if (newQty === 0) {
        delete cart[id];
        tg.HapticFeedback.impactOccurred('medium');
    } else {
        cart[id] = newQty;
        tg.HapticFeedback.impactOccurred(delta > 0 ? 'light' : 'medium');
    }

    renderMenu();
    updateCartUI();
}

function filterMenu() {
    searchTerm = searchInput.value;
    // При поиске сбрасываем активную категорию визуально
    if (searchTerm) {
        const cats = document.querySelectorAll('.cat-item');
        cats.forEach(c => c.classList.remove('active'));
    } else {
        renderCategories(); // Возвращаем подсветку текущей категории
    }
    renderMenu();
}

function updateCartUI() {
    let totalQty = 0;
    let totalPrice = 0;

    for (const id in cart) {
        const item = ALL_ITEMS.find(i => i.id === id);
        if (item) {
            totalQty += cart[id];
            totalPrice += item.price * cart[id];
        }
    }

    if (totalQty > 0) {
        cartFloat.classList.add('active');
        cartQty.innerText = totalQty;
        cartSum.innerText = totalPrice + ' ₽';
    } else {
        cartFloat.classList.remove('active');
    }
}

function openCart() {
    tg.HapticFeedback.notificationOccurred('success');
    const flatItems = [];
    for (const id in cart) {
        for (let i = 0; i < cart[id]; i++) {
            flatItems.push(id);
        }
    }

    if (flatItems.length === 0) return;

    tg.sendData(JSON.stringify({ items: flatItems }));
    tg.close();
}

init();
