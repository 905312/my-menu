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
        { id: "p1", name: "Пепперони", price: 519, desc: "Пикантная колбаса, моцарелла" },
        { id: "p2", name: "Карбонара", price: 569, desc: "Бекон, сливочный соус, яйцо" },
        { id: "p3", name: "4 сыра", price: 519, desc: "Пармезан, чеддер, блю чиз, моцарелла" },
        { id: "p4", name: "Чикен Ранч", price: 599, desc: "Цыпленок, соус ранч, томаты" },
        { id: "p5", name: "Пицца Чизбургер", price: 579, desc: "Говядина, маринованные огурчики" },
        { id: "p6", name: "Пицца Домашняя", price: 519, desc: "Ветчина, грибы, овощи" },
        { id: "p7", name: "Прошутто Фунги", price: 519, desc: "Ветчина, шампиньоны, белый соус" },
        { id: "p8", name: "Пиццбург", price: 679, desc: "Мясной микс, соус барбекю" },
        { id: "p9", name: "Маргарита", price: 469, desc: "Томаты, базилик, моцарелла" },
        { id: "p10", name: "Гавайская", price: 599, desc: "Ананасы, ветчина, сыр" },
        { id: "p11", name: "Пепперони Пиканто", price: 569, desc: "Острая версия классики" },
        { id: "p12", name: "Груша горгондзола", price: 569, desc: "Груша, карамель, сыр дор-блю" },
        { id: "p13", name: "Биф хот чили пеппер", price: 669, desc: "Острая говядина, перец халапеньо" },
        { id: "p14", name: "Охотничья", price: 599, desc: "Колбаски, маринованный лук" },
        { id: "p15", name: "По-корейски", price: 519, desc: "Морковь по-корейски, мясо" },
        { id: "p16", name: "С лососем и рукколой", price: 719, desc: "Лосось, сливочный сыр, руккола" },
        { id: "p17", name: "Горыныч", price: 599, desc: "Очень острая мясная пицца" },
        { id: "p18", name: "Мясная с грибами", price: 569, desc: "Бекон, ветчина, шампиньоны" },
        { id: "p19", name: "Сырная с цыплёнком", price: 569, desc: "Курица, 3 вида сыра" },
        { id: "p20", name: "Том ям с креветками", price: 679, desc: "Креветки, кальмары, соус том-ям" },
        { id: "p21", name: "Аль-Шам", price: 579, desc: "Восточные специи, мясо" },
        { id: "p22", name: "Дракон", price: 599, desc: "Унаги соус, кунжут, курица" },
        { id: "p23", name: "Четыре сезона", price: 629, desc: "4 вкуса в одной пицце" },
        { id: "p24", name: "Грибная с сулугуни", price: 689, desc: "Много грибов и тягучий сыр" },
        { id: "p25", name: "Мясная Барбекю", price: 629, desc: "Копчености, соус BBQ" },
        { id: "p26", name: "Жюльен", price: 669, desc: "Курица, грибы, сливочный соус" },
        { id: "p27", name: "Королевская", price: 659, desc: "Деликатесные сорта мяса" },
        { id: "p28", name: "Мафия", price: 629, desc: "Острая салями, маслины" },
        { id: "p29", name: "Пикантный цыплёнок", price: 519, desc: "Курица, соус чили" },
        { id: "p30", name: "Чикен Фреш", price: 669, desc: "Свежие овощи, курица" },
        { id: "p31", name: "Цезарь", price: 689, desc: "Курица, соус цезарь, айсберг" },
        { id: "p32", name: "Чикен Барбекю", price: 619, desc: "Курица, лук, BBQ" },
        { id: "p33", name: "Петровская", price: 619, desc: "Старинный русский рецепт" },
        { id: "p34", name: "Фермерская", price: 569, desc: "Картофель, мясо, огурчики" },
        { id: "p35", name: "Деревенская", price: 599, desc: "Сытная, с беконом" },
        { id: "p36", name: "Джорджия 25 см", price: 479, desc: "Грузинский стиль" }
    ],
    "🍔 Бургеры": [
        { id: "b1", name: "Тройной Чизбургер", price: 249, desc: "3 котлеты, 3 сыра" },
        { id: "b2", name: "Двойной Биг Спешиал", price: 460, desc: "Огромная говяжья котлета" },
        { id: "b3", name: "Биг Спешиал", price: 335, desc: "Классический вкус" },
        { id: "b4", name: "Биг Спешиал Джуниор", price: 289, desc: "Уменьшенная версия" },
        { id: "b5", name: "Двойной Биг Хит", price: 303, desc: "Тот самый легендарный соус" },
        { id: "b6", name: "Биг Хит", price: 221, desc: "Оптимальный выбор" },
        { id: "b7", name: "Гамбургер", price: 91, desc: "Ничего лишнего" },
        { id: "b8", name: "Двойной Гранд", price: 327, desc: "Много мяса, 282г" },
        { id: "b9", name: "Гранд Де Люкс", price: 265, desc: "С овощами" },
        { id: "b10", name: "Гранд", price: 244, desc: "Стандарт классики" },
        { id: "b11", name: "Двойной Чизбургер", price: 183, desc: "Больше сыра" },
        { id: "b12", name: "Чизбургер", price: 99, desc: "Котлета и сыр" },
        { id: "b13", name: "Чикен Хит", price: 137, desc: "Курочка" },
        { id: "b14", name: "Цезарь Ролл", price: 230, desc: "В лепешке" }
    ],
    "🥤 Напитки": [
        { id: "d1", name: "Добрый Кола", price: 111, desc: "0.5 л" },
        { id: "d3", name: "Капучино Печенье-Орех", price: 159, desc: "330 мл" },
        { id: "d5", name: "Физз Белая земляника", price: 126, desc: "Ягодный вкус" },
        { id: "d6", name: "Апельсиновый сок", price: 128, desc: "0.5 л" },
        { id: "d13", name: "Капучино", price: 84, desc: "Стандарт" },
        { id: "d14", name: "Латте", price: 119, desc: "320 мл" },
        { id: "d20", name: "Вода негаз.", price: 111, desc: "500 мл" }
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
        const qty = cart[item.id] || 0;
        const card = document.createElement('div');
        card.className = 'card';
        card.id = `item-${item.id}`;

        // АВТОМАТИЧЕСКИЙ ПУТЬ ПО ИМЕНИ: img/Пепперони.jpg
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
