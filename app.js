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

let cart = {}; // { id: quantity }
let currentCategory = "🍕 Пицца";
let searchTerm = "";

const FOOD_DATA = {
    "🍕 Пицца": [
        { id: "p1", name: "Пепперони", price: 519, desc: "Пикантная пепперони, моцарелла, томатный соус. Классика." },
        { id: "p2", name: "Карбонара", price: 569, desc: "Бекон, сыр, сливочный соус, нежный вкус." },
        { id: "p3", name: "4 сыра", price: 519, desc: "Пармезан, чеддер, блю чиз, моцарелла." },
        { id: "p12", name: "Груша горгондзола", price: 569, desc: "Сочетание сладкой груши и сыра с плесенью." },
        { id: "p20", name: "Том ям с креветками", price: 679, desc: "Маринованные креветки и соус том ям." },
        { id: "p31", name: "Цезарь", price: 689, desc: "Курица, салат айсберг, соус цезарь и пармезан." }
    ],
    "🍔 Бургеры": [
        { id: "b1", name: "Тройной Чизбургер", price: 249, desc: "Три сочные котлеты и море расплавленного сыра." },
        { id: "b2", name: "Двойной Биг Спешиал", price: 460, desc: "Для тех, кто по-настоящему голоден." },
        { id: "b5", name: "Двойной Биг Хит", price: 303, desc: "Легендарный соус, который знают все." },
        { id: "b13", name: "Чикен Хит", price: 137, desc: "Нежнейшее куриное филе в панировке." },
        { id: "b14", name: "Цезарь Ролл", price: 230, desc: "Классический ролл с хрустящей курочкой." }
    ],
    "🥤 Напитки": [
        { id: "d1", name: "Добрый Кола", price: 111, desc: "Освежающая классика." },
        { id: "d3", name: "Капучино Печенье-Орех", price: 159, desc: "Ароматный кофе с сиропом." },
        { id: "d5", name: "Физз Белая земляника", price: 126, desc: "Летний ягодный вкус." },
        { id: "d14", name: "Латте", price: 119, desc: "Нежная молочная пенка." }
    ]
};

// Плоский список всех товаров для поиска
const ALL_ITEMS = Object.values(FOOD_DATA).flat();

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
    const items = searchTerm
        ? ALL_ITEMS.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
        : FOOD_DATA[currentCategory];

    items.forEach((item, index) => {
        const qty = cart[item.id] || 0;
        const card = document.createElement('div');
        card.className = 'card fade-in';
        card.style.animationDelay = `${index * 0.05}s`;

        card.innerHTML = `
            <div class="card-img"></div>
            <h3>${item.name}</h3>
            <p>${item.desc}</p>
            <div class="card-footer">
                <div class="price">${item.price} ₽</div>
                ${qty === 0
                ? `<div class="qty-btn" onclick="updateQty('${item.id}', 1)">ДОБАВИТЬ</div>`
                : `<div class="stepper">
                        <div class="step-btn" onclick="updateQty('${item.id}', -1)">−</div>
                        <div style="font-weight: 700; font-size: 14px;">${qty}</div>
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

    // Формируем плоский список ID для бота (если 2 пепперони, шлем её дважды)
    const flatItems = [];
    for (const id in cart) {
        for (let i = 0; i < cart[id]; i++) {
            flatItems.push(id);
        }
    }

    const orderData = { items: flatItems };
    tg.sendData(JSON.stringify(orderData));
    tg.close();
}

init();
