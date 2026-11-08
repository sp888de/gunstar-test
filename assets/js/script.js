// =========================================================
// GUNSTAR — script.js
// Shared behaviors: mobile nav, scroll reveal, gallery filters,
// product page rendering (thumbnails + accordion), contact form.
// =========================================================

// Le portail s'exécute immédiatement (avant DOMContentLoaded) :
// ce script est chargé en fin de <body>, donc le DOM est déjà
// disponible, et style.css masque déjà tout le contenu tant que
// <html> n'a pas la classe .gate-open — voir "Site-wide password
// gate" dans style.css. Ça évite un flash du contenu protégé.
document.documentElement.classList.add('gate-open');

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initReveal();
  initGalleryFilters();
  initProductPage();
  initContactForm();
  initGunstarTerminal();
  initWallpaperPage();
});

/* ---------- Portail mot de passe (toutes les pages) ---------- */
/* Le mot de passe se change ici. La protection reste côté client :
   n'importe qui peut lire ce fichier .js publiquement sur
   GitHub Pages et y trouver le mot de passe en clair — ce portail
   empêche un visiteur ordinaire de voir le site, pas un
   utilisateur technique motivé. Pour une vraie protection,
   il faudrait héberger le site derrière une authentification
   côté serveur (ex. Cloudflare Access, Netlify password protect). */
function initGunstarGate() {
  const PASSWORD = '$GUNSTARISATION$';
  const STORAGE_KEY = 'gunstar-site-unlocked';
  const html = document.documentElement;

  let unlocked = false;
  try {
    unlocked = sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch (error) {
    unlocked = false;
  }

  if (unlocked) {
    html.classList.add('gate-open');
    return;
  }

  const gate = document.createElement('div');
  gate.className = 'gunstar-gate';
  gate.innerHTML = [
    '<div class="gunstar-gate__panel">',
    '  <div class="gunstar-gate__lights"><i></i><i></i><i></i></div>',
    '  <p class="gunstar-gate__eyebrow">GUNSTAR // RESTRICTED</p>',
    '  <h1>ACCESS LOCKED</h1>',
    '  <p class="gunstar-gate__hint">Enter password to continue.</p>',
    '  <form class="gunstar-gate__form" data-gate-form>',
    '    <span>&gt;</span>',
    '    <input type="password" data-gate-input autocomplete="off" spellcheck="false" placeholder="PASSWORD" aria-label="Mot de passe">',
    '    <button type="submit">UNLOCK</button>',
    '  </form>',
    '  <p class="gunstar-gate__error" data-gate-error hidden>ACCESS DENIED — INCORRECT PASSWORD</p>',
    '</div>'
  ].join('');

  document.body.appendChild(gate);

  const form = gate.querySelector('[data-gate-form]');
  const input = gate.querySelector('[data-gate-input]');
  const error = gate.querySelector('[data-gate-error]');

  window.setTimeout(() => input.focus({ preventScroll: true }), 50);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value.trim();

    if (value !== '' && value.toUpperCase() === PASSWORD.toUpperCase()) {
      try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (error) { /* stockage indisponible : le portail réapparaîtra au rechargement */ }
      html.classList.add('gate-open');
      gate.remove();
      return;
    }

    error.hidden = false;
    input.value = '';
    input.focus({ preventScroll: true });
    gate.classList.add('is-shake');
    window.setTimeout(() => gate.classList.remove('is-shake'), 350);
  });
}

/* ---------- Mobile navigation ---------- */
function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ---------- Reveal on scroll ---------- */
function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  items.forEach(el => observer.observe(el));
}

/* ---------- Gallery filters ---------- */
/* Each .catalog-item is a plain <a> pointing to product.html,
   so this only needs to handle show/hide filtering. */
function initGalleryFilters() {
  const grid = document.querySelector('[data-gallery]');
  if (!grid) return;

  const cards = Array.from(grid.querySelectorAll('.catalog-item'));
  const filterButtons = Array.from(document.querySelectorAll('.catalog-filters button'));
  const storageKey = 'gunstar-unlocked-archives';
  // Catégories qui exigent de réussir un protocole avant d'être cliquables en ALL.
  const gatedCategories = ['mercenary', 'business', 'hacker'];
  let unlockedArchives = new Set();

  // La progression ne dure que pendant la session du navigateur.
  try {
    const storedArchives = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
    unlockedArchives = new Set(Array.isArray(storedArchives) ? storedArchives : []);
  } catch (error) {
    unlockedArchives = new Set();
  }

  function markArchiveUnlocked(filter) {
    const button = filterButtons.find(item => item.dataset.filter === filter);
    if (!button) return;
    button.classList.add('is-unlocked');
    const marker = button.querySelector('.filter-lock');
    if (marker) marker.textContent = '○';
  }

function applyFilter(filter) {
  filterButtons.forEach(button => {
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.filter === filter)
    );
  });

  cards.forEach(card => {
    const category = card.dataset.category;
    const show =
      filter === 'all' ||
      filter === category;

    card.style.display = show ? '' : 'none';

    // Verrouillé seulement en ALL, seulement si sa catégorie exige
    // un protocole, et seulement tant que ce protocole n'est pas résolu.
    const lockedInAll =
      filter === 'all' &&
      gatedCategories.includes(category) &&
      !unlockedArchives.has(category);

    card.classList.toggle(
      'is-locked-in-all',
      lockedInAll
    );

    card.setAttribute(
      'aria-disabled',
      String(lockedInAll)
    );

    // Impossible de sélectionner une vignette avec Tab
    // lorsqu'on est dans ALL.
    card.tabIndex = lockedInAll ? -1 : 0;

    // Bloque le clic souris dans ALL sans supprimer
    // la vignette de la page.
    card.style.pointerEvents = lockedInAll ? 'none' : '';
  });
}
  
  unlockedArchives.forEach(markArchiveUnlocked);

  // Applique le verrouillage dès le chargement de la page,
  // pas seulement après un clic sur un filtre.
  applyFilter('all');

  const gate = initAccessGate((filter) => {
    unlockedArchives.add(filter);
    markArchiveUnlocked(filter);

    try {
      sessionStorage.setItem(storageKey, JSON.stringify(Array.from(unlockedArchives)));
    } catch (error) {
      // Le filtre reste déverrouillé pour la page courante si le stockage est bloqué.
    }

    applyFilter(filter);
  });

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      if (filter === 'all' || unlockedArchives.has(filter) || !gate) {
        applyFilter(filter);
        return;
      }

      gate.open(filter, btn);
    });
  });
}

/* ---------- Protocoles d'accès aux archives ---------- */
function initAccessGate(onUnlocked) {
  const root = document.getElementById('access-gate');
  if (!root) return null;

  const challenges = Array.from(root.querySelectorAll('[data-challenge]'));
  const closeButton = root.querySelector('[data-gate-close]');
  const gateTitle = root.querySelector('#gate-title');
  const gateCode = root.querySelector('[data-gate-code]');
  const successScreen = root.querySelector('[data-gate-success]');
  const successLabel = root.querySelector('[data-success-label]');
  const protocolNames = {
    mercenary: { title: 'MERCENARY CLEARANCE', code: 'NODE // 101', label: 'MERCENARY ARCHIVE UNLOCKED' },
    business: { title: 'BUSINESS CLEARANCE', code: 'NODE // 110', label: 'BUSINESS ARCHIVE UNLOCKED' },
    hacker: { title: 'HACKER CLEARANCE', code: 'NODE // 100', label: 'HACKER ARCHIVE UNLOCKED' }
  };

  let activeProtocol = null;
  let returnFocus = null;
  let closeTimer = null;
  let timers = [];
  let businessWinner = null;
  let businessReady = false;
  let hackerAttempts = 0;

  function schedule(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    timers.push(timer);
    return timer;
  }

  function clearTimers() {
    timers.forEach(timer => window.clearTimeout(timer));
    timers = [];
  }

  function setChallengeVisible(protocol) {
    challenges.forEach(challenge => {
      challenge.hidden = challenge.dataset.challenge !== protocol;
    });
  }

  function open(protocol, trigger) {
    const definition = protocolNames[protocol];
    if (!definition) return;

    window.clearTimeout(closeTimer);
    clearTimers();
    activeProtocol = protocol;
    returnFocus = trigger;
    root.hidden = false;
    root.classList.remove('is-granted');
    successScreen.hidden = true;
    setChallengeVisible(protocol);
    gateTitle.textContent = definition.title;
    gateCode.textContent = definition.code;
    document.body.classList.add('gate-open');

    window.requestAnimationFrame(() => root.classList.add('is-active'));

    if (protocol === 'mercenary') resetMercenaryProtocol();
    if (protocol === 'business') resetBusinessProtocol();
    if (protocol === 'hacker') resetHackerProtocol();

    closeButton.focus({ preventScroll: true });
  }

  function close() {
    if (root.hidden) return;
    clearTimers();
    activeProtocol = null;
    businessReady = false;
    root.classList.remove('is-active', 'is-granted');
    document.body.classList.remove('gate-open');
    closeTimer = window.setTimeout(() => {
      root.hidden = true;
      successScreen.hidden = true;
      challenges.forEach(challenge => { challenge.hidden = true; });
    }, 260);

    if (returnFocus) returnFocus.focus({ preventScroll: true });
  }

  function grantAccess(protocol) {
    if (activeProtocol !== protocol) return;
    const definition = protocolNames[protocol];
    clearTimers();
    root.classList.add('is-granted');
    setChallengeVisible('__success__');
    successScreen.hidden = false;
    successLabel.textContent = definition.label;
    gateTitle.textContent = 'CLEARANCE VERIFIED';
    onUnlocked(protocol);
    schedule(close, 1450);
  }

  // Le contrat exige un alias et un consentement avant la lecture biométrique.
  const aliasInput = root.querySelector('[data-operative-alias]');
  const consentInput = root.querySelector('[data-contract-consent]');
  const signButton = root.querySelector('[data-mercenary-sign]');
  const signatureStatus = root.querySelector('[data-signature-status]');
  const signatureState = signButton.querySelector('.signature-state');

  function updateSignatureAvailability() {
    const ready = aliasInput.value.trim().length >= 2 && consentInput.checked;
    signButton.disabled = !ready;
    signatureStatus.textContent = ready
      ? 'Scanner ready. Place fingerprint to sign.'
      : 'Complete the record to enable scanner.';
  }

  function resetMercenaryProtocol() {
    aliasInput.value = '';
    consentInput.checked = false;
    signButton.disabled = true;
    signButton.classList.remove('is-scanning', 'is-signed');
    signatureState.textContent = '[ PENDING ]';
    signatureStatus.textContent = 'Complete the record to enable scanner.';
    schedule(() => aliasInput.focus({ preventScroll: true }), 320);
  }

  aliasInput.addEventListener('input', updateSignatureAvailability);
  consentInput.addEventListener('change', updateSignatureAvailability);
  signButton.addEventListener('click', () => {
    if (signButton.disabled || activeProtocol !== 'mercenary') return;
    signButton.disabled = true;
    signButton.classList.add('is-scanning');
    signatureState.textContent = '[ SCANNING ]';
    signatureStatus.textContent = 'Capturing biometric signature...';

    schedule(() => {
      signButton.classList.remove('is-scanning');
      signButton.classList.add('is-signed');
      signatureState.textContent = '[ SIGNED ]';
      signatureStatus.textContent = `Operative ${aliasInput.value.trim().toUpperCase()} authenticated.`;
    }, 1050);
    schedule(() => grantAccess('mercenary'), 1900);
  });

  // Les mallettes conservent leur identité pendant que leur ordre visuel change.
  const caseBoard = root.querySelector('[data-case-board]');
  const caseButtons = Array.from(caseBoard.querySelectorAll('.case-choice'));
  const businessStatus = root.querySelector('[data-business-status]');

  function randomizeOrder(items) {
    const next = items.slice();
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
  }

  function moveCases() {
    const current = Array.from(caseBoard.children);
    let next = randomizeOrder(current);
    if (next.every((item, index) => item === current[index])) next = [current[1], current[2], current[0]];

    const firstPositions = new Map(current.map(item => [item, item.getBoundingClientRect()]));
    next.forEach(item => caseBoard.appendChild(item));

    next.forEach(item => {
      const first = firstPositions.get(item);
      const last = item.getBoundingClientRect();
      const deltaX = first.left - last.left;
      const deltaY = first.top - last.top;
      if (typeof item.animate === 'function') {
        item.animate(
          [
            { transform: `translate(${deltaX}px, ${deltaY}px) rotate(-2deg)` },
            { transform: 'translate(0, 0) rotate(0deg)' }
          ],
          { duration: 470, easing: 'cubic-bezier(.2,.85,.25,1)' }
        );
      }
    });
  }

  function shuffleBusinessCases(remainingMoves) {
    if (activeProtocol !== 'business') return;
    moveCases();

    if (remainingMoves > 1) {
      schedule(() => shuffleBusinessCases(remainingMoves - 1), 520);
      return;
    }

    schedule(() => {
      businessReady = true;
      caseBoard.classList.remove('is-shuffling');
      caseButtons.forEach(button => { button.disabled = false; });
      businessStatus.textContent = 'TRANSACTION LIVE // SELECT THE ASSET';
    }, 520);
  }

  function resetBusinessProtocol() {
    businessReady = false;
    caseBoard.classList.remove('is-shuffling');
    caseButtons.forEach(button => {
      button.disabled = true;
      button.classList.remove('is-open', 'has-money', 'is-correct', 'is-wrong');
      button.querySelector('.case-result').textContent = 'SELECT';
    });

    businessWinner = caseButtons[Math.floor(Math.random() * caseButtons.length)];
    businessWinner.classList.add('has-money');
    businessStatus.textContent = 'VERIFYING ASSET...';

    schedule(() => {
      caseButtons.forEach(button => button.classList.add('is-open'));
      businessStatus.textContent = 'MEMORIZE THE ASSET LOCATION';
    }, 420);
    schedule(() => {
      caseButtons.forEach(button => button.classList.remove('is-open'));
      businessStatus.textContent = 'CASES SEALED // TRACK THE EXCHANGE';
    }, 1550);
    schedule(() => {
      caseBoard.classList.add('is-shuffling');
      shuffleBusinessCases(6);
    }, 2050);
  }

  caseButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (!businessReady || activeProtocol !== 'business') return;
      businessReady = false;
      caseButtons.forEach(item => { item.disabled = true; });
      button.classList.add('is-open');

      if (button === businessWinner) {
        button.classList.add('is-correct');
        button.querySelector('.case-result').textContent = 'ASSET SECURED';
        businessStatus.textContent = 'CORRECT CASE // TRANSACTION APPROVED';
        schedule(() => grantAccess('business'), 1150);
        return;
      }

      button.classList.add('is-wrong');
      button.querySelector('.case-result').textContent = 'EMPTY';
      businessStatus.textContent = 'EMPTY CASE // TRANSACTION REJECTED';
      schedule(() => {
        businessWinner.classList.add('is-open', 'is-correct');
        businessWinner.querySelector('.case-result').textContent = 'ASSET WAS HERE';
      }, 450);
      schedule(resetBusinessProtocol, 1800);
    });
  });

  // Le terminal accepte la réponse claire ainsi que deux commandes utilitaires.
  const terminalLog = root.querySelector('[data-terminal-log]');
  const terminalForm = root.querySelector('[data-terminal-form]');
  const terminalInput = root.querySelector('[data-terminal-input]');

  function appendTerminalLine(message, tone = '') {
    const line = document.createElement('p');
    if (tone) line.className = `terminal-line--${tone}`;
    line.textContent = message;
    terminalLog.appendChild(line);
    terminalLog.scrollTop = terminalLog.scrollHeight;
  }

  function showHackerHint() {
    appendTerminalLine('[HINT] Move every encrypted letter three positions backward.', 'hint');
    appendTerminalLine('[EXAMPLE] D → A // X → U', 'hint');
  }

  function resetHackerProtocol() {
    hackerAttempts = 0;
    terminalLog.innerHTML = '';
    terminalInput.value = '';
    terminalInput.disabled = false;
    appendTerminalLine('[BOOT] GUNSTAR BLACKNODE v1.0.0');
    appendTerminalLine('[OK] Secure tunnel established. Trace masked.');
    appendTerminalLine('[WARN] Encrypted payload recovered from archive sector 100.', 'warning');
    appendTerminalLine('[TASK] Reverse the cipher and submit plaintext.');
    schedule(() => terminalInput.focus({ preventScroll: true }), 320);
  }

  terminalForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (activeProtocol !== 'hacker') return;
    const command = terminalInput.value.trim().toUpperCase();
    if (!command) return;

    appendTerminalLine(`root@blacknode:~$ ${terminalInput.value.trim()}`, 'command');
    terminalInput.value = '';

    if (command === 'HELP' || command === 'HINT') {
      showHackerHint();
      return;
    }

    if (command === 'GUNSTAR') {
      terminalInput.disabled = true;
      appendTerminalLine('[OK] PLAINTEXT TOKEN ACCEPTED.', 'success');
      appendTerminalLine('[OK] HASH MATCH // f31c:100:7a9e', 'success');
      appendTerminalLine('[ROOT] Vault permissions elevated.', 'success');
      schedule(() => grantAccess('hacker'), 1250);
      return;
    }

    hackerAttempts += 1;
    appendTerminalLine(`[ERROR] HASH MISMATCH // ATTEMPT ${String(hackerAttempts).padStart(2, '0')}`, 'error');
    if (hackerAttempts === 3) showHackerHint();
  });

  root.querySelectorAll('[data-terminal-command]').forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.terminalCommand === 'hint') showHackerHint();
      if (button.dataset.terminalCommand === 'clear') terminalLog.innerHTML = '';
      terminalInput.focus({ preventScroll: true });
    });
  });

  closeButton.addEventListener('click', close);
  root.addEventListener('click', (event) => {
    if (event.target === root) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !root.hidden) close();
  });

  return { open, close };
}

/* ---------- Product page ---------- */
/* Reads ?item=<id> from the URL, looks it up in GUNSTAR_PRODUCTS
   (see products-data.js), builds the thumbnail column, shows the
   first media by default, and fills in the info + accordion. */
function initProductPage() {
  const root = document.getElementById('product-root');
  if (!root || typeof GUNSTAR_PRODUCTS === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('item');
  const product = GUNSTAR_PRODUCTS.find(p => p.id === id) || GUNSTAR_PRODUCTS[0];
  if (!product) return;

  document.title = `${product.name} — GUNSTAR`;

  document.getElementById('product-index').textContent = product.tag;
  document.getElementById('product-category').textContent = product.category;
  document.getElementById('product-title').textContent = product.name;
  document.getElementById('product-description').innerHTML = product.description;
  document.getElementById('product-delivery').textContent = product.delivery || '';
  document.getElementById('product-terms').textContent = product.terms || '';

  const detailsList = document.getElementById('product-details');
  detailsList.innerHTML = '';
  product.details.forEach(([label, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    detailsList.appendChild(dt);
    detailsList.appendChild(dd);
  });

  renderProductSizes(product);
  renderProductGallery(product);
}

/* Size options shown only for products that define sizes. */
function renderProductSizes(product) {
  const container = document.getElementById('product-sizes');
  if (!container) return;

  container.replaceChildren();
  delete container.dataset.selectedSize;
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  container.hidden = sizes.length === 0;
  if (!sizes.length) return;

  const label = document.createElement('p');
  label.className = 'product-sizes__label';
  label.textContent = 'SELECT SIZE';
  container.appendChild(label);

  const choices = document.createElement('div');
  choices.className = 'product-sizes__choices';
  choices.setAttribute('role', 'group');
  choices.setAttribute('aria-label', `Size for ${product.name}`);
  container.appendChild(choices);

  sizes.forEach(size => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'product-size-btn';
    button.textContent = size;
    button.dataset.size = size;
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => {
      choices.querySelectorAll('.product-size-btn').forEach(other => {
        const selected = other === button;
        other.classList.toggle('is-selected', selected);
        other.setAttribute('aria-pressed', String(selected));
      });
      container.dataset.selectedSize = size;
    });
    choices.appendChild(button);
  });
}

function renderProductGallery(product) {
  const thumbsWrap = document.getElementById('product-thumbs');
  const slot = document.getElementById('product-media-slot');
  if (!thumbsWrap || !slot) return;

  thumbsWrap.innerHTML = '';

   // Limiter l’enregistrement rapide des médias produits
  const gallery = document.querySelector('#product-root .product-gallery');

  if (gallery) {
    ['contextmenu', 'dragstart'].forEach((eventName) => {
      gallery.addEventListener(eventName, (event) => {
        if (event.target.closest('img, video')) {
          event.preventDefault();
        }
      });
    });
  }
  
  function showMedia(item) {
    slot.innerHTML = '';
    let el;
    if (item.type === 'video') {
      el = document.createElement('video');
      el.src = item.src;
      el.autoplay = true;
      el.muted = true;
      el.loop = true;
      el.playsInline = true;
      el.controls = false; // lets the visitor unmute / pause manually
    } else {
      el = document.createElement('img');
      el.src = item.src;
      el.alt = product.name;
    }
    slot.appendChild(el);
  }

  // Build one thumbnail per media entry (only needed if there is more than one)
  if (product.media.length > 1) {
    product.media.forEach((item, index) => {
      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = 'product-gallery__thumb' + (index === 0 ? ' is-active' : '');
      thumb.setAttribute('aria-label', `View ${product.name} — image ${index + 1}`);

      let thumbEl;
      if (item.type === 'video') {
        thumbEl = document.createElement('video');
        thumbEl.src = item.src;
        thumbEl.muted = true;
        thumbEl.playsInline = true;
      } else {
        thumbEl = document.createElement('img');
        thumbEl.src = item.src;
        thumbEl.alt = '';
      }
      thumb.appendChild(thumbEl);

      thumb.addEventListener('click', () => {
        thumbsWrap.querySelectorAll('.product-gallery__thumb').forEach(t => t.classList.remove('is-active'));
        thumb.classList.add('is-active');
        showMedia(item);
      });

      thumbsWrap.appendChild(thumb);
    });
  }

  showMedia(product.media[0]);
}

/* ---------- Contact form (mailto, no backend) ---------- */
/* ---------- Formulaire de contact (envoi via Formspree) ---------- */
/* Endpoint Formspree relié à contact@gunstar.world. Envoi en AJAX :
   le visiteur ne quitte jamais la page, un message de statut
   s'affiche à la place du mailto: précédent. */
function initContactForm() {
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;

  const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xyegapop';
  const submitBtn = form.querySelector('button[type="submit"]');
  const submitLabel = submitBtn ? submitBtn.textContent : '';

  let status = form.querySelector('[data-form-status]');
  if (!status) {
    status = document.createElement('p');
    status.setAttribute('data-form-status', '');
    status.className = 'form-status';
    status.hidden = true;
    form.appendChild(status);
  }

  function setStatus(text, kind) {
    status.textContent = text;
    status.hidden = false;
    status.className = `form-status form-status--${kind}`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending…';
    }
    status.hidden = true;

    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      });

      if (response.ok) {
        setStatus('Message sent — GUNSTAR will get back to you.', 'success');
        form.reset();
      } else {
        const data = await response.json().catch(() => null);
        const detail = data && data.errors ? data.errors.map(err => err.message).join(', ') : null;
        setStatus(detail || 'Something went wrong. Please try again.', 'error');
      }
    } catch (error) {
      setStatus('Network error — please try again.', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitLabel;
      }
    }
  });
}

/* ---------- Terminal GUNSTAR (page À propos) ---------- */
/* Terminal fonctionnel à commandes restreintes : seules les entrées
   listées dans RESPONSES produisent une réponse. STRASBOURG est une
   commande cachée volontairement absente de HELP. */
function initGunstarTerminal() {
  const root = document.querySelector('[data-gunstar-terminal]');
  if (!root) return;

  const log = root.querySelector('[data-gunstar-log]');
  const form = root.querySelector('[data-gunstar-form]');
  const input = root.querySelector('[data-gunstar-input]');
  if (!log || !form || !input) return;

  function printLine(text, className = '') {
    const line = document.createElement('p');
    if (className) line.className = className;
    line.textContent = text;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  function printLines(lines, className = '') {
    lines.forEach(text => printLine(text, className));
  }

  // Commandes reconnues. Clés déjà normalisées (majuscules, espace unique).
  const RESPONSES = {
    HELP: () => printLines([
      'AVAILABLE COMMANDS:',
      'LOCATION',
      'MERCENARY',
      'HACKER',
      'BUSINESS MAN'
    ], 'is-muted'),

    LOCATION: () => printLine('48.873784, 2.350864'),

    MERCENARY: () => printLines([
      'Congratulations — a mission has been given to the mercenary.',
      'Please note this code: 101000025.',
      'It could be useful in a short time.'
    ]),

    HACKER: () => printLines([
      '<<< THANK YOU >>>',
      '<<< CODE : 100111125 >>>',
      '<<< END OF TRANSMISSION >>>'
    ]),

    'BUSINESS MAN': () => printLine('Now please do the math: 25 x 2002 x 11 = ???'),

    // Réponse à l'énigme "BUSINESS MAN" — volontairement absente de HELP.
    '550550': () => printLine("You're good, try to invest with this code on the stock market: 11000002000$"),

    // Commande secrète — volontairement absente de HELP.
    STRASBOURG: () => printLines([
      "Bravo d'avoir trouvé cette commande, tu es eveillé et fais partie intégrante de l'univers GUNSTAR.",
      'Pour ça tu obtiens un VIP ACCESS TOKEN.',
      'Collectionne-les tous pour obtenir une grosse récompense !!'
    ], 'is-command'),

    CLEAR: () => { log.innerHTML = ''; }
  };

  function resolveKey(rawValue) {
    const normalized = rawValue.toUpperCase().replace(/\s+/g, ' ').trim();
    if (normalized === 'BUSINESSMAN') return 'BUSINESS MAN';
    return normalized;
  }

  printLine('GUNSTAR SYSTEM TERMINAL v1.0', 'is-muted');
  printLine('Type HELP to list available commands.', 'is-muted');

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const raw = input.value.trim();
    if (!raw) return;

    printLine(`> ${raw}`, 'is-command');
    input.value = '';

    const key = resolveKey(raw);
    const respond = RESPONSES[key];

    if (respond) {
      respond();
    } else {
      printLine('ERROR // COMMAND NOT FOUND. Type HELP for available commands.', 'is-error');
    }

    input.focus({ preventScroll: true });
  });
}

/* ---------- Wallpaper // System (wallpaper.html) ---------- */
function initWallpaperPage() {
  const root = document.getElementById('wallpaper-root');
  if (!root || typeof GUNSTAR_WALLPAPERS === 'undefined' || !GUNSTAR_WALLPAPERS.length) return;

  const files = GUNSTAR_WALLPAPERS;
  const SCAN_DURATION = 1800; // ms — durée du maintien requis

  const introCount = document.getElementById('wallpaper-count');
  const enterBtn = document.getElementById('wallpaper-enter');
  const introStatus = document.getElementById('wallpaper-status');
  const introStatusText = document.getElementById('wallpaper-status-text');
  const introProgressBar = document.getElementById('wallpaper-progress-bar');
  const introSection = document.getElementById('wallpaper-intro');
  const viewerSection = document.getElementById('wallpaper-viewer');

  const fileCounterTop = document.getElementById('wallpaper-file-counter');
  const frame = document.getElementById('wallpaper-frame');
  const img = document.getElementById('wallpaper-image');
  const scanline = document.getElementById('wallpaper-scanline');
  const metaList = document.getElementById('wallpaper-meta');

  const scanBtn = document.getElementById('wallpaper-scan-btn');
  const scanLabel = document.getElementById('wallpaper-scan-label');
  const scanProgress = document.getElementById('wallpaper-scan-progress');
  const scanBar = document.getElementById('wallpaper-scan-bar');
  const scanPercent = document.getElementById('wallpaper-scan-percent');
  const downloadBtn = document.getElementById('wallpaper-download');

  const prevBtn = document.getElementById('wallpaper-prev');
  const nextBtn = document.getElementById('wallpaper-next');
  const counter = document.getElementById('wallpaper-counter');

  introCount.textContent = `${files.length} FILE${files.length > 1 ? 'S' : ''} DETECTED.`;

  let currentIndex = 0;
  let scanning = false;
  let scanFrame = null;
  const verified = new Set(); // fichiers déjà scannés cette session

  function pad(n) { return String(n).padStart(2, '0'); }

  // Les champs affichés dépendent de ce qui existe réellement dans
  // le dataset — on n'invente jamais une donnée absente.
  function metaFieldsFor(file) {
    const fields = [];
    if (file.division) fields.push(['DIVISION', file.division]);
    if (file.format) fields.push(['FORMAT', file.format]);
    fields.push(['STATUS', null]); // rempli séparément, jamais masqué
    return fields;
  }

  function renderWallpaper(index, direction) {
    const file = files[index];
    const isVerified = verified.has(file.id);

    const swap = () => {
      img.src = file.src;
      img.alt = file.name;

      fileCounterTop.textContent = `FILE ${pad(index + 1)} / ${pad(files.length)}`;
      counter.textContent = `${pad(index + 1)} / ${pad(files.length)}`;

      const fields = metaFieldsFor(file);
      metaList.innerHTML = fields.map(([label, value]) => {
        if (label === 'STATUS') {
          return `<dt>STATUS</dt><dd data-field="status" class="${isVerified ? 'is-verified-value' : ''}">${isVerified ? 'VERIFIED' : 'UNVERIFIED'}</dd>`;
        }
        return `<dt>${label}</dt><dd data-masked="${!isVerified}">${isVerified ? value : '████████'}</dd>`;
      }).join('');

      resetScanUI(isVerified);
      frame.classList.remove('is-transitioning');
    };

    if (direction) {
      frame.classList.add('is-transitioning');
      window.setTimeout(swap, 160);
    } else {
      swap();
    }

    // Précharge discrètement le fichier suivant et précédent.
    [1, -1].forEach(delta => {
      const neighbor = files[(index + delta + files.length) % files.length];
      if (neighbor) new Image().src = neighbor.src;
    });
  }

  function resetScanUI(isVerified) {
    scanning = false;
    if (scanFrame) cancelAnimationFrame(scanFrame);
    scanline.hidden = true;
    scanline.classList.remove('is-active');
    scanProgress.hidden = true;
    scanBar.style.width = '0%';
    scanPercent.textContent = '0%';

    if (isVerified) {
      scanBtn.hidden = true;
      downloadBtn.hidden = false;
      const file = files[currentIndex];
      downloadBtn.href = file.src;
      downloadBtn.download = `${file.name}.jpg`;
    } else {
      scanBtn.hidden = false;
      scanBtn.classList.remove('is-verified');
      scanLabel.textContent = 'HOLD TO SCAN';
      downloadBtn.hidden = true;
    }
  }

  function go(delta) {
    currentIndex = (currentIndex + delta + files.length) % files.length;
    renderWallpaper(currentIndex, delta);
  }

  // ---------- Enter archive ----------
  enterBtn.addEventListener('click', () => {
    enterBtn.hidden = true;
    introStatus.hidden = false;
    introStatusText.textContent = 'INITIALIZING...';
    introStatusText.classList.remove('is-success');
    introProgressBar.style.width = '0%';

    const start = performance.now();
    const DURATION = 700;

    function tick(now) {
      const pct = Math.min(100, ((now - start) / DURATION) * 100);
      introProgressBar.style.width = `${pct}%`;
      if (pct < 100) {
        requestAnimationFrame(tick);
      } else {
        introStatusText.textContent = 'ACCESS GRANTED';
        introStatusText.classList.add('is-success');
        window.setTimeout(() => {
          introSection.hidden = true;
          viewerSection.hidden = false;
          renderWallpaper(currentIndex);
        }, 260);
      }
    }
    requestAnimationFrame(tick);
  });

  // ---------- Prev / Next ----------
  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));

  document.addEventListener('keydown', (e) => {
    if (viewerSection.hidden) return;
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  });

  // ---------- Swipe (mobile) ----------
  let touchStartX = null;
  frame.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  frame.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1);
    touchStartX = null;
  }, { passive: true });

  // ---------- Hold to scan ----------
  function startScan() {
    const file = files[currentIndex];
    if (verified.has(file.id) || scanning) return;

    scanning = true;
    scanBtn.classList.add('is-scanning');
    scanLabel.textContent = 'SCANNING FILE';
    scanProgress.hidden = false;
    scanline.hidden = false;
    scanline.classList.add('is-active');
    scanline.style.animationDuration = `${SCAN_DURATION}ms`;

    const maskedFields = Array.from(metaList.querySelectorAll('dd[data-masked="true"]'));
    const start = performance.now();

    function tick(now) {
      if (!scanning) return;
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / SCAN_DURATION) * 100);
      scanBar.style.width = `${pct}%`;
      scanPercent.textContent = `${Math.floor(pct)}%`;

      // Révèle les champs masqués progressivement.
      const revealCount = Math.floor((pct / 100) * maskedFields.length);
      maskedFields.forEach((el, i) => {
        if (i < revealCount) {
          const file = files[currentIndex];
          const label = el.previousElementSibling ? el.previousElementSibling.textContent : '';
          if (label === 'DIVISION') el.textContent = file.division || '';
          if (label === 'FORMAT') el.textContent = file.format || '';
          el.dataset.masked = 'false';
          el.classList.add('is-revealed');
        }
      });

      if (pct >= 100) {
        completeScan(file);
      } else {
        scanFrame = requestAnimationFrame(tick);
      }
    }
    scanFrame = requestAnimationFrame(tick);
  }

  function completeScan(file) {
    scanning = false;
    verified.add(file.id);
    scanline.classList.remove('is-active');
    scanline.hidden = true;

    const statusField = metaList.querySelector('dd[data-field="status"]');
    scanLabel.textContent = 'SCAN COMPLETE';

    window.setTimeout(() => {
      if (statusField) {
        statusField.textContent = 'VERIFIED';
        statusField.classList.add('is-verified-value');
      }
      scanBtn.hidden = true;
      scanProgress.hidden = true;
      downloadBtn.hidden = false;
      downloadBtn.href = file.src;
      downloadBtn.download = `${file.name}.jpg`;
    }, 350);
  }

  function abortScan() {
    if (!scanning) return;
    scanning = false;
    if (scanFrame) cancelAnimationFrame(scanFrame);
    scanBtn.classList.remove('is-scanning');
    scanLabel.textContent = 'SCAN ABORTED';
    scanline.classList.remove('is-active');
    scanline.hidden = true;
    scanProgress.hidden = true;
    scanBar.style.width = '0%';
    scanPercent.textContent = '0%';

    // Laisse "SCAN ABORTED" visible un court instant, puis
    // re-masque les champs révélés en re-rendant le fichier courant.
    window.setTimeout(() => {
      if (!verified.has(files[currentIndex].id)) {
        renderWallpaper(currentIndex);
      }
    }, 900);
  }

  scanBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    startScan();
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(evt => {
    scanBtn.addEventListener(evt, abortScan);
  });
  scanBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startScan(); }
  });
  scanBtn.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' || e.key === ' ') abortScan();
  });
}
