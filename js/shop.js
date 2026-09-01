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
  renderProducts();
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
  return `
    <div class="product-card">
      <img src="${product.image}" alt="${product.name}" class="product-img" />
      <div class="product-info">
        <h3 class="product-title">${product.name}</h3>
        <p class="product-desc">${product.description}</p>
        <p class="battery-powers"><strong>Available Powers:</strong> ${product.powers.join(", ")}</p>
        <div class="product-bottom">
          <span class="product-price">Rs. ${product.price.toLocaleString()} / pack</span>
          <button
            type="button"
            class="btn btn-primary buy-now-btn"
            data-product-id="${product.id}"
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  `;
}

function emptyStateMarkup(message) {
  return `<p style="grid-column: 1/-1; text-align: center; padding: 2rem;">${message}</p>`;
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
    if (buyBtn) {
      openOrderModal();
    }
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
// ==========================================================================
function getPaymentMethod() {
  if (getReceivingMethod() !== "delivery") return null;
  const checked = document.querySelector(
    'input[name="payment-method"]:checked',
  );
  return checked ? checked.value : "online";
}

function updatePaymentMethodUI() {
  const method = getPaymentMethod();
  onlinePaymentGroup.style.display = method === "online" ? "block" : "none";
}

function updatePaymentScreenshotPreview() {
  const file = paymentScreenshotInput.files[0];

  if (!file) {
    paymentScreenshotFilename.textContent = "No file selected";
    paymentScreenshotPreview.classList.remove("visible");
    paymentScreenshotPreviewImg.src = "";
    return;
  }

  paymentScreenshotFilename.textContent = file.name;
  paymentScreenshotPreviewImg.src = URL.createObjectURL(file);
  paymentScreenshotPreview.classList.add("visible");
}

function resetPaymentScreenshot() {
  paymentScreenshotInput.value = "";
  paymentScreenshotFilename.textContent = "No file selected";
  paymentScreenshotPreview.classList.remove("visible");
  paymentScreenshotPreviewImg.src = "";
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
    summaryPayment.textContent = payment === "online" ? "Online Payment" : "Cash";
  } else {
    summaryLocationRow.style.display = "none";
    summaryPaymentRow.style.display = "none";
  }
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
  if (
    method === "delivery" &&
    payment === "online" &&
    paymentScreenshotInput.files.length === 0
  ) {
    errors.push("Please upload a screenshot as proof of payment.");
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
      value: `\`\`\`${order.paymentMethod === "online" ? "Online Payment" : "Cash"}\`\`\``,
      inline: true,
    });

    if (order.paymentMethod === "online" && order.paymentReference) {
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
    getPaymentMethod() === "online" &&
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
    paymentReference:
      getReceivingMethod() === "delivery"
        ? paymentReferenceInput.value.trim()
        : "",
    timestamp: new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  };

  setSubmitting(true);
  hideAlert();

  try {
    await sendOrderToDiscord(order, screenshotFile);
    showAlert(
      "Order Submitted Successfully! Thank you for your order. Your battery order has been received successfully. We will contact you using the phone number you provided to confirm the order and delivery/collection details.",
      "success",
    );
    orderForm.reset();
    resetPaymentScreenshot();
    setTimeout(() => {
      closeOrderModal();
    }, 4000);
  } catch (error) {
    console.error("Failed to submit order to Discord:", error);
    showAlert(
      "Unable to submit your order right now. Please try again.",
      "error",
    );
  } finally {
    setSubmitting(false);
  }
}

function setSubmitting(isSubmitting) {
  placeOrderBtn.disabled = isSubmitting;
  placeOrderBtn.textContent = isSubmitting ? "Placing Order..." : "Place Order";
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