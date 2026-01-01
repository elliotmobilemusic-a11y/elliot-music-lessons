(() => {
  const KEY = "emm_cookie_notice_v1"; // stores user's choice
  const TTL_DAYS = 180; // how long we remember dismissal
  const now = () => new Date().getTime();

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  }
  function safeRemove(key) {
    try { localStorage.removeItem(key); } catch {}
  }

  function isDismissed() {
    const raw = safeGet(KEY);
    if (!raw) return false;

    // stored as: "accepted|<timestamp>"
    const parts = raw.split("|");
    if (parts.length !== 2) return true;

    const ts = parseInt(parts[1], 10);
    if (!Number.isFinite(ts)) return true;

    const ageMs = now() - ts;
    const ttlMs = TTL_DAYS * 24 * 60 * 60 * 1000;
    return ageMs <= ttlMs;
  }

  function markDismissed() {
    safeSet(KEY, `accepted|${now()}`);
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") node.className = v;
      else if (k === "style") node.setAttribute("style", v);
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    children.forEach((c) => node.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return node;
  }

  function openModal(modal) {
    modal.classList.remove("hidden");
    requestAnimationFrame(() => {
      const panel = modal.querySelector("[data-cookie-panel]");
      if (panel) panel.classList.add("opacity-100", "translate-y-0", "scale-100");
    });
  }

  function closeModal(modal) {
    const panel = modal.querySelector("[data-cookie-panel]");
    if (panel) panel.classList.remove("opacity-100", "translate-y-0", "scale-100");
    setTimeout(() => modal.classList.add("hidden"), 180);
  }

  function injectPrivacyLineOnContactPage() {
    const form = document.getElementById("contact-form");
    if (!form) return;

    // avoid duplicating if already injected
    if (document.getElementById("emm-privacy-line")) return;

    const p = el("p", {
      id: "emm-privacy-line",
      class:
        "mt-3 text-[0.7rem] sm:text-xs text-brand-text-mid leading-relaxed"
    }, []);

    p.innerHTML =
      `Your details are only used to reply to your enquiry. ` +
      `<a href="privacy.html" class="underline hover:text-white">Privacy Notice</a>.`;

    // place near the end of the form
    form.appendChild(p);
  }

  function buildModal() {
    const modal = el("div", {
      id: "emm-cookie-modal",
      class: "hidden fixed inset-0 z-[99999] flex items-center justify-center p-4",
      style: "background: rgba(0,0,0,0.80); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);"
    });

    const panel = el("div", {
      "data-cookie-panel": "",
      class:
        "w-full max-w-xl rounded-2xl border border-brand-accent-dark/60 bg-card-bg/95 p-5 sm:p-6 shadow-2xl " +
        "opacity-0 translate-y-2 scale-[0.98] transition duration-200"
    });

    const topRow = el("div", { class: "flex items-start justify-between gap-4" }, [
      el("div", {}, [
        el("h3", { class: "font-heading text-xl sm:text-2xl font-extrabold text-brand-text-light" }, [
          "Cookies & privacy"
        ]),
        el("p", { class: "mt-1 text-xs sm:text-sm text-brand-text-mid leading-relaxed" }, [
          "Quick, clear info about what this site stores on your device and how we use enquiry data."
        ])
      ]),
      el("button", {
        type: "button",
        class:
          "shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl border border-brand-accent-dark/60 " +
          "text-brand-text-light hover:bg-brand-dark-bg/40 transition",
        onClick: () => closeModal(modal),
        "aria-label": "Close"
      }, ["✕"])
    ]);

    const body = el("div", { class: "mt-4 space-y-4 text-sm text-brand-text-mid leading-relaxed" }, []);
    body.innerHTML = `
      <div class="rounded-xl border border-brand-accent-dark/40 bg-brand-dark-bg/50 p-4">
        <p class="font-semibold text-brand-text-light mb-1">What we store on your device</p>
        <ul class="list-disc ml-5 space-y-1">
          <li><strong>Cookie notice choice</strong> (saved locally so we don’t keep showing this popup).</li>
          <li><strong>Contact form draft</strong> (your message can be saved locally to prevent losing it if you refresh).</li>
          <li><strong>PWA/service worker cache</strong> (if you install/use the app-like experience, your browser may cache files for performance/offline use).</li>
        </ul>
      </div>

      <div class="rounded-xl border border-brand-accent-dark/40 bg-brand-dark-bg/50 p-4">
        <p class="font-semibold text-brand-text-light mb-1">Third-party features</p>
        <p class="text-brand-text-mid">
          The <strong>pricing/travel calculator</strong> uses <strong>Google Maps</strong> to estimate route distance/time. Google may process technical data (eg IP address) and may set cookies depending on your browser settings.
        </p>
      </div>

      <div class="rounded-xl border border-brand-accent-dark/40 bg-brand-dark-bg/50 p-4">
        <p class="font-semibold text-brand-text-light mb-1">Read the full notices</p>
        <p>
          <a href="cookies.html" class="underline hover:text-white">Cookie Notice</a>
          &nbsp;•&nbsp;
          <a href="privacy.html" class="underline hover:text-white">Privacy Notice</a>
        </p>
      </div>
    `;

    const actions = el("div", { class: "mt-5 flex flex-col sm:flex-row gap-3" }, [
      el("button", {
        type: "button",
        class:
          "w-full sm:w-auto px-5 py-2.5 rounded-xl bg-brand-accent-light text-brand-dark-bg text-sm font-semibold " +
          "shadow-lg shadow-brand-accent-light/20 hover:bg-brand-accent-dark transition",
        onClick: () => {
          markDismissed();
          closeModal(modal);
          const banner = document.getElementById("emm-cookie-banner");
          if (banner) banner.remove();
        }
      }, ["OK, got it"]),
      el("button", {
        type: "button",
        class:
          "w-full sm:w-auto px-5 py-2.5 rounded-xl border border-brand-highlight text-brand-highlight text-sm font-semibold " +
          "hover:bg-brand-highlight/10 transition",
        onClick: () => window.location.href = "cookies.html"
      }, ["Read Cookie Notice"])
    ]);

    panel.appendChild(topRow);
    panel.appendChild(body);
    panel.appendChild(actions);

    // close when clicking outside
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal);
    });

    modal.appendChild(panel);
    return modal;
  }

  function buildBanner(modal) {
    const banner = el("div", {
      id: "emm-cookie-banner",
      class:
        "fixed bottom-0 left-0 right-0 z-[99998] p-3 sm:p-4",
      style:
        "background: linear-gradient(180deg, rgba(26,26,46,0.15), rgba(26,26,46,0.85));"
    });

    const card = el("div", {
      class:
        "max-w-6xl mx-auto rounded-2xl border border-brand-accent-dark/60 bg-card-bg/95 p-4 sm:p-5 shadow-2xl"
    });

    const row = el("div", { class: "flex flex-col md:flex-row md:items-center gap-3 md:gap-6" });

    const textWrap = el("div", { class: "flex-1" });
    textWrap.innerHTML = `
      <p class="text-sm sm:text-base font-semibold text-brand-text-light">
        Cookies & local storage
      </p>
      <p class="mt-1 text-xs sm:text-sm text-brand-text-mid leading-relaxed">
        This site stores a small amount of information on your device to keep things working (eg remembering this notice and saving a contact-form draft). 
        The travel calculator may use Google Maps. 
        <button type="button" id="emm-cookie-learnmore" class="underline hover:text-white">Learn more</button>.
      </p>
    `;

    const buttons = el("div", { class: "flex flex-col sm:flex-row gap-2 sm:gap-3" }, [
      el("button", {
        type: "button",
        class:
          "px-5 py-2.5 rounded-xl bg-brand-accent-light text-brand-dark-bg text-sm font-semibold " +
          "shadow-lg shadow-brand-accent-light/20 hover:bg-brand-accent-dark transition",
        onClick: () => {
          markDismissed();
          banner.remove();
        }
      }, ["OK"]),
      el("button", {
        type: "button",
        class:
          "px-5 py-2.5 rounded-xl border border-brand-highlight text-brand-highlight text-sm font-semibold " +
          "hover:bg-brand-highlight/10 transition",
        onClick: () => openModal(modal)
      }, ["Details"])
    ]);

    row.appendChild(textWrap);
    row.appendChild(buttons);
    card.appendChild(row);
    banner.appendChild(card);

    // wire the inline Learn more button
    setTimeout(() => {
      const learn = document.getElementById("emm-cookie-learnmore");
      if (learn) learn.addEventListener("click", () => openModal(modal));
    }, 0);

    return banner;
  }

  function buildFloatingButton(modal) {
    const btn = el("button", {
      type: "button",
      id: "emm-cookie-settings-btn",
      class:
        "fixed bottom-4 left-4 z-[99997] px-4 py-2 rounded-xl border border-brand-accent-dark/70 " +
        "bg-card-bg/85 text-brand-text-light text-xs sm:text-sm shadow-lg hover:bg-brand-dark-bg/60 transition",
      onClick: () => openModal(modal),
      "aria-label": "Cookie settings"
    }, ["Cookie settings"]);
    return btn;
  }

  function init() {
    // only run on real pages
    if (!document || !document.body) return;

    const modal = buildModal();
    document.body.appendChild(modal);

    // Always provide an easy way back to the notices/settings
    document.body.appendChild(buildFloatingButton(modal));

    // Inject privacy line on contact form (UK GDPR transparency at collection)
    injectPrivacyLineOnContactPage();

    // Show banner until dismissed
    if (!isDismissed()) {
      document.body.appendChild(buildBanner(modal));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
