/* ==========================================================================
   Otic Solutions Pvt. Ltd. - Shop Page JavaScript
   Handles: product rendering, search, category filtering, and the
   Buy Now -> Order Modal -> Discord webhook flow for battery orders.

   This file is completely separate from script.js and only touches
   Shop-page-specific elements (unique IDs/classes) so it never
   conflicts with the site's existing navigation, login, or cart code.
   ========================================================================== */

// ==========================================================================
// DISCORD WEBHOOK CONFIG
// Replace the URL below with your real Discord webhook URL.
// This is the ONLY place the webhook URL appears in this file.
// ==========================================================================
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1543979217157365830/B5Z7y74MfhgSlfym15qbBXYEQuQK7aP7CU8XBCoDXKMpjDWZ9YVcoA4OPgxCZlFW7M5G";

// ==========================================================================
// SHOP PRODUCT DATA
// Add more products here later (e.g. hearing-aids, accessories) by
// pushing new objects with the same shape into this array.
// ==========================================================================
const shopProducts = [
  {
    id: "hearing-aid-batteries",
    name: "Hearing Aid Batteries",
    category: "batteries",
    price: 250,
    image: "img/batteries.png",
    description:
      "Reliable, long-lasting hearing aid batteries compatible with most digital hearing devices. Sold per pack.",
    powers: ["10", "13", "312", "675"],
    // Availability drives the badge + whether "Buy Now" is enabled.
    // Flip this to false (or add more products with available: false)
    // to take an item off sale without removing it from the shop.
    available: true,
  },
];

// ==========================================================================
// STATE
// ==========================================================================
let currentCategory = "all";
let currentSearchQuery = "";
let currentQuantity = 1;

// ==========================================================================
// DOM ELEMENTS
// ==========================================================================
let productsContainer;
let searchInput;
let filterBtns;

let orderModal;
let orderCloseBtn;
let orderForm;
let orderAlert;

let buyerNameInput;
let buyerPhoneInput;
let batteryPowerSelect;

let qtyValueEl;
let qtyDecreaseBtn;
let qtyIncreaseBtn;

let receivingMethodRadios;
let deliveryLocationGroup;
let deliveryLocationInput;
let visitUsNote;

let paymentMethodRadios;
let paymentMethodGroup;
let onlinePaymentGroup;
let paymentReferenceInput;
let paymentScreenshotInput;
let paymentScreenshotFilename;
let paymentScreenshotPreview;
let paymentScreenshotPreviewImg;

let summaryPower;
let summaryQuantity;
let summaryLocationRow;
let summaryLocation;
let summaryReceiving;
let summaryPaymentRow;
let summaryPayment;
let summaryTotal;

let placeOrderBtn;

// ==========================================================================
// INIT
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  productsContainer = document.getElementById("shop-battery-container");
  if (!productsContainer) return; // Not on the shop page, do nothing.

  searchInput = document.getElementById("search-input");
  filterBtns = document.querySelectorAll(".filter-btn");

  orderModal = document.getElementById("order-modal");
  orderCloseBtn = document.getElementById("order-close-btn");
  orderForm = document.getElementById("battery-order-form");
  orderAlert = document.getElementById("battery-order-alert");

  buyerNameInput = document.getElementById("buyer-name");
  buyerPhoneInput = document.getElementById("buyer-phone");
  batteryPowerSelect = document.getElementById("battery-power");

  qtyValueEl = document.getElementById("order-qty-value");
  qtyDecreaseBtn = document.getElementById("order-qty-decrease");
  qtyIncreaseBtn = document.getElementById("order-qty-increase");

  receivingMethodRadios = document.querySelectorAll(
    'input[name="receiving-method"]',
  );
  deliveryLocationGroup = document.getElementById("delivery-location-group");
  deliveryLocationInput = document.getElementById("delivery-location");
  visitUsNote = document.getElementById("visit-us-note");

  paymentMethodRadios = document.querySelectorAll(
    'input[name="payment-method"]',
  );
  paymentMethodGroup = document.getElementById("payment-method-group");
  onlinePaymentGroup = document.getElementById("online-payment-group");
  paymentReferenceInput = document.getElementById("payment-reference");
  paymentScreenshotInput = document.getElementById("payment-screenshot");
  paymentScreenshotFilename = document.getElementById(
    "payment-screenshot-filename",
  );
  paymentScreenshotPreview = document.getElementById(
    "payment-screenshot-preview",
  );
  paymentScreenshotPreviewImg = document.getElementById(
    "payment-screenshot-preview-img",
  );

  summaryPower = document.getElementById("summary-power");
  summaryQuantity = document.getElementById("summary-quantity");
  summaryLocationRow = document.getElementById("summary-location-row");
  summaryLocation = document.getElementById("summary-location");
  summaryReceiving = document.getElementById("summary-receiving");
  summaryPaymentRow = document.getElementById("summary-payment-row");
  summaryPayment = document.getElementById("summary-payment");
  summaryTotal = document.getElementById("summary-total");

  placeOrderBtn = document.getElementById("place-order-btn");

  initSearchAndFilter();
  initOrderModal();
  initPaymentTabs();

  // Brief skeleton state on first load so the shop never flashes an
  // empty grid before content is ready (product data here is local and
  // synchronous, but this keeps the UI consistent with how a real
  // product feed would behave, and gives the layout a moment to settle).
  productsContainer.innerHTML = skeletonMarkup(3);
  try {
    renderProducts();
  } catch (err) {
    console.error("Otic Solutions: failed to render shop products:", err);
    productsContainer.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 2rem;">
        <p style="margin-bottom: 1rem;">Unable to load products. Please try again.</p>
        <button type="button" class="btn btn-primary" id="shop-retry-btn">Retry</button>
      </div>
    `;
    const retryBtn = document.getElementById("shop-retry-btn");
    if (retryBtn) retryBtn.addEventListener("click", renderProducts);
  }
});

// ==========================================================================
// PRODUCT RENDERING
// ==========================================================================
function renderProducts() {
  const query = currentSearchQuery.trim().toLowerCase();

  if (currentCategory === "hearing-aids") {
    productsContainer.innerHTML = emptyStateMarkup(
      "No hearing aids available at the moment.",
    );
    return;
  }

  if (currentCategory === "accessories") {
    productsContainer.innerHTML = emptyStateMarkup(
      "No accessories available at the moment.",
    );
    return;
  }

  // "all" and "batteries" both show the battery product (filtered by search)
  const matches = shopProducts.filter((product) =>
    productMatchesSearch(product, query),
  );

  if (matches.length === 0) {
    productsContainer.innerHTML = emptyStateMarkup("No products found.");
    return;
  }

  productsContainer.innerHTML = matches
    .map((product) => renderProductCard(product))
    .join("");
}

function renderProductCard(product) {
  const isAvailable = product.available !== false;
  const badge = isAvailable
    ? `<span class="availability-badge available">Available</span>`
    : `<span class="availability-badge not-available">Not Available</span>`;

  return `
    <div class="product-card">
      <img src="${product.image}" alt="${escapeHtml(product.name)}" class="product-img" onerror="handleProductImageError(this)" />
      <div class="product-info">
        ${badge}
        <h3 class="product-title">${escapeHtml(product.name)}</h3>
        <p class="product-desc">${escapeHtml(product.description)}</p>
        <p class="battery-powers"><strong>Available Powers:</strong> ${product.powers.map(escapeHtml).join(", ")}</p>
        <div class="product-bottom">
          <span class="product-price">Rs. ${product.price.toLocaleString()} / pack</span>
          <button
            type="button"
            class="btn btn-primary buy-now-btn"
            data-product-id="${product.id}"
            ${isAvailable ? "" : "disabled"}
            aria-disabled="${!isAvailable}"
          >
            ${isAvailable ? "Buy Now" : "Not Available"}
          </button>
        </div>
      </div>
    </div>
  `;
}

function emptyStateMarkup(message) {
  return `<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">${escapeHtml(message)}</p>`;
}

function skeletonMarkup(count) {
  return Array.from({ length: count || 3 })
    .map(
      () => `
      <div class="skeleton-card">
        <div class="skeleton-shimmer skeleton-img"></div>
        <div class="skeleton-shimmer skeleton-line"></div>
        <div class="skeleton-shimmer skeleton-line short"></div>
      </div>
    `,
    )
    .join("");
}

// Graceful fallback when a product image fails to load, instead of
// showing the browser's broken-image icon.
function handleProductImageError(imgEl) {
  imgEl.onerror = null;
  imgEl.style.display = "none";
  const fallback = document.createElement("div");
  fallback.className = "product-img";
  fallback.style.display = "flex";
  fallback.style.alignItems = "center";
  fallback.style.justifyContent = "center";
  fallback.style.color = "#94a3b8";
  fallback.style.fontSize = "0.85rem";
  fallback.textContent = "Image unavailable";
  imgEl.insertAdjacentElement("afterend", fallback);
}
window.handleProductImageError = handleProductImageError;

// Minimal HTML-escaping helper so product text is never inserted as raw
// markup (defensive against XSS if product data ever comes from an
// external source in future).
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ==========================================================================
// SEARCH
// ==========================================================================
function productMatchesSearch(product, query) {
  if (!query) return true;
  const haystack = [
    product.name,
    product.description,
    product.category,
    ...product.powers,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

// ==========================================================================
// CATEGORY FILTERING
// ==========================================================================
function initSearchAndFilter() {
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearchQuery = e.target.value;
      renderProducts();
    });
  }

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategory = btn.getAttribute("data-category");
      renderProducts();
    });
  });

  // Delegate Buy Now clicks since product cards are re-rendered.
  productsContainer.addEventListener("click", (e) => {
    const buyBtn = e.target.closest(".buy-now-btn");
    if (!buyBtn) return;
    // Guard against unavailable products even if a disabled button is
    // somehow still clickable (e.g. programmatic dispatch, older browsers).
    if (buyBtn.disabled || buyBtn.getAttribute("aria-disabled") === "true") {
      return;
    }
    openOrderModal();
  });
}

// ==========================================================================
// ORDER MODAL
// ==========================================================================
function initOrderModal() {
  if (!orderModal) return;

  orderCloseBtn.addEventListener("click", closeOrderModal);

  qtyDecreaseBtn.addEventListener("click", () => {
    if (currentQuantity > 1) {
      currentQuantity -= 1;
      updateQuantityDisplay();
    }
  });

  qtyIncreaseBtn.addEventListener("click", () => {
    currentQuantity += 1;
    updateQuantityDisplay();
  });

  receivingMethodRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      updateReceivingMethodUI();
      updateOrderSummary();
    });
  });

  paymentMethodRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      updatePaymentMethodUI();
      updateOrderSummary();
    });
  });

  batteryPowerSelect.addEventListener("change", updateOrderSummary);
  deliveryLocationInput.addEventListener("input", updateOrderSummary);
  paymentScreenshotInput.addEventListener("change", updatePaymentScreenshotPreview);

  orderForm.addEventListener("submit", handleOrderSubmit);
}

function openOrderModal() {
  resetOrderForm();
  orderModal.classList.add("active");
}

function closeOrderModal() {
  orderModal.classList.remove("active");
}

function resetOrderForm() {
  orderForm.reset();
  hideAlert();

  currentQuantity = 1;
  updateQuantityDisplay();

  updateReceivingMethodUI();
  updatePaymentMethodUI();
  updateOrderSummary();
  resetPaymentScreenshot();

  setSubmitting(false);
}

// ==========================================================================
// QUANTITY
// ==========================================================================
function updateQuantityDisplay() {
  qtyValueEl.textContent = currentQuantity;
  updateOrderSummary();
}

// ==========================================================================
// DELIVERY / VISIT US
// ==========================================================================
function getReceivingMethod() {
  const checked = document.querySelector(
    'input[name="receiving-method"]:checked',
  );
  return checked ? checked.value : "delivery";
}

function updateReceivingMethodUI() {
  const method = getReceivingMethod();

  if (method === "delivery") {
    deliveryLocationGroup.style.display = "block";
    visitUsNote.style.display = "none";
    deliveryLocationInput.setAttribute("required", "required");

    paymentMethodGroup.style.display = "block";
    updatePaymentMethodUI();
  } else {
    deliveryLocationGroup.style.display = "none";
    visitUsNote.style.display = "block";
    deliveryLocationInput.removeAttribute("required");

    // Visit Us: payment isn't asked for, so hide the whole payment section.
    paymentMethodGroup.style.display = "none";
    onlinePaymentGroup.style.display = "none";
  }
}

// ==========================================================================
// PAYMENT
// Three manual, phone-confirmed payment options: Fonepay, eSewa, and Bank
// Transfer. All three follow the same flow: show instructions + QR/details,
// customer pays externally, customer enters a transaction/reference ID and
// (for delivery orders) uploads proof of payment, we confirm by phone.
// ==========================================================================
const PAYMENT_METHOD_LABELS = {
  fonepay: "Fonepay",
  esewa: "eSewa",
  bank: "Bank Transfer",
};

function getPaymentMethod() {
  if (getReceivingMethod() !== "delivery") return null;
  const checked = document.querySelector(
    'input[name="payment-method"]:checked',
  );
  return checked ? checked.value : "fonepay";
}

function initPaymentTabs() {
  // Radio "change" handling for the payment tabs is already wired via
  // paymentMethodRadios in initOrderModal(); this just renders the
  // initial panel state on load.
  updatePaymentMethodUI();
}

function updatePaymentMethodUI() {
  const method = getPaymentMethod();
  const showOnline = method === "fonepay" || method === "esewa" || method === "bank";
  onlinePaymentGroup.style.display = showOnline ? "block" : "none";

  ["fonepay", "esewa", "bank"].forEach((key) => {
    const panel = document.getElementById(`panel-${key}`);
    if (panel) panel.classList.toggle("active", key === method);
  });
}

function updatePaymentScreenshotPreview() {
  const file = paymentScreenshotInput.files[0];

  // Reset OCR state on every new file selection.
  lastOcrText = null;
  ocrCheckToken += 1;

  if (!file) {
    paymentScreenshotFilename.textContent = "No file selected";
    paymentScreenshotPreview.classList.remove("visible");
    paymentScreenshotPreviewImg.src = "";
    setOcrStatus("");
    return;
  }

  paymentScreenshotFilename.textContent = file.name;
  paymentScreenshotPreviewImg.src = URL.createObjectURL(file);
  paymentScreenshotPreview.classList.add("visible");

  runOcrAmountCheck(file);
}

function resetPaymentScreenshot() {
  paymentScreenshotInput.value = "";
  paymentScreenshotFilename.textContent = "No file selected";
  paymentScreenshotPreview.classList.remove("visible");
  paymentScreenshotPreviewImg.src = "";
  lastOcrText = null;
  ocrCheckToken += 1;
  setOcrStatus("");
}

// ==========================================================================
// OCR AMOUNT CHECK (Tesseract.js)
// Reads the uploaded payment screenshot and checks whether the current
// order total appears in it. This is a soft, informational signal only:
// OCR can misread a perfectly genuine screenshot (glare, cropping, fonts),
// so a "not detected" result never blocks submission — it's surfaced to
// your staff in the Discord order so they know to look a little closer
// before confirming the order by phone.
// ==========================================================================
let lastOcrText = null; // cached recognized text for the current screenshot
let ocrCheckToken = 0; // guards against a stale OCR result overwriting a newer one

function setOcrStatus(message, state) {
  const el = document.getElementById("payment-screenshot-ocr-status");
  if (!el) return;
  el.className = `ocr-status ${state || ""}`.trim();
  el.textContent = message || "";
}

async function runOcrAmountCheck(file) {
  const thisCheck = ocrCheckToken;

  if (typeof Tesseract === "undefined") {
    // OCR library failed to load (offline, blocked CDN, etc). Don't block
    // the customer — just let staff know the check couldn't run.
    setOcrStatus(
      "Automatic amount check unavailable — our team will verify manually.",
      "unavailable",
    );
    return;
  }

  setOcrStatus("Checking screenshot for the payment amount...", "checking");

  try {
    const result = await Tesseract.recognize(file, "eng");
    if (thisCheck !== ocrCheckToken) return; // a newer file was selected meanwhile

    lastOcrText = result && result.data ? result.data.text : "";
    updateOcrMatchDisplay();
  } catch (err) {
    if (thisCheck !== ocrCheckToken) return;
    console.error("Otic Solutions: OCR screenshot check failed:", err);
    lastOcrText = null;
    setOcrStatus(
      "Automatic amount check unavailable — our team will verify manually.",
      "unavailable",
    );
  }
}

// Re-derives the match against the *current* order total (quantity may
// change after the screenshot was uploaded) without re-running OCR.
function updateOcrMatchDisplay() {
  if (lastOcrText === null) return; // nothing recognized yet, or check failed

  const total = shopProducts[0].price * currentQuantity;
  if (getOcrAmountMatchStatus() === "match") {
    setOcrStatus(`Amount Rs. ${total.toLocaleString()} detected in screenshot.`, "match");
  } else {
    setOcrStatus(
      `We couldn't confirm Rs. ${total.toLocaleString()} in your screenshot — our team will double-check manually.`,
      "mismatch",
    );
  }
}

// Returns "match" | "mismatch" | "unchecked" for use in both the UI and
// the Discord order notification.
function getOcrAmountMatchStatus() {
  if (lastOcrText === null) return "unchecked";
  const total = shopProducts[0].price * currentQuantity;
  const normalized = lastOcrText.replace(/,/g, "");
  // Match the plain number (e.g. 500, 750) with optional decimals, as a
  // standalone token so "500" doesn't false-match inside "45000".
  const pattern = new RegExp(`(^|[^0-9])${total}(\\.0{1,2})?([^0-9]|$)`);
  return pattern.test(normalized) ? "match" : "mismatch";
}

// ==========================================================================
// ORDER SUMMARY
// ==========================================================================
function updateOrderSummary() {
  const product = shopProducts[0];
  const power = batteryPowerSelect.value || "\u2013";
  const total = product.price * currentQuantity;
  const method = getReceivingMethod();
  const payment = getPaymentMethod();

  summaryPower.textContent = power;
  summaryQuantity.textContent = `${currentQuantity} pack${currentQuantity > 1 ? "s" : ""}`;
  summaryTotal.textContent = `Rs. ${total.toLocaleString()}`;
  summaryReceiving.textContent = method === "delivery" ? "Delivery" : "Visit Us";

  if (method === "delivery") {
    summaryLocationRow.style.display = "flex";
    summaryLocation.textContent = deliveryLocationInput.value.trim() || "\u2013";

    summaryPaymentRow.style.display = "flex";
    summaryPayment.textContent = PAYMENT_METHOD_LABELS[payment] || "Fonepay";
  } else {
    summaryLocationRow.style.display = "none";
    summaryPaymentRow.style.display = "none";
  }

  // Quantity changes the total, so re-check the cached OCR text against
  // the new total (cheap — no re-scanning of the image required).
  updateOcrMatchDisplay();
}

// ==========================================================================
// FORM VALIDATION
// ==========================================================================
function isValidPhone(phone) {
  const digitsOnly = phone.replace(/[^0-9]/g, "");
  return digitsOnly.length >= 7 && digitsOnly.length <= 15;
}

function validateOrder() {
  const errors = [];

  const name = buyerNameInput.value.trim();
  const phone = buyerPhoneInput.value.trim();
  const power = batteryPowerSelect.value;
  const method = getReceivingMethod();
  const location = deliveryLocationInput.value.trim();
  const payment = getPaymentMethod();

  if (!name) errors.push("Please enter your full name.");
  if (!phone) {
    errors.push("Please enter your phone number.");
  } else if (!isValidPhone(phone)) {
    errors.push("Please enter a valid phone number.");
  }
  if (!power) errors.push("Please select a battery power.");
  if (currentQuantity < 1) errors.push("Quantity must be at least 1.");
  if (!method) errors.push("Please select a receiving method.");
  if (method === "delivery" && !location) {
    errors.push("Please enter your delivery location.");
  }
  if (method === "delivery" && !payment) {
    errors.push("Please select a payment method.");
  }
  if (method === "delivery" && payment) {
    if (!paymentReferenceInput.value.trim()) {
      errors.push("Please enter your payment reference / transaction ID.");
    }
    if (paymentScreenshotInput.files.length === 0) {
      errors.push("Please upload a screenshot as proof of payment.");
    } else {
      const file = paymentScreenshotInput.files[0];
      const maxSizeBytes = 8 * 1024 * 1024; // Discord webhook attachment limit
      if (file.size > maxSizeBytes) {
        errors.push(
          "Your payment screenshot is too large (max 8MB). Please upload a smaller image.",
        );
      }
    }
  }

  return errors;
}

// ==========================================================================
// DISCORD WEBHOOK
// ==========================================================================
async function sendOrderToDiscord(order, screenshotFile) {
  const fields = [
    {
      name: "> Name",
      value: `\`\`\`${order.name}\`\`\``,
      inline: true,
    },
    {
      name: "> Phone",
      value: `\`\`\`${order.phone}\`\`\``,
      inline: true,
    },
    {
      name: "> Product",
      value: "```Hearing Aid Batteries```",
      inline: true,
    },
    {
      name: "> Power",
      value: `\`\`\`${order.power}\`\`\``,
      inline: true,
    },
    {
      name: "> Quantity",
      value: `\`\`\`${order.quantity} pack${order.quantity > 1 ? "s" : ""}\`\`\``,
      inline: true,
    },
    {
      name: "> Total Price",
      value: `\`\`\`Rs. ${order.total.toLocaleString()}\`\`\``,
      inline: true,
    },
    {
      name: "> Receiving Method",
      value: `\`\`\`${order.receivingMethod === "delivery" ? "Delivery" : "Visit Us"}\`\`\``,
      inline: true,
    },
  ];

  if (order.receivingMethod === "delivery") {
    fields.push({
      name: "> Delivery Location",
      value: `\`\`\`${order.location}\`\`\``,
      inline: true,
    });
    fields.push({
      name: "> Payment Method",
      value: `\`\`\`${PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}\`\`\``,
      inline: true,
    });

    if (order.paymentReference) {
      fields.push({
        name: "> Payment Reference",
        value: `\`\`\`${order.paymentReference}\`\`\``,
        inline: true,
      });
    }
  }

  fields.push({
    name: "> Order Date & Time",
    value: `\`\`\`${order.timestamp}\`\`\``,
    inline: false,
  });

  const embed = {
    title: "\uD83D\uDED2 New Battery Order Received",
    color: 0xc6168d,
    fields,
    footer: {
      text: "Otic Solutions Pvt. Ltd. — Shop Order Form",
    },
    timestamp: new Date().toISOString(),
  };

  const payload = {
    content: "\uD83D\uDD14 New battery order received! <@&1543872808348549160>",
    embeds: [embed],
  };

  let response;

  if (screenshotFile) {
    // Attach the payment screenshot as a file and reference it as the
    // embed's image via the "attachment://" scheme Discord expects.
    const safeFileName = screenshotFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    embed.image = { url: `attachment://${safeFileName}` };

    const formData = new FormData();
    formData.append("payload_json", JSON.stringify(payload));
    formData.append("files[0]", screenshotFile, safeFileName);

    response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      body: formData,
    });
  } else {
    response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  if (!response.ok) {
    throw new Error(`Discord webhook responded with status ${response.status}`);
  }
}

// ==========================================================================
// ORDER SUBMISSION
// ==========================================================================
async function handleOrderSubmit(e) {
  e.preventDefault();

  const errors = validateOrder();
  if (errors.length > 0) {
    showAlert(errors.join(" "), "error");
    return;
  }

  const screenshotFile =
    getReceivingMethod() === "delivery" &&
    getPaymentMethod() &&
    paymentScreenshotInput.files.length > 0
      ? paymentScreenshotInput.files[0]
      : null;

  const order = {
    name: buyerNameInput.value.trim(),
    phone: buyerPhoneInput.value.trim(),
    power: batteryPowerSelect.value,
    quantity: currentQuantity,
    total: shopProducts[0].price * currentQuantity,
    receivingMethod: getReceivingMethod(),
    location: deliveryLocationInput.value.trim(),
    paymentMethod: getPaymentMethod(),
    paymentReference: paymentReferenceInput.value.trim(),
    timestamp: new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  };

  setSubmitting(true);
  hideAlert();
  if (window.OticUI) OticUI.showLoader("Submitting your order...");

  try {
    if (!navigator.onLine) {
      throw new Error("offline");
    }

    await sendOrderToDiscord(order, screenshotFile);

    const confirmationMessage =
      order.receivingMethod === "delivery"
        ? "Order submitted! We've received your order and payment information. Payment confirmation is manual — we will call you at the number you provided to confirm your order and payment."
        : "Order submitted! Thank you for your order. We will contact you using the phone number you provided to confirm the order and your visit details.";

    showAlert(confirmationMessage, "success");
    if (window.OticUI) OticUI.toast("Order submitted successfully.", "success");
    orderForm.reset();
    resetPaymentScreenshot();
    setTimeout(() => {
      closeOrderModal();
    }, 5000);
  } catch (error) {
    console.error("Failed to submit order to Discord:", error);
    const message =
      error && error.message === "offline"
        ? "Unable to connect right now. Please check your internet connection and try again."
        : "We couldn't submit your order. Please try again, or call us directly at 9851255871.";
    showAlert(message, "error");
  } finally {
    setSubmitting(false);
    if (window.OticUI) OticUI.hideLoader();
  }
}

function setSubmitting(isSubmitting) {
  placeOrderBtn.disabled = isSubmitting;
  placeOrderBtn.setAttribute("aria-busy", String(isSubmitting));
  placeOrderBtn.innerHTML = isSubmitting
    ? '<i class="fa-solid fa-spinner fa-spin"></i> Placing Order...'
    : "Place Order";
}

function showAlert(message, type) {
  orderAlert.textContent = message;
  orderAlert.className = `alert-message ${type === "success" ? "alert-success" : "alert-error"}`;
  orderAlert.style.display = "block";
}

function hideAlert() {
  orderAlert.style.display = "none";
  orderAlert.textContent = "";
}