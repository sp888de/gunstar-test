(() => {
  "use strict";

  const CART_KEY = "gunstar-cart-v1";

  const title = document.getElementById("confirmation-title");
  const message = document.getElementById("confirmation-message");
  const total = document.getElementById("confirmation-total");
  const retry = document.getElementById("confirmation-retry");

  const sessionId = new URLSearchParams(location.search)
    .get("session_id");

  if (!title || !message || !total || !retry) return;
  let tracking = null;
  let running = false;

  try {
    tracking = JSON.parse(
      localStorage.getItem(`gunstar-checkout-${sessionId}`)
      || sessionStorage.getItem(`gunstar-checkout-${sessionId}`)
    );
  } catch {
    tracking = null;
  }

  if (!sessionId || !tracking?.token) {
    title.textContent = "VERIFICATION UNAVAILABLE";
    message.textContent =
      "This browser cannot verify this checkout. This does not mean the payment failed.";
    return;
  }

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function checkPayment() {
    if (running) return;

    running = true;
    retry.hidden = true;
    title.textContent = "VERIFYING PAYMENT";
    message.textContent = "Waiting for payment confirmation.";

    try {
      for (let attempt = 0; attempt < 15; attempt++) {
        const response = await fetch("/api/order-status.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            session_id: sessionId,
            token: tracking.token
          }),
          signal: AbortSignal.timeout(10000)
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error("Verification unavailable.");
        }

        if (result.status === "released") {
          title.textContent = "CHECKOUT CLOSED";
          message.textContent = "This checkout expired or failed. Your cart has been kept.";
          const pending = JSON.parse(localStorage.getItem("gunstar-pending-checkout-v2") || "null");
          if (pending?.sessionId === sessionId) localStorage.removeItem("gunstar-pending-checkout-v2");
          return;
        }
        if (result.status === "paid") {
          title.textContent = "Thank you for choosing Gunstar, you are now awake";
          message.textContent =
            "Your test order has been recorded. No real payment was collected.";

          total.textContent = new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: result.currency.toUpperCase()
          }).format(result.amount_total / 100);

          // Ne pas effacer des articles ajoutés ou modifiés
          // depuis le lancement du paiement.
          if (!tracking.cartHandled) {
            try {
              const currentCart = localStorage.getItem(CART_KEY);

              if (currentCart === tracking.cartSnapshot) {
                localStorage.removeItem(CART_KEY);
              }

              const pending = JSON.parse(localStorage.getItem("gunstar-pending-checkout-v2") || "null");
              if (pending?.sessionId === sessionId ||
                  (tracking.requestKey && pending?.requestKey === tracking.requestKey)) {
                localStorage.removeItem("gunstar-pending-checkout-v2");
              }
              tracking.cartHandled = true;

              localStorage.setItem(
                `gunstar-checkout-${sessionId}`,
                JSON.stringify(tracking)
              );
            } catch {
              message.textContent +=
                " Your cart could not be updated automatically.";
            }
          }

          return;
        }

        if (attempt < 14) {
          await wait(2000);
        }
      }

      title.textContent = "CONFIRMATION PENDING";
      message.textContent =
        "Your payment has not yet been confirmed by our server. Do not pay again. Check again shortly.";
      retry.hidden = false;

    } catch {
      title.textContent = "VERIFICATION UNAVAILABLE";
      message.textContent =
        "We could not verify your payment right now. Do not pay again. Check again shortly.";
      retry.hidden = false;

    } finally {
      running = false;
    }
  }

  retry.addEventListener("click", checkPayment);
  checkPayment();
})();