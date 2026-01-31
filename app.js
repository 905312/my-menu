const tg = window.Telegram.WebApp;
const menuContainer = document.getElementById('menu-container');
const categoriesContainer = document.getElementById('categories-container');
const cartStatus = document.getElementById('cart-status');
const cartCount = document.getElementById('cart-count');
const cartTotal = document.getElementById('cart-total');

tg.expand();

let cart = [];
let currentCategory = "🍕 Пицца";

const FOOD_DATA = {
    "🍕 Пицца": [
        { id: "p1", name: "Пепперони", price: 519, desc: "410 г" },
        { id: "p2", name: "Карбонара", price: 569, desc: "410 г" },
        { id: "p3", name: "4 сыра", price: 519, desc: "390 г" },
        { id: "p4", name: "Чикен Ранч", price: 599, desc: "420 г" },
        { id: "p5", name: "Пицца Чизбургер", price: 579, desc: "450 г" },
        { id: "p6", name: "Пицца Домашняя", price: 519, desc: "428 г" },
        { id: "p7", name: "Прошутто Фунги", price: 519, desc: "410 г" },
        { id: "p8", name: "Пиццбург", price: 679, desc: "430 г" },
        { id: "p9", name: "Маргарита", price: 469, desc: "300 г" },
        { id: "p10", name: "Гавайская", price: 599, desc: "430 г" },
        { id: "p11", name: "Пепперони Пиканто", price: 569, desc: "430 г" },
        { id: "p12", name: "Груша горгондзола", price: 569, desc: "390 г" },
        { id: "p13", name: "Биф хот чили пеппер", price: 669, desc: "480 г" },
        { id: "p14", name: "Охотничья", price: 599, desc: "430 г" },
        { id: "p15", name: "По-корейски", price: 519, desc: "480 г" },
        { id: "p16", name: "С лососем и рукколой", price: 719, desc: "520 г" },
        { id: "p17", name: "Горыныч", price: 599, desc: "430 г" },
        { id: "p18", name: "Мясная с грибами", price: 569, desc: "430 г" },
        { id: "p19", name: "Сырная с цыплёнком", price: 569, desc: "420 г" },
        { id: "p20", name: "Том ям с креветками", price: 679, desc: "480 г" },
        { id: "p21", name: "Аль-Шам", price: 579, desc: "490 г" },
        { id: "p22", name: "Дракон", price: 599, desc: "460 г" },
        { id: "p23", name: "Четыре сезона", price: 629, desc: "490 г" },
        { id: "p24", name: "Грибная с цыплёнком сулугуни", price: 689, desc: "590 г" },
        { id: "p25", name: "Мясная Барбекю", price: 629, desc: "440 г" },
        { id: "p26", name: "Жюльен", price: 669, desc: "520 г" },
        { id: "p27", name: "Королевская", price: 659, desc: "450 г" },
        { id: "p28", name: "Мафия", price: 629, desc: "450 г" },
        { id: "p29", name: "Пикантный цыплёнок сулугуни", price: 519, desc: "400 г" },
        { id: "p30", name: "Чикен Фреш", price: 669, desc: "490 г" },
        { id: "p31", name: "Цезарь", price: 689, desc: "500 г" },
        { id: "p32", name: "Чикен Барбекю", price: 619, desc: "450 г" },
        { id: "p33", name: "Петровская", price: 619, desc: "780 г" },
        { id: "p34", name: "Фермерская", price: 569, desc: "730 г" },
        { id: "p35", name: "Деревенская", price: 599, desc: "470 г" },
        { id: "p36", name: "Джорджия 25 см", price: 479, desc: "390 г" }
    ],
    "🍔 Бургеры": [
        { id: "b1", name: "Тройной Чизбургер", price: 249, desc: "212 г" },
        { id: "b2", name: "Двойной Биг Спешиал", price: 460, desc: "450 г" },
        { id: "b3", name: "Биг Спешиал", price: 335, desc: "340 г" },
        { id: "b4", name: "Биг Спешиал Джуниор", price: 289, desc: "231 г" },
        { id: "b5", name: "Двойной Биг Хит", price: 303, desc: "303 г" },
        { id: "b6", name: "Биг Хит", price: 221, desc: "228 г" },
        { id: "b7", name: "Гамбургер", price: 91, desc: "103 г" },
        { id: "b8", name: "Двойной Гранд", price: 327, desc: "282 г" },
        { id: "b9", name: "Гранд Де Люкс", price: 265, desc: "251 г" },
        { id: "b10", name: "Гранд", price: 244, desc: "202 г" },
        { id: "b11", name: "Двойной Чизбургер", price: 183, desc: "173 г" },
        { id: "b12", name: "Чизбургер", price: 99, desc: "117 г" },
        { id: "b13", name: "Чикен Хит", price: 137, desc: "198 г" },
        { id: "b14", name: "Цезарь Ролл", price: 230, desc: "211 г" }
    ],
    "🥤 Напитки": [
        { id: "d1", name: "Добрый Кола", price: 111, desc: "Маленький" },
        { id: "d2", name: "Американо", price: 77, desc: "Маленький" },
        { id: "d3", name: "Капучино Печенье-Орех", price: 159, desc: "330 мл" },
        { id: "d4", name: "Латте Печенье-Орех", price: 159, desc: "320 мл" },
        { id: "d5", name: "Физз Белая земляника", price: 126, desc: "Маленький" },
        { id: "d6", name: "Апельсиновый сок", price: 128, desc: "Маленький" },
        { id: "d8", name: "Добрый Кола Zero", price: 111, desc: "Маленький" },
        { id: "d13", name: "Капучино", price: 84, desc: "Маленький" },
        { id: "d14", name: "Латте", price: 119, desc: "Средний" },
        { id: "d20", name: "Вода негаз. 0.5", price: 111, desc: "500 мл" }
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
                <div class="food-desc" style="color: #a0a0a0; font-size: 11px; margin-bottom: 5px;">${item.desc}</div>
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
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
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
    const orderData = {
        items: cart.map(i => i.id)
    };
    tg.sendData(JSON.stringify(orderData));
    tg.close();
}

init();
