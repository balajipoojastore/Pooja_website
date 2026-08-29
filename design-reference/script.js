/* Quick-commerce interactions for The Pooja House */

const SHOP_NUMBER = "91XXXXXXXXXX";
const SHOP_NAME = document.body.dataset.shop || "The Pooja Store";
const SERVICEABLE = ["560087", "560066", "560037"];
const ART = {
  idol: ["#FFF1E3", "#E67E22", "Idol"],
  diya: ["#FFF8F0", "#C9A227", "Diya"],
  agarbatti: ["#F5EFE8", "#7B5B38", "Agarbatti"],
  incense: ["#F4F0FF", "#7D5FB2", "Incense"],
  brass: ["#FFF7D9", "#C9A227", "Brass"],
  kumkum: ["#FFF0F0", "#D32F2F", "Kumkum"],
  rudraksha: ["#F7ECE4", "#8A4A25", "Rudraksha"],
  kit: ["#FFF8F0", "#E67E22", "Pooja Kit"],
  decor: ["#EFF8F0", "#2E7D32", "Decor"]
};

function img(key) {
  const [bg, fg] = ART[key] || ART.kit;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 620">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${bg}"/>
        <stop offset="1" stop-color="#ffffff"/>
      </linearGradient>
      <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#212121" flood-opacity=".14"/>
      </filter>
    </defs>
    <rect width="760" height="620" rx="54" fill="url(#g)"/>
    <circle cx="620" cy="98" r="78" fill="${fg}" opacity=".12"/>
    <circle cx="132" cy="504" r="96" fill="${fg}" opacity=".10"/>
    <g filter="url(#s)">
      <rect x="188" y="156" width="384" height="286" rx="42" fill="#fff"/>
      <circle cx="380" cy="254" r="76" fill="${fg}" opacity=".18"/>
      <path d="M285 385h190l-34-84h-25c-12 20-60 20-72 0h-25l-34 84Z" fill="${fg}"/>
      <path d="M334 286c0-42 92-42 92 0 0 26-22 48-46 48s-46-22-46-48Z" fill="${fg}" opacity=".82"/>
      <rect x="268" y="398" width="224" height="24" rx="12" fill="${fg}" opacity=".34"/>
    </g>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

// Real product photography (Unsplash) with the SVG art above as a graceful fallback
const U = id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=760&q=72`;

const CATEGORIES = [
  { name: "Idols", desc: "Brass and marble idols", ph: "idol", image: U("photo-1605646199346-6014e7a83d2e") },
  { name: "Diyas", desc: "Daily and festive lamps", ph: "diya", image: U("photo-1574161099616-d867c26bd96f") },
  { name: "Agarbatti", desc: "Rose and sandalwood", ph: "agarbatti", image: U("photo-1587389342341-0f54e01f6472") },
  { name: "Incense", desc: "Meditation fragrances", ph: "incense", image: U("photo-1615568581020-e25f187a02c8") },
  { name: "Brass Items", desc: "Kalash and thali sets", ph: "brass", image: U("photo-1578662996442-48f60103fc96") },
  { name: "Kumkum", desc: "Haldi, kumkum, chandan", ph: "kumkum", image: U("photo-1615485500704-8e99099d9d09") },
  { name: "Rudraksha", desc: "Mala and beads", ph: "rudraksha", image: U("photo-1615568581020-e25f187a02c8") },
  { name: "Pooja Kits", desc: "Ready ritual kits", ph: "kit", image: U("photo-1513475382585-d06e58bcb0e0") },
  { name: "Temple Decor", desc: "Garlands and torans", ph: "decor", image: U("photo-1629196914168-4f2c8f9d91e5") }
];

const PRODUCTS = [
  { id: "lamp", name: "Brass Oil Lamp", cat: "Diyas", price: 249, mrp: 349, discount: "29% OFF", rating: 4.9, unit: "each", stock: "In stock", delivery: "Same Day Delivery", ph: "diya", image: U("photo-1574161099616-d867c26bd96f"), desc: "Polished brass diya for daily aarti and festive rituals.", bundle: "Pair with rose agarbatti and kumkum set." },
  { id: "incense", name: "Rose Incense Sticks", cat: "Agarbatti", price: 99, mrp: 139, discount: "29% OFF", rating: 4.8, unit: "20 sticks", stock: "In stock", delivery: "30 min dispatch", ph: "agarbatti", image: U("photo-1587389342341-0f54e01f6472"), desc: "Soft floral fragrance for a calm prayer space.", bundle: "Frequently bought with brass oil lamp." },
  { id: "sandal", name: "Sandalwood Incense", cat: "Incense", price: 149, mrp: 199, discount: "25% OFF", rating: 4.7, unit: "box", stock: "In stock", delivery: "Same Day Delivery", ph: "incense", image: U("photo-1615568581020-e25f187a02c8"), desc: "Warm sandalwood notes for meditation and evening pooja.", bundle: "Add a copper kalash for festival prep." },
  { id: "thali", name: "Brass Prayer Plate Set", cat: "Brass Items", price: 899, mrp: 1199, discount: "25% OFF", rating: 4.9, unit: "set", stock: "Few left", delivery: "Same Day Delivery", ph: "brass", image: U("photo-1578662996442-48f60103fc96"), desc: "Complete prayer plate set with a premium brass finish.", bundle: "Best with haldi kumkum and cotton wicks." },
  { id: "turmeric", name: "Pure Haldi Kumkum Set", cat: "Kumkum", price: 79, mrp: 110, discount: "28% OFF", rating: 4.6, unit: "100 g", stock: "In stock", delivery: "30 min dispatch", ph: "kumkum", image: U("photo-1615485500704-8e99099d9d09"), desc: "Fresh haldi and kumkum for daily rituals and ceremonies.", bundle: "Complete it with a pooja thali set." },
  { id: "kalash", name: "Copper Kalash Pot", cat: "Brass Items", price: 649, mrp: 849, discount: "24% OFF", rating: 4.8, unit: "each", stock: "In stock", delivery: "Same Day Delivery", ph: "brass", image: U("photo-1605646199346-6014e7a83d2e"), desc: "Traditional copper kalash for griha pravesh and festivals.", bundle: "Add mango leaves and kumkum set." },
  { id: "garland", name: "Jasmine Garland", cat: "Temple Decor", price: 149, mrp: 199, discount: "25% OFF", rating: 4.7, unit: "string", stock: "Fresh today", delivery: "Same Day Delivery", ph: "decor", image: U("photo-1629196914168-4f2c8f9d91e5"), desc: "Fresh-looking garland for idols and home temple decor.", bundle: "Pair with idols, bells, and diyas." },
  { id: "hamper", name: "Festive Pooja Kit", cat: "Pooja Kits", price: 1299, mrp: 1599, discount: "19% OFF", rating: 5.0, unit: "kit", stock: "In stock", delivery: "Same Day Delivery", ph: "kit", image: U("photo-1513475382585-d06e58bcb0e0"), desc: "Curated essentials for festival pooja, gifting, and family rituals.", bundle: "Includes core items for one complete ritual." }
];

const PROMOS = [
  { label: "Festival offer", title: "Pooja kits from Rs. 499", text: "Everything for daily aarti and weekend rituals.", image: PRODUCTS[7].image, ph: PRODUCTS[7].ph },
  { label: "Free delivery", title: "Same-day local delivery", text: "Check your PIN and get essentials delivered fast.", image: PRODUCTS[0].image, ph: PRODUCTS[0].ph },
  { label: "New arrivals", title: "Fresh decor and incense", text: "Premium spiritual picks, ready for your home temple.", image: PRODUCTS[6].image, ph: PRODUCTS[6].ph }
];

const state = {};
const viewed = [];
const byId = id => PRODUCTS.find(product => product.id === id);
const fmt = value => `Rs. ${value.toLocaleString("en-IN")}`;

const els = {
  loader: document.getElementById("loader"),
  header: document.getElementById("siteHeader"),
  search: document.getElementById("searchInput"),
  voiceBtn: document.getElementById("voiceBtn"),
  promoSlider: document.getElementById("promoSlider"),
  promoDots: document.getElementById("promoDots"),
  categoryGrid: document.getElementById("categoryGrid"),
  popularGrid: document.getElementById("popularGrid"),
  bestSellerGrid: document.getElementById("bestSellerGrid"),
  recommendedGrid: document.getElementById("recommendedGrid"),
  recentGrid: document.getElementById("recentGrid"),
  productGrid: document.getElementById("productGrid"),
  resultCount: document.getElementById("resultCount"),
  cartBar: document.getElementById("cartBar"),
  headerCartBtn: document.getElementById("headerCartBtn"),
  bottomCartBtn: document.getElementById("bottomCartBtn"),
  headerCartCount: document.getElementById("headerCartCount"),
  bottomCartCount: document.getElementById("bottomCartCount"),
  cartQty: document.getElementById("cartQty"),
  cartTotal: document.getElementById("cartTotal"),
  drawer: document.getElementById("cartDrawer"),
  drawerItems: document.getElementById("drawerItems"),
  drawerSubtotal: document.getElementById("drawerSubtotal"),
  drawerTotal: document.getElementById("drawerTotal"),
  overlay: document.getElementById("cartOverlay"),
  closeDrawer: document.getElementById("closeDrawer"),
  waBtn: document.getElementById("whatsappBtn"),
  pinGate: document.getElementById("pinGate"),
  pinForm: document.getElementById("pinForm"),
  pinInput: document.getElementById("pinInput"),
  pinMsg: document.getElementById("pinMsg"),
  deliverBadge: document.getElementById("deliverBadge"),
  deliverPin: document.getElementById("deliverPin"),
  quickView: document.getElementById("quickView"),
  quickContent: document.getElementById("quickContent"),
  quickClose: document.getElementById("quickClose"),
  backTop: document.getElementById("backTop"),
  whatsappFloat: document.getElementById("whatsappFloat")
};

function heartIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>`;
}

function productCard(product) {
  return `<article class="product-card" data-id="${product.id}" data-name="${product.name.toLowerCase()}" data-cat="${product.cat.toLowerCase()}">
    <div class="product-media">
      <img src="${product.image}" alt="${product.name}" loading="lazy" data-ph="${product.ph}">
      <span class="discount-badge">${product.discount}</span>
      <span class="stock-badge">${product.stock}</span>
      <button class="wish-btn" type="button" data-wish="${product.id}" aria-label="Add ${product.name} to wishlist">${heartIcon()}</button>
    </div>
    <div class="product-body">
      <h3 class="product-name">${product.name}</h3>
      <p class="product-desc">${product.desc}</p>
      <div class="rating-row"><span class="rating-pill">${product.rating}</span><span>${product.delivery}</span></div>
      <div class="price-row"><strong>${fmt(product.price)}</strong><small>${fmt(product.mrp)}</small></div>
      <div class="product-actions">
        <button class="quick-btn" type="button" data-quick="${product.id}">View</button>
        <span class="product-control" data-control="${product.id}">${controlHTML(product.id)}</span>
        <button class="buy-btn" type="button" data-buy="${product.id}">Buy Now</button>
      </div>
    </div>
  </article>`;
}

function controlHTML(id) {
  const qty = state[id] || 0;
  if (!qty) return `<button class="add-btn" type="button" data-add="${id}" aria-label="Add ${byId(id).name}">ADD</button>`;
  return `<span class="stepper">
    <button type="button" data-dec="${id}" aria-label="Remove one ${byId(id).name}">-</button>
    <span class="qty">${qty}</span>
    <button type="button" data-inc="${id}" aria-label="Add one ${byId(id).name}">+</button>
  </span>`;
}

function renderPromos(active = 0) {
  els.promoSlider.innerHTML = PROMOS.map(promo => `<article class="promo-card">
    <div>
      <span class="label">${promo.label}</span>
      <h1>${promo.title}</h1>
      <p>${promo.text}</p>
    </div>
    <img src="${promo.image}" alt="${promo.title}" loading="lazy" data-ph="${promo.ph}">
  </article>`).join("");
  els.promoDots.innerHTML = PROMOS.map((_, index) => `<span class="${index === active ? "active" : ""}"></span>`).join("");
}

function renderCategories() {
  els.categoryGrid.innerHTML = CATEGORIES.map(category => `<button class="category-card" type="button" data-category="${category.name}">
    <span class="category-img"><img src="${category.image}" alt="${category.name}" loading="lazy" data-ph="${category.ph}"></span>
    <h3>${category.name}</h3>
    <p>${category.desc}</p>
  </button>`).join("");
}

function renderRail(node, list) {
  node.innerHTML = list.map(productCard).join("");
}

function renderProducts(list = PRODUCTS) {
  els.productGrid.innerHTML = list.map(productCard).join("");
  els.resultCount.textContent = `${list.length} ${list.length === 1 ? "item" : "items"}`;
}

function renderAll() {
  renderPromos();
  renderCategories();
  renderRail(els.popularGrid, PRODUCTS.slice(0, 6));
  renderRail(els.bestSellerGrid, [PRODUCTS[3], PRODUCTS[0], PRODUCTS[7], PRODUCTS[1]]);
  renderRail(els.recommendedGrid, [PRODUCTS[5], PRODUCTS[2], PRODUCTS[4], PRODUCTS[6]]);
  renderRail(els.recentGrid, (viewed.length ? viewed.map(byId) : PRODUCTS.slice(1, 5)).filter(Boolean));
  renderProducts(PRODUCTS);
}

function inc(id) {
  state[id] = (state[id] || 0) + 1;
  sync(id);
  bump(id);
}

function dec(id) {
  if (!state[id]) return;
  state[id] -= 1;
  if (state[id] <= 0) delete state[id];
  sync(id);
}

function removeItem(id) {
  delete state[id];
  sync(id);
}

function sync(changedId) {
  if (changedId) {
    document.querySelectorAll(`[data-control="${changedId}"]`).forEach(control => {
      control.innerHTML = controlHTML(changedId);
    });
  }
  updateCart();
}

function cartSummary() {
  return Object.entries(state).reduce((summary, [id, qty]) => {
    const product = byId(id);
    if (!product) return summary;
    summary.items += qty;
    summary.total += product.price * qty;
    return summary;
  }, { items: 0, total: 0 });
}

function updateCart() {
  const { items, total } = cartSummary();
  els.headerCartCount.textContent = items;
  els.bottomCartCount.textContent = items;
  els.cartQty.textContent = `${items} ${items === 1 ? "item" : "items"}`;
  els.cartTotal.textContent = fmt(total);
  els.drawerSubtotal.textContent = fmt(total);
  els.drawerTotal.textContent = fmt(total);
  els.cartBar.classList.toggle("show", items > 0);
  renderDrawer();
  if (items === 0) closeDrawer();
}

function renderDrawer() {
  const entries = Object.entries(state);
  if (!entries.length) {
    els.drawerItems.innerHTML = `<p class="drawer-empty">Your cart is empty. Add pooja essentials to begin.</p>`;
    return;
  }
  els.drawerItems.innerHTML = entries.map(([id, qty]) => {
    const product = byId(id);
    return `<div class="drawer-item">
      <img class="di-img" src="${product.image}" alt="${product.name}" loading="lazy" data-ph="${product.ph}">
      <span>
        <span class="di-name">${product.name}</span>
        <span class="di-price">${fmt(product.price)} x ${qty} = <b>${fmt(product.price * qty)}</b></span>
        <button class="remove-btn" type="button" data-remove="${id}">Remove</button>
      </span>
      <span class="stepper stepper--sm">
        <button type="button" data-dec="${id}" aria-label="Remove one">-</button>
        <span class="qty">${qty}</span>
        <button type="button" data-inc="${id}" aria-label="Add one">+</button>
      </span>
    </div>`;
  }).join("");
}

function openDrawer() {
  if (!cartSummary().items) return;
  els.drawer.classList.add("open");
  els.overlay.classList.add("show");
  els.drawer.setAttribute("aria-hidden", "false");
}

function closeDrawer() {
  els.drawer.classList.remove("open");
  els.overlay.classList.remove("show");
  els.drawer.setAttribute("aria-hidden", "true");
}

function bump(id) {
  els.cartBar.classList.remove("pulse");
  void els.cartBar.offsetWidth;
  els.cartBar.classList.add("pulse");
  document.querySelectorAll(`.product-card[data-id="${id}"]`).forEach(card => {
    card.classList.remove("added");
    void card.offsetWidth;
    card.classList.add("added");
  });
}

function openQuickView(id) {
  const product = byId(id);
  if (!product) return;
  if (!viewed.includes(id)) {
    viewed.unshift(id);
    if (viewed.length > 6) viewed.pop();
    renderRail(els.recentGrid, viewed.map(byId).filter(Boolean));
  }
  els.quickContent.innerHTML = `<div class="quick-layout">
    <div class="quick-gallery" aria-label="${product.name} image gallery">
      <img src="${product.image}" alt="${product.name}" data-ph="${product.ph}">
      <img src="${product.image}" alt="${product.name} detail" data-ph="${product.ph}">
    </div>
    <div class="quick-info">
      <span class="label">${product.cat}</span>
      <h2 id="quickTitle">${product.name}</h2>
      <div class="rating-row"><span class="rating-pill">${product.rating}</span><span>${product.delivery}</span></div>
      <div class="price-row"><strong>${fmt(product.price)}</strong><small>${fmt(product.mrp)}</small></div>
      <p>${product.desc}</p>
      <div class="detail-grid">
        <span><b>Unit:</b> ${product.unit}</span>
        <span><b>Stock:</b> ${product.stock}</span>
        <span><b>Delivery:</b> ${product.delivery}</span>
      </div>
      <section class="bundle-box">
        <h3>Frequently bought together</h3>
        <p>${product.bundle}</p>
      </section>
      <section class="similar-box">
        <h3>Similar products</h3>
        <p>${PRODUCTS.filter(item => item.cat === product.cat && item.id !== product.id).map(item => item.name).join(", ") || "Festival Pooja Kit, Brass Prayer Plate Set"}</p>
      </section>
    </div>
  </div>
  <div class="product-purchase-bar">
    <span class="product-control" data-control="${product.id}">${controlHTML(product.id)}</span>
    <button class="add-btn" type="button" data-add="${product.id}">Add to Cart</button>
    <button class="buy-btn" type="button" data-buy="${product.id}">Buy Now</button>
  </div>`;
  els.quickView.classList.add("open");
  els.quickView.setAttribute("aria-hidden", "false");
}

function closeQuickView() {
  els.quickView.classList.remove("open");
  els.quickView.setAttribute("aria-hidden", "true");
}

function orderOnWhatsApp() {
  const entries = Object.entries(state);
  if (!entries.length) return;
  let total = 0;
  const lines = [`Hello ${SHOP_NAME}! I would like to place an order:`, ""];
  entries.forEach(([id, qty], index) => {
    const product = byId(id);
    const lineTotal = product.price * qty;
    total += lineTotal;
    lines.push(`${index + 1}. ${product.name} - ${qty} x ${fmt(product.price)} = ${fmt(lineTotal)}`);
  });
  lines.push("", `Total: ${fmt(total)}`, "", "Please confirm availability and delivery time.");
  window.open(`https://wa.me/${SHOP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
}

function handleActions(event) {
  const wish = event.target.closest("[data-wish]");
  const quick = event.target.closest("[data-quick]");
  const add = event.target.closest("[data-add]");
  const buy = event.target.closest("[data-buy]");
  const up = event.target.closest("[data-inc]");
  const down = event.target.closest("[data-dec]");
  const remove = event.target.closest("[data-remove]");
  const category = event.target.closest("[data-category]");
  const suggest = event.target.closest("[data-suggest]");

  if (wish) wish.classList.toggle("active");
  if (quick) openQuickView(quick.dataset.quick);
  if (add) inc(add.dataset.add);
  if (buy) {
    inc(buy.dataset.buy);
    closeQuickView();
    openDrawer();
  }
  if (up) inc(up.dataset.inc);
  if (down) dec(down.dataset.dec);
  if (remove) removeItem(remove.dataset.remove);
  if (category) {
    applySearch(category.dataset.category);
    document.getElementById("allProducts").scrollIntoView({ behavior: "smooth" });
  }
  if (suggest) applySearch(suggest.dataset.suggest);
}

function applySearch(value = els.search.value) {
  const term = value.trim().toLowerCase();
  els.search.value = value;
  if (!term) {
    renderProducts(PRODUCTS);
    return;
  }
  renderProducts(PRODUCTS.filter(product => `${product.name} ${product.cat} ${product.desc}`.toLowerCase().includes(term)));
}

let promoIndex = 0;
function startPromos() {
  setInterval(() => {
    promoIndex = (promoIndex + 1) % PROMOS.length;
    els.promoSlider.scrollTo({ left: els.promoSlider.clientWidth * promoIndex, behavior: "smooth" });
    els.promoDots.querySelectorAll("span").forEach((dot, index) => dot.classList.toggle("active", index === promoIndex));
  }, 3600);
}

function openGate() {
  els.pinGate.classList.add("show");
  document.body.classList.add("gated");
  setTimeout(() => els.pinInput.focus(), 80);
}

function closeGate() {
  els.pinGate.classList.remove("show");
  document.body.classList.remove("gated");
}

function bindEvents() {
  // Swap any failed product photo to its branded SVG placeholder (capture phase — error doesn't bubble)
  document.addEventListener("error", event => {
    const target = event.target;
    if (target && target.tagName === "IMG" && target.dataset.ph) {
      const key = target.dataset.ph;
      target.removeAttribute("data-ph");
      target.src = img(key);
    }
  }, true);
  document.addEventListener("click", handleActions);
  els.search.addEventListener("input", () => applySearch());
  els.voiceBtn.addEventListener("click", () => {
    els.search.placeholder = "Voice search ready";
    els.search.focus();
  });
  els.headerCartBtn.addEventListener("click", openDrawer);
  els.bottomCartBtn.addEventListener("click", openDrawer);
  els.cartBar.addEventListener("click", openDrawer);
  els.overlay.addEventListener("click", closeDrawer);
  els.closeDrawer.addEventListener("click", closeDrawer);
  els.waBtn.addEventListener("click", orderOnWhatsApp);
  els.whatsappFloat.addEventListener("click", event => {
    event.preventDefault();
    orderOnWhatsApp();
  });
  els.quickClose.addEventListener("click", closeQuickView);
  els.quickView.addEventListener("click", event => {
    if (event.target === els.quickView) closeQuickView();
  });
  els.backTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  window.addEventListener("scroll", () => {
    els.header.classList.toggle("scrolled", window.scrollY > 10);
    els.backTop.classList.toggle("show", window.scrollY > 520);
  }, { passive: true });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeDrawer();
      closeQuickView();
    }
  });
  els.pinInput.addEventListener("input", () => {
    els.pinInput.value = els.pinInput.value.replace(/\D/g, "").slice(0, 6);
    els.pinMsg.textContent = "";
    els.pinMsg.className = "pin-msg";
  });
  els.pinForm.addEventListener("submit", event => {
    event.preventDefault();
    const pin = els.pinInput.value.trim();
    if (!/^\d{6}$/.test(pin)) {
      els.pinMsg.className = "pin-msg err";
      els.pinMsg.textContent = "Please enter a valid 6-digit PIN code.";
      return;
    }
    if (SERVICEABLE.includes(pin)) {
      els.pinMsg.className = "pin-msg ok";
      els.pinMsg.textContent = "Great. Same-day delivery is available.";
      els.deliverPin.textContent = pin;
      els.deliverBadge.hidden = false;
      setTimeout(closeGate, 550);
    } else {
      els.pinMsg.className = "pin-msg err";
      els.pinMsg.innerHTML = `Delivery is not available for <b>${pin}</b> yet. Try <b>560087</b>, <b>560066</b>, or <b>560037</b>.`;
    }
  });
  els.deliverBadge.addEventListener("click", openGate);
}

function init() {
  renderAll();
  bindEvents();
  updateCart();
  startPromos();
  if (!new URLSearchParams(window.location.search).has("preview")) openGate();
  window.addEventListener("load", () => setTimeout(() => els.loader.classList.add("hide"), 250));
  setTimeout(() => els.loader.classList.add("hide"), 1000);
}

init();
