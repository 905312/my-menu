const tg = window.Telegram.WebApp;
const menuContainer = document.getElementById('menu-container');
const categoriesContainer = document.getElementById('categories-container');
const cartStatus = document.getElementById('cart-status');
const cartCount = document.getElementById('cart-count');
const cartTotal = document.getElementById('cart-total');

tg.expand(); // Разворачиваем на весь экран

let cart = [];
let currentCategory = "🍕 Пицца";

// Данные (упрощенная версия для примера, можно подтянуть из бота)
const FOOD_DATA = {
    "🍕 Пицца": [
        { id: "p1", name: "Пепперони", price: 519, desc: "410 г" },
        { id: "p2", name: "Карбонара", price: 569, desc: "410 г" },
        { id: "p3", name: "4 сыра", price: 519, desc: "390 г" },
        { id: "p16", name: "С лососем и рукколой", price: 719, desc: "520 г" }
    ],
    "🍔 Бургеры": [
        { id: "b1", name: "Тройной Чизбургер", price: 249, desc: "212 г" },
        { id: "b2", name: "Двойной Биг Спешиал", price: 460, desc: "450 г" },
        { id: "b6", name: "Биг Хит", price: 221, desc: "228 г" }
    ],
    "🥤 Напитки": [
        { id: "d1", name: "Добрый Кола", price: 111, desc: "0.5 л" },
        { id: "d3", name: "Капучино Печенье-Орех", price: 159, desc: "330 мл" }
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
        btn.className = `category-btn ${cat === currentCategory ? 'active' : ''}`;
        btn.innerText = cat;
        btn.onclick = () => {
            currentCategory = cat;
            renderCategories();
            renderMenu();
        };
        categoriesContainer.appendChild(btn);
    });
}

function renderMenu() {
    menuContainer.innerHTML = '';
    const items = FOOD_DATA[currentCategory];
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'food-card';
        card.innerHTML = `
            <div class="food-img"></div>
            <div class="food-info">
                <div class="food-name">${item.name}</div>
                <div class="food-price">${item.price} ₽</div>
                <button class="add-btn" onclick="addToCart('${item.id}', '${item.name}', ${item.price})">ДОБАВИТЬ</button>
            </div>
        `;
        menuContainer.appendChild(card);
    });
}

function addToCart(id, name, price) {
    cart.push({ id, name, price });
    updateCartUI();
    tg.HapticFeedback.impactOccurred('medium'); // Вибрация при добавлении
}

function updateCartUI() {
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    if (cart.length > 0) {
        cartStatus.classList.add('show');
        cartCount.innerText = cart.length;
        cartTotal.innerText = total + ' ₽';
    } else {
        cartStatus.classList.remove('show');
    }
}

function openCart() {
    // В реальном приложении тут был бы экран корзины
    // Для макета — отправляем данные боту сразу как "заказ"
    const orderData = {
        items: cart.map(i => i.id),
        total: cart.reduce((sum, item) => sum + item.price, 0)
    };

    tg.sendData(JSON.stringify(orderData)); // Отправляем данные боту
    tg.close();
}

init();
