/* ==========================================================================
   Otic Solutions Pvt. Ltd. - Main JavaScript
   Handles Navigation, Shop rendering, Cart management, and Validation.
   ========================================================================== */

/* ==========================================================================
   0. GLOBAL LOADER + TOAST UTILITY
   Shared across every page. Injects a full-screen loading overlay and a
   toast container the first time they're needed, so shop.js / contact.js
   can show a professional "processing" state during network requests
   without duplicating this markup on every page.
   ========================================================================== */
const OticUI = (() => {
  let overlay, textEl, toastContainer;
  let loaderCount = 0;

  function ensureNodes() {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "global-loader-overlay";
      overlay.setAttribute("role", "status");
      overlay.setAttribute("aria-live", "polite");
      overlay.innerHTML =
        '<div class="global-loader-spinner"></div><div class="global-loader-text">Loading...</div>';
      document.body.appendChild(overlay);
      textEl = overlay.querySelector(".global-loader-text");
    }
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.className = "toast-container";
      document.body.appendChild(toastContainer);
    }
  }

  function showLoader(message) {
    ensureNodes();
    loaderCount += 1;
    textEl.textContent = message || "Loading...";
    overlay.classList.add("active");
    // Safety net: never let the overlay stay stuck forever if a caller
    // forgets to hide it (e.g. an unexpected thrown error before finally).
    clearTimeout(overlay._safetyTimer);
    overlay._safetyTimer = setTimeout(forceHideLoader, 20000);
  }

  // Reference-counted so nested show/hide calls never hide the loader early.
  function hideLoader() {
    if (!overlay) return;
    loaderCount = Math.max(0, loaderCount - 1);
    if (loaderCount === 0) overlay.classList.remove("active");
  }

  // Safety net: always available so a stuck loader can never trap the user.
  function forceHideLoader() {
    loaderCount = 0;
    if (overlay) overlay.classList.remove("active");
  }

  function toast(message, type, duration) {
    ensureNodes();
    const el = document.createElement("div");
    el.className = `toast toast-${type || "success"}`;
    el.setAttribute("role", "alert");
    el.textContent = message;
    toastContainer.appendChild(el);
    setTimeout(() => el.remove(), duration || 5000);
  }

  return { showLoader, hideLoader, forceHideLoader, toast };
})();

window.OticUI = OticUI;

// Sample Product Database
const productsData = [
  {
    id: 1,
    name: "Oticon Real Hearing Aid",
    category: "hearing-aids",
    price: 45000,
    image:
      "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=400&q=80",
    description:
      "Advanced sound clarity and background noise reduction for everyday comfort.",
  },
  {
    id: 2,
    name: "Digital BTE Hearing Device",
    category: "hearing-aids",
    price: 28000,
    image:
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=400&q=80",
    description:
      "Reliable behind-the-ear digital hearing aid with easy volume adjustment.",
  },
  {
    id: 3,
    name: "Discrete ITE Hearing Aid",
    category: "hearing-aids",
    price: 35000,
    image:
      "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=400&q=80",
    description:
      "In-the-ear design offers minimal visibility and custom fit options.",
  },
  {
    id: 4,
    name: "Zinc Air Batteries (Pack of 6)",
    category: "batteries",
    price: 850,
    image:
      "https://images.unsplash.com/photo-1619725002198-6a689b72f41d?auto=format&fit=crop&w=400&q=80",
    description:
      "Long-lasting size 13 batteries compatible with most hearing devices.",
  },
  {
    id: 5,
    name: "Dehumidifier Drying Kit",
    category: "accessories",
    price: 1500,
    image:
      "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=400&q=80",
    description:
      "Protects hearing aids from moisture damage and extends lifetime.",
  },
  {
    id: 6,
    name: "Silicone Replacement Domes",
    category: "accessories",
    price: 600,
    image:
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80",
    description: "Soft, comfortable ear domes available in multiple sizes.",
  },
];

// Cart State (stored in localStorage)
let cart = JSON.parse(localStorage.getItem("otic_cart")) || [];

// DOM Content Loaded Initializer
document.addEventListener("DOMContentLoaded", () => {
  try {
    initNavigation();
    updateCartBadge();

    // Dynamic page execution
    if (document.getElementById("featured-products-container")) {
      renderFeaturedProducts();
    }
    if (document.getElementById("shop-products-container")) {
      initShopPage();
    }

    initCartModal();
  } catch (err) {
    // Defensive: a single unexpected error here should never take down
    // navigation or the rest of the page's scripts.
    console.error("Otic Solutions: page initialization error:", err);
  }
});

/* 1. Mobile Navigation Toggle */
function initNavigation() {
  const hamburger = document.getElementById("hamburger-btn");
  const navMenu = document.getElementById("nav-menu");

  if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
      navMenu.classList.toggle("active");
    });
  }

  // Automatically add active underline based on current URL
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const navLinks = document.querySelectorAll(".nav-link");

  navLinks.forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("href") === currentPath) {
      link.classList.add("active");
    }
  });
}

/* 2. Cart Management Functions */
function saveCart() {
  localStorage.setItem("otic_cart", JSON.stringify(cart));
  updateCartBadge();
}

function updateCartBadge() {
  const badge = document.getElementById("cart-count");
  if (badge) {
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = totalCount;
  }
}

function addToCart(productId) {
  const doAdd = () => {
    const product = productsData.find((p) => p.id === productId);
    if (!product) return;

    const existingItem = cart.find((item) => item.id === productId);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ ...product, quantity: 1 });
    }

    saveCart();
    alert(`${product.name} added to cart!`);
  };

  // Require an authenticated session before adding to cart.
  if (typeof protectCart === "function") {
    protectCart(doAdd);
  } else {
    doAdd();
  }
}

function updateQuantity(productId, delta) {
  const item = cart.find((i) => i.id === productId);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) {
      cart = cart.filter((i) => i.id !== productId);
    }
    saveCart();
    renderCartView();
  }
}

function removeFromCart(productId) {
  cart = cart.filter((i) => i.id !== productId);
  saveCart();
  renderCartView();
}

/* 3. Render Home Featured Products */
function renderFeaturedProducts() {
  const container = document.getElementById("featured-products-container");
  const featured = productsData.slice(0, 3);

  container.innerHTML = featured
    .map(
      (prod) => `
    <div class="product-card">
      <img src="${prod.image}" alt="${prod.name}" class="product-img" />
      <div class="product-info">
        <h3 class="product-title">${prod.name}</h3>
        <p class="product-desc">${prod.description}</p>
        <div class="product-bottom">
          <span class="product-price">NPR ${prod.price.toLocaleString()}</span>
          <button onclick="addToCart(${prod.id})" class="btn btn-primary">Add to Cart</button>
        </div>
      </div>
    </div>
  `,
    )
    .join("");
}

/* 4. Shop Page Logic (Filtering, Search, Rendering) */
function initShopPage() {
  const container = document.getElementById("shop-products-container");
  const searchInput = document.getElementById("search-input");
  const filterBtns = document.querySelectorAll(".filter-btn");

  let currentCategory = "all";
  let searchQuery = "";

  function filterAndRender() {
    let filtered = productsData.filter((prod) => {
      const matchesCategory =
        currentCategory === "all" || prod.category === currentCategory;
      const matchesSearch =
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">No hearing products found matching your search.</p>`;
      return;
    }

    container.innerHTML = filtered
      .map(
        (prod) => `
      <div class="product-card">
        <img src="${prod.image}" alt="${prod.name}" class="product-img" />
        <div class="product-info">
          <h3 class="product-title">${prod.name}</h3>
          <p class="product-desc">${prod.description}</p>
          <div class="product-bottom">
            <span class="product-price">NPR ${prod.price.toLocaleString()}</span>
            <button onclick="addToCart(${prod.id})" class="btn btn-primary">Add to Cart</button>
          </div>
        </div>
      </div>
    `,
      )
      .join("");
  }

  // Filter Event Listeners
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.getAttribute("data-category");
      filterAndRender();
    });
  });

  // Search Event Listener
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      filterAndRender();
    });
  }

  filterAndRender();
}

/* 5. Cart Modal & Checkout System */
function initCartModal() {
  const cartBtn = document.getElementById("cart-toggle-btn");
  const cartModal = document.getElementById("cart-modal");
  const closeBtn = document.getElementById("cart-close-btn");
  const checkoutBtn = document.getElementById("checkout-btn");
  const checkoutForm = document.getElementById("checkout-form-container");
  const orderForm = document.getElementById("order-form");

  if (!cartBtn || !cartModal) return;

  cartBtn.addEventListener("click", () => {
    // protectCart (from auth.js) checks the live Supabase session before
    // allowing the cart to open, and prompts login/signup otherwise.
    if (typeof protectCart === "function") {
      protectCart(() => {
        renderCartView();
        cartModal.classList.add("active");
      });
    } else {
      renderCartView();
      cartModal.classList.add("active");
    }
  });

  closeBtn.addEventListener("click", () => {
    cartModal.classList.remove("active");
    if (checkoutForm) checkoutForm.style.display = "none";
  });

  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      const proceed = () => {
        if (cart.length === 0) {
          alert("Your cart is empty!");
          return;
        }
        checkoutForm.style.display = "block";
      };
      if (typeof protectCart === "function") {
        protectCart(proceed);
      } else {
        proceed();
      }
    });
  }

  if (orderForm) {
    orderForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const alertBox = document.getElementById("order-alert");
      alertBox.className = "alert-message alert-success";
      alertBox.style.display = "block";
      alertBox.textContent =
        "Thank you! Your demo order has been logged. Please contact Otic Solutions at 9851255871 to confirm your order details.";

      // Clear cart
      cart = [];
      saveCart();
      setTimeout(() => {
        cartModal.classList.remove("active");
        checkoutForm.style.display = "none";
        alertBox.style.display = "none";
        orderForm.reset();
      }, 4000);
    });
  }
}

function renderCartView() {
  const container = document.getElementById("cart-items-container");
  const totalElem = document.getElementById("cart-total-price");
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = "<p>Your cart is empty.</p>";
    if (totalElem) totalElem.textContent = "NPR 0";
    return;
  }

  let total = 0;
  container.innerHTML = cart
    .map((item) => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      return `
      <div class="cart-item">
        <div>
          <h4>${item.name}</h4>
          <small>NPR ${item.price.toLocaleString()} x ${item.quantity}</small>
        </div>
        <div class="cart-controls">
          <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
          <button class="btn btn-secondary" style="padding: 0.2rem 0.5rem; margin-left: 0.5rem;" onclick="removeFromCart(${item.id})">Remove</button>
        </div>
      </div>
    `;
    })
    .join("");

  if (totalElem) totalElem.textContent = `NPR ${total.toLocaleString()}`;
}