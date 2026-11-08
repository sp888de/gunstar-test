(() => {
  'use strict';

  const PENDING_KEY = 'gunstar-pending-checkout-v2';
  const CART_KEY = 'gunstar-cart-v1';
  const status = document.getElementById('gs-checkout-status');
  const cancel = document.getElementById('gs-checkout-cancel');
  const mount = document.getElementById('gs-stripe-checkout');
  const endpoint = '/api/create-checkout-session.php';
  let pending;
  let csrf;
  let sessionId;
  let processing = false;

  const showError = (message) => {
    status.textContent = message;
    status.classList.add('gs-checkout-error');
    status.hidden = false;
  };

  async function getSecurity() {
    const response = await fetch(endpoint, { cache: 'no-store', credentials: 'same-origin' });
    const data = await response.json();
    if (!response.ok || !data.csrf) throw new Error(data.error || 'Checkout cannot connect.');
    return data.csrf;
  }

  async function requestCheckout() {
    const response = await fetch(endpoint, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify({ request_key: pending.requestKey, items: JSON.parse(pending.cartSnapshot) }),
      signal: AbortSignal.timeout(90000)
    });
    const data = await response.json();
    if (!response.ok) {
      if (data.terminal) localStorage.removeItem(PENDING_KEY);
      throw new Error(data.error || 'Unable to create checkout.');
    }
    sessionId = data.session_id;
    localStorage.setItem(`gunstar-checkout-${sessionId}`, JSON.stringify({
      token: data.tracking_token,
      cartSnapshot: pending.cartSnapshot,
      requestKey: data.request_key
    }));
    pending.sessionId = sessionId;
    pending.requestKey = data.request_key;
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    if (data.confirmation_url) {
      const destination = new URL(data.confirmation_url);
      if (destination.origin !== location.origin || destination.pathname !== '/checkout-return.html') {
        throw new Error('Invalid confirmation URL.');
      }
      location.replace(destination.href);
      return null;
    }
    if (!data.client_secret || !/^pk_test_[A-Za-z0-9]+$/.test(data.publishable_key)) {
      throw new Error('Stripe checkout configuration is incomplete.');
    }
    return data;
  }

  async function init() {
    try {
      pending = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
      const cart = localStorage.getItem(CART_KEY);
      if (!pending?.requestKey || !pending?.cartSnapshot || !cart) {
        throw new Error('No pending order. Return to the shop to start checkout.');
      }
      if (pending.cartSnapshot !== cart) {
        throw new Error('Cart changed while checkout was pending. Cancel the pending checkout before retrying.');
      }
      if (!window.Stripe) throw new Error('Stripe.js could not load.');
      csrf = await getSecurity();
      const result = await requestCheckout();
      if (!result) return;
      const stripe = Stripe(result.publishable_key);
      const checkout = await stripe.createEmbeddedCheckoutPage({
        fetchClientSecret: async () => result.client_secret
      });
      checkout.mount(mount);
      status.hidden = true;
    } catch (err) {
      showError(err?.message || 'Stripe checkout unavailable.');
    }
  }

  cancel.addEventListener('click', async () => {
    if (processing) return;
    processing = true;
    cancel.disabled = true;
    status.hidden = false;
    status.textContent = 'CLOSING CHECKOUT…';
    try {
      csrf ||= await getSecurity();
      const response = await fetch(endpoint, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ action: 'cancel' }),
        signal: AbortSignal.timeout(25000)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to close checkout.');
      if (result.status === 'released') {
        localStorage.removeItem(PENDING_KEY);
        location.assign('/galerie.html');
        return;
      }
      if (result.status === 'paid' && sessionId) {
        location.assign(`/checkout-return.html?session_id=${encodeURIComponent(sessionId)}`);
        return;
      }
      throw new Error('Payment processing. Do not retry payment until verification completes.');
    } catch (err) {
      showError(err?.message || 'Unable to close checkout.');
    } finally {
      processing = false;
      cancel.disabled = false;
    }
  });

  init();
})();
