const tg = window.Telegram.WebApp;
const menuContainer = document.getElementById('menu-container');
const categoriesContainer = document.getElementById('categories-container');
const cartStatus = document.getElementById('cart-status');
const cartCount = document.getElementById('cart-count');
const cartTotal = document.getElementById('cart-total');

tg.expand();
tg.ready();

// Подстраиваем цвета темы под Telegram (хотя мы юзаем свой Deep Black)
tg.setHeaderColor('#000000');
tg.setBackgroundColor('#000000');

let cart = [];
let currentCategory = "🍕 Пицца";

// Полная база данных
const FOOD_DATA = {
    "🍕 Пицца": [
        { id: "p1", name: "Пепперони", price: 519, desc: "Классика с пикантной колбасой, 410г" },
        { id: "p2", name: "Карбонара", price: 569, desc: "Сливочный соус, бекон, сыр, 410г" },
        { id: "p3", name: "4 сыра", price: 519, desc: "Пармезан, чеддер, блю чиз, моцарелла, 390г" },
        { id: "p4", name: "Чикен Ранч", price: 599, desc: "Цыпленок, соус ранч, томаты, 420г" },
        { id: "p12", name: "Груша горгондзола", price: 569, desc: "Изысканный вкус, 390г" },
        { id: "p20", name: "Том ям с креветками", price: 679, desc: "Азиатский стиль, 480г" },
        { id: "p31", name: "Цезарь", price: 689, desc: "Салат цезарь на тесте, 500г" }
    ],
    "🍔 Бургеры": [
        { id: "b1", name: "Тройной Чизбургер", price: 249, desc: "Три котлеты, три сыра, 212г" },
        { id: "b2", name: "Двойной Биг Спешиал", price: 460, desc: "Огромный размер, 450г" },
        { id: "b5", name: "Двойной Биг Хит", price: 303, desc: "Легендарный соус, 303г" },
        { id: "b8", name: "Двойной Гранд", price: 327, desc: "Много мяса, 282г" },
        { id: "b14", name: "Цезарь Ролл", price: 230, desc: "В пшеничной лепешке, 211г" }
    ],
    "🥤 Напитки": [
        { id: "d1", name: "Добрый Кола", price: 111, desc: "Классика 0.5л" },
        { id: "d3", name: "Капучино Печенье-Орех", price: 159, desc: "330мл" },
        { id: "d6", name: "Апельсиновый сок", price: 128, desc: "Свежесть 0.5л" },
        { id: "d14", name: "Латте", price: 119, desc: "Большая порция" },
        { id: "d20", name: "Вода негаз.", price: 111, desc: "Артезианская 0.5л" }
    ]
};

function init() {
    renderCategories();
    renderMenu();
}

function renderCategories() {
    categoriesContainer.innerHTML = '';
    Object.keys(FOOD_DATA).forEach(cat => {
        const btn = document.createElement('div');
        btn.className = `cat-item ${cat === currentCategory ? 'active' : ''}`;
        btn.innerText = cat;
        btn.onclick = () => {
            if (currentCategory === cat) return;
            currentCategory = cat;
            tg.HapticFeedback.selectionChanged();
            renderCategories();
            renderMenu();
        };
        categoriesContainer.appendChild(btn);
    });
}

function renderMenu() {
    menuContainer.innerHTML = '';
    const items = FOOD_DATA[currentCategory];

    items.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.animationDelay = `${index * 0.05}s`;

        card.innerHTML = `
            <div class="card-img">IMAGE PORTFOLIO</div>
            <div class="card-info">
                <h3>${item.name}</h3>
                <p>${item.desc}</p>
            </div>
            <div class="card-footer">
                <div class="price">${item.price} ₽</div>
                <div class="add-icon" onclick="addToCart('${item.id}', '${item.name}', ${item.price})">+</div>
            </div>
        `;
        menuContainer.appendChild(card);
    });
}

function addToCart(id, name, price) {
    cart.push({ id, name, price });
    updateCartUI();
    tg.HapticFeedback.impactOccurred('rigid'); // Четкий щелчок
}

function updateCartUI() {
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    if (cart.length > 0) {
        cartStatus.classList.add('active');
        cartCount.innerText = cart.length;
        cartTotal.innerText = total + ' ₽';
    } else {
        cartStatus.classList.remove('active');
    }
}

function openCart() {
    tg.HapticFeedback.notificationOccurred('success');
    const orderData = {
        items: cart.map(i => i.id)
    };
    tg.sendData(JSON.stringify(orderData));
    tg.close();
}

init();
