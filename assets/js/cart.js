(() => {
  "use strict";

  const STORAGE_KEY = "gunstar-cart-v1";

  const products =
    typeof GUNSTAR_PRODUCTS !== "undefined"
      ? GUNSTAR_PRODUCTS
      : [];

  const findProduct = id =>
    products.find(product => product.id === id);

  const hasPrice = product =>
    Number.isSafeInteger(product.price) && product.price >= 0;

  const formatPrice = cents =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR"
    }).format(cents / 100);

function getSizes(product) {
  return Array.isArray(product.sizes) ? product.sizes : [];
}

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(saved)) return [];

    const merged = new Map();

    for (const item of saved) {
      if (!item) continue;

      const product = findProduct(item.id);

      if (
        !product?.purchasable ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1
      ) {
        continue;
      }

      const sizes = getSizes(product);
      const size = sizes.length ? item.size : null;

      if (sizes.length && !sizes.includes(size)) continue;

      const key = JSON.stringify([item.id, size]);
      const existing = merged.get(key);

      merged.set(key, {
        id: item.id,
        size,
        quantity: Math.min(
          99,
          (existing?.quantity || 0) + item.quantity
        )
      });
    }

    return [...merged.values()];
  } catch {
    return [];
  }
}

  let cart = readCart();
  let storageFailed = false;

  const cartButton = document.createElement("button");
  cartButton.type = "button";
  cartButton.className = "cart-trigger";
  cartButton.setAttribute("aria-haspopup", "dialog");
  cartButton.setAttribute("aria-controls", "gunstar-cart");

  const dialog = document.createElement("dialog");
  dialog.id = "gunstar-cart";
  dialog.className = "cart-panel";
  dialog.setAttribute("aria-labelledby", "cart-title");

  dialog.innerHTML = `
    <div class="cart-layout">
      <div class="cart-heading">
        <h2 id="cart-title">YOUR CART</h2>
        <button type="button" data-cart-close aria-label="Close cart">
          CLOSE ×
        </button>
      </div>

      <div class="cart-items"></div>

      <div class="cart-footer">
        <div class="cart-total" aria-live="polite"></div>
        <label for="cart-country">Shipping country</label>
        <select id="cart-country" required disabled>
          <option value="">Select your shipping country</option>
        </select>
        <button type="button" class="cart-checkout" disabled>
          CHECKOUT — COMING SOON
        </button>
        <p class="cart-status" role="status"></p>
      </div>
    </div>
  `;

  document.body.append(cartButton, dialog);

  const itemsContainer = dialog.querySelector(".cart-items");
  const totalContainer = dialog.querySelector(".cart-total");
  const status = dialog.querySelector(".cart-status");
  const checkoutButton = dialog.querySelector(".cart-checkout");
const countrySelect = dialog.querySelector("#cart-country");
let loadingCountries = false;
let checkoutPending = false;

async function loadCountries() {
  if (loadingCountries || countrySelect.options.length > 1) return;
  loadingCountries = true;
  try {
    const response = await fetch("/api/create-checkout-session.php?list=countries", {
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error();
    const { countries } = await response.json();
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    const options = countries.map(code => new Option(
      code === "FR" ? "France (metropolitan)" : names.of(code), code
    ));
    options.sort((a, b) => a.text.localeCompare(b.text, "en"));
    countrySelect.append(...options);
    render();
  } catch {
    status.textContent = "Shipping countries unavailable. Close and reopen the cart to retry.";
  } finally {
    loadingCountries = false;
  }
}
countrySelect.addEventListener("change", render);

const PENDING_KEY = "gunstar-pending-checkout-v2";
const cancelButton = document.createElement("button");
cancelButton.type = "button";
cancelButton.textContent = "CANCEL PENDING CHECKOUT";
cancelButton.hidden = true;
checkoutButton.after(cancelButton);

function randomKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)),
    byte => byte.toString(16).padStart(2, "0")).join("");
}

async function checkoutRequest(action) {
  if (checkoutPending || (action !== "cancel" && (!countrySelect.value || cart.length === 0))) return;
  checkoutPending = true;
  render();
  status.textContent = "";
  try {
    const country = countrySelect.value;
    const snapshot = JSON.stringify(cart);
    let pending = JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
    if (action !== "cancel" && (!pending || pending.cartSnapshot !== snapshot || pending.country !== country)) {
      pending = { requestKey: randomKey(), cartSnapshot: snapshot, country };
      // Persist BEFORE dispatch. A timeout/reload must reuse this identity.
      localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    }
    const bootstrap = await fetch("/api/create-checkout-session.php", {
      cache: "no-store", credentials: "same-origin", signal: AbortSignal.timeout(15000)
    });
    const security = await bootstrap.json();
    if (!bootstrap.ok) throw new Error(security.error || "Checkout unavailable.");
    const response = await fetch("/api/create-checkout-session.php", {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": security.csrf },
      signal: AbortSignal.timeout(90000),
      body: JSON.stringify(action === "cancel" ? { action: "cancel" } : {
        request_key: pending.requestKey,
        shipping_country: country,
        items: JSON.parse(snapshot).map(item => ({
          id: item.id, size: item.size ?? null, quantity: item.quantity
        }))
      })
    });
    const result = await response.json();
    if (!response.ok) {
      if (result.terminal) localStorage.removeItem(PENDING_KEY);
      throw new Error(result.error || "Checkout unavailable. Retry the same checkout.");
    }
    if (action === "cancel") {
      if (result.status === "released") {
        localStorage.removeItem(PENDING_KEY);
        status.textContent = "Pending checkout closed. You can now update your order.";
      } else {
        status.textContent = result.status === "paid"
          ? "This checkout is already paid. It cannot be cancelled here."
          : "Payment is processing. The reservation remains active.";
      }
      return;
    }
    const url = new URL(result.url);
    const stripe = url.protocol === "https:" && url.hostname === "checkout.stripe.com";
    const confirmation = url.origin === location.origin && url.pathname === "/checkout-return.html";
    if (!stripe && !confirmation) throw new Error("Invalid checkout URL.");
    const tracking = { token: result.tracking_token, cartSnapshot: snapshot,
      requestKey: result.request_key };
    // Persist across tabs/reloads; the token is only sent to our same-origin status endpoint.
    localStorage.setItem(`gunstar-checkout-${result.session_id}`, JSON.stringify(tracking));
    pending.requestKey = result.request_key;
    pending.sessionId = result.session_id;
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    window.location.assign(url.href);
  } catch (error) {
    status.textContent = error.name === "TimeoutError" || error.name === "AbortError"
      ? "Connection interrupted. Retry Checkout to resume the same payment."
      : error.message || "Checkout unavailable. Retry shortly.";
  } finally {
    checkoutPending = false;
    const notice = status.textContent;
    render();
    status.textContent = notice;
  }
}

function withCheckoutLock(action) {
  // Cross-tab serialization where supported; the server also serializes reservations.
  if (navigator.locks) {
    return navigator.locks.request("gunstar-checkout", { ifAvailable: true }, lock => {
      if (!lock) { status.textContent = "Checkout is open in another tab."; return; }
      return checkoutRequest(action);
    });
  }
  return checkoutRequest(action);
}
checkoutButton.addEventListener("click", () => withCheckoutLock("checkout"));
cancelButton.addEventListener("click", () => withCheckoutLock("cancel"));

  function openCart() {
    if (!dialog.open) dialog.showModal();
    loadCountries();
  }

  cartButton.addEventListener("click", openCart);

  dialog.querySelector("[data-cart-close]").addEventListener(
    "click",
    () => dialog.close()
  );

  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;

    const bounds = dialog.getBoundingClientRect();

    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    ) {
      dialog.close();
    }
  });

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      storageFailed = false;
    } catch {
      storageFailed = true;
    }

    render();
  }

  function makeButton(label, accessibleLabel, action, disabled = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-label", accessibleLabel);
    button.disabled = disabled || checkoutPending;
    button.addEventListener("click", action);
    return button;
  }

  function render() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartButton.textContent = `CART (${count})`;
    cartButton.setAttribute("aria-label", `Open cart, ${count} items`);

    itemsContainer.replaceChildren();

    if (!cart.length) {
      const empty = document.createElement("p");
      empty.textContent = "Your cart is empty.";
      itemsContainer.append(empty);
    }

    for (const item of cart) {
      const product = findProduct(item.id);
      const row = document.createElement("article");
      row.className = "cart-item";

      const name = document.createElement("a");
      name.href = `product.html?item=${encodeURIComponent(product.id)}`;
      name.textContent = item.size
        ? `${product.name} — ${item.size}`
        : product.name;

      const price = document.createElement("p");
      price.textContent = hasPrice(product)
        ? formatPrice(product.price * item.quantity)
        : "Price pending";

      const controls = document.createElement("div");
      controls.className = "cart-controls";

      const quantity = document.createElement("span");
      quantity.textContent = String(item.quantity);
      quantity.setAttribute("aria-label", `Quantity: ${item.quantity}`);

      controls.append(
        makeButton(
          "−",
          `Decrease quantity of ${product.name}`,
          () => {
            item.quantity -= 1;
            persist();
          },
          item.quantity <= 1
        ),
        quantity,
        makeButton(
          "+",
          `Increase quantity of ${product.name}`,
          () => {
            item.quantity += 1;
            persist();
          },
          item.quantity >= 99
        ),
        makeButton("REMOVE", `Remove ${product.name}`, () => {
          cart = cart.filter(entry =>
            !(entry.id === item.id && entry.size === item.size)
          );

          persist();
        })
      );

      row.append(name, price, controls);
      itemsContainer.append(row);
    }

    const allPricesKnown = cart.every(item =>
      hasPrice(findProduct(item.id))
    );

    const total = cart.reduce((sum, item) => {
      const product = findProduct(item.id);
      return sum + (hasPrice(product) ? product.price * item.quantity : 0);
    }, 0);

    totalContainer.textContent = allPricesKnown
      ? `SUBTOTAL — ${formatPrice(total)}`
      : "SUBTOTAL — Prices pending";

    status.textContent = storageFailed
      ? "Browser storage unavailable. This cart may be lost when you leave the page."
      : "Items in your cart are not reserved.";
    
    countrySelect.disabled = checkoutPending || countrySelect.options.length < 2 || cart.length === 0;
    checkoutButton.disabled = checkoutPending || cart.length === 0 || !countrySelect.value;
    cancelButton.disabled = checkoutPending;
    try { cancelButton.hidden = !localStorage.getItem(PENDING_KEY); }
    catch { cancelButton.hidden = true; }
    
    checkoutButton.textContent = checkoutPending
      ? "CONNECTING…"
      : "TEST CHECKOUT";
  }

  const currentProduct = findProduct(new URLSearchParams(location.search).get("item"));
  const productPrice = document.getElementById("product-price");
  if (productPrice && currentProduct?.purchasable) {
    productPrice.hidden = false;
    productPrice.textContent = hasPrice(currentProduct) ? formatPrice(currentProduct.price) : "PRICE COMING SOON";
  }

  const addButton = document.getElementById("add-to-cart");

  if (addButton) {
  const productId = new URLSearchParams(location.search).get("item");
  const product = findProduct(productId);

  const label = addButton.querySelector(".enquiry-btn__label");
  const sizes = product ? getSizes(product) : [];
  let size = sizes[0] ?? null;
  let quantity = 1;
  const available = Boolean(product?.purchasable);
  const field = document.getElementById("variant-field");
  const options = product?.displayOptions || sizes;
  field.hidden = !available || !options.length;
  document.getElementById("variant-label").textContent = sizes.length ? "Size" : "Capacity";
  const choices = document.getElementById("variant-options");
  for (const [index, option] of options.entries()) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option;
    button.disabled = sizes.length ? !sizes.includes(option) : index !== 0;
    button.setAttribute("aria-pressed", String(!button.disabled && (sizes.length ? option === size : index === 0)));
    button.addEventListener("click", () => {
      size = sizes.length ? option : null;
      for (const choice of choices.children) {
        choice.setAttribute("aria-pressed", String(choice === button));
      }
    });
    choices.append(button);
  }
  document.getElementById("shipping-note").hidden = !available;
  document.getElementById("quantity-control").hidden = !available;
  const less = document.getElementById("less");
  const more = document.getElementById("more");
  function setQuantity(value) {
    quantity = Math.max(1, Math.min(99, value));
    document.getElementById("units").value = quantity;
    less.disabled = quantity === 1;
    more.disabled = quantity === 99;
  }
  less.onclick = () => setQuantity(quantity - 1);
  more.onclick = () => setQuantity(quantity + 1);
  setQuantity(1);
  addButton.disabled = !available;
  label.textContent = available ? "BUY THIS ITEM" : "NOT AVAILABLE";

  addButton.addEventListener("click", () => {
    if (!available || checkoutPending) return;

    const existing = cart.find(item =>
      item.id === product.id && item.size === size
    );

    if (existing) {
      existing.quantity = Math.min(99, existing.quantity + quantity);
    } else {
      cart.push({
        id: product.id,
        size,
        quantity
      });
    }

    persist();
    openCart();
  });
}

  window.addEventListener("storage", event => {
    if (event.key === STORAGE_KEY || event.key === PENDING_KEY || event.key === null) {
      cart = readCart();
      render();
    }
  });

  render();
})();