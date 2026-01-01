/* cookie-banner.js — Elliot’s Mobile Music
   - Fixes all button click issues (case-sensitive events)
   - Adds a super-reliable “Cookie settings” corner button (safe-area + max z-index)
   - Prevents duplicate banners/buttons if the script runs twice
   - Injects a tiny privacy line into #contact-form (if present)
*/

(() => {
  const KEY = "emm_cookie_notice_v2";
  const TTL_DAYS = 180;

  const now = () => Date.now();
  const ttlMs = TTL_DAYS * 24 * 60 * 60 * 1000;

  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    remove(k) { try { localStorage.removeItem(k); } catch {} }
  };

  function isDismissed() {
    const raw = ls.get(KEY);
    if (!raw) return false;
    const [state, tsStr] = raw.split("|");
    const ts = parseInt(tsStr || "", 10);
    if (!Number.isFinite(ts)) return false;
    return (now() - ts) <= ttlMs && state === "accepted";
  }

  function markDismissed() {
    ls.set(KEY, `accepted|${now()}`);
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "style") node.setAttribute("style", v);
      else if (k.startsWith("on") && typeof v === "function") {
        // ✅ IMPORTANT: DOM events are lowercase
        node.addEventListener(k.slice(2).toLowerCase(), v);
      } else {
        node.setAttribute(k, v);
      }
    }
    for (const c of children) {
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    }
    return node;
  }

  function removeIfExists(id) {
    const n = document.getElementById(id);
    if (n) n.remove();
  }

  function openModal(modal) {
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");

    // animate in
    requestAnimationFrame(() => {
      const panel = modal.querySelector("[data-cookie-panel]");
      if (panel) panel.classList.add("opacity-100", "translate-y-0", "scale-100");
    });

    // focus first button for accessibility
    setTimeout(() => {
      const firstBtn = modal.querySelector("button, a[href]");
      if (firstBtn) firstBtn.focus();
    }, 50);
  }

  function closeModal(modal) {
    if (!modal) return;
    const panel = modal.querySelector("[data-cookie-panel]");
    if (panel) panel.classList.remove("opacity-100", "translate-y-0", "scale-100");
    setTimeout(() => {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    }, 160);
  }

  function injectPrivacyLineOnContactPage() {
    const form = document.getElementById("contact-form");
    if (!form) return;
    if (document.getElementById("emm-privacy-line")) return;

    const p = el("p", {
      id: "emm-privacy-line",
      class: "mt-3 text-[0.7rem] sm:text-xs text-brand-text-mid leading-relaxed"
    });

    p.innerHTML =
      `Your details are only used to reply to your enquiry. ` +
      `<a href="privacy.html" class="underline hover:text-white">Privacy Notice</a>.`;

    form.appendChild(p);
  }

  function buildModal() {
    const modal = el("div", {
      id: "emm-cookie-modal",
      class: "hidden fixed inset-0 z-[2147483646] flex items-center justify-center p-4",
      style:
        "background: rgba(0,0,0,0.80);" +
        "backdrop-filter: blur(6px);" +
        "-webkit-backdrop-filter: blur(6px);" +
        "pointer-events: auto;",
      role: "dialog",
      "aria-modal": "true",
      "aria-hidden": "true"
    });

    const panel = el("div", {
      "data-cookie-panel": "",
      class:
        "w-full max-w-xl rounded-2xl border border-brand-accent-dark/60 bg-card-bg/95 p-5 sm:p-6 shadow-2xl " +
        "opacity-0 translate-y-2 scale-[0.98] transition duration-150"
    });

    const top = el("div", { class: "flex items-start justify-between gap-4" }, [
      el("div", {}, [
        el("h3", {
          class: "font-heading text-xl sm:text-2xl font-extrabold text-brand-text-light"
        }, ["Cookies & privacy"]),
        el("p", {
          class: "mt-1 text-xs sm:text-sm text-brand-text-mid leading-relaxed"
        }, ["Quick info about what this site stores on your device."])
      ]),
      el("button", {
        type: "button",
        class:
          "shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl border border-brand-accent-dark/60 " +
          "text-brand-text-light hover:bg-brand-dark-bg/40 transition cursor-pointer",
        onClick: () => closeModal(modal),
        "aria-label": "Close"
      }, ["✕"])
    ]);

    const body = el("div", { class: "mt-4 space-y-4 text-sm text-brand-text-mid leading-relaxed" });
    body.innerHTML = `
      <div class="rounded-xl border border-brand-accent-dark/40 bg-brand-dark-bg/50 p-4">
        <p class="font-semibold text-brand-text-light mb-1">What we store (essential)</p>
        <ul class="list-disc ml-5 space-y-1">
          <li><strong>Cookie notice choice</strong> (stored locally so we don’t keep showing this popup).</li>
          <li><strong>PWA/service worker cache</strong> (your browser may cache files for performance/offline use).</li>
          <li><strong>Contact form draft</strong> (only if your contact page saves draft text locally).</li>
        </ul>
      </div>

      <div class="rounded-xl border border-brand-accent-dark/40 bg-brand-dark-bg/50 p-4">
        <p class="font-semibold text-brand-text-light mb-1">Full notices</p>
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
          "shadow-lg shadow-brand-accent-light/20 hover:bg-brand-accent-dark transition cursor-pointer",
        onClick: () => {
          markDismissed();
          closeModal(modal);
          removeIfExists("emm-cookie-banner");
        }
      }, ["OK, got it"]),
      el("button", {
        type: "button",
        class:
          "w-full sm:w-auto px-5 py-2.5 rounded-xl border border-brand-highlight text-brand-highlight text-sm font-semibold " +
          "hover:bg-brand-highlight/10 transition cursor-pointer",
        onClick: () => { window.location.href = "cookies.html"; }
      }, ["Read Cookie Notice"])
    ]);

    panel.appendChild(top);
    panel.appendChild(body);
    panel.appendChild(actions);

    // click outside closes
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal);
    });

    // Esc closes
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal(modal);
    });

    modal.appendChild(panel);
    return modal;
  }

  function buildBanner(modal) {
    const banner = el("div", {
      id: "emm-cookie-banner",
      class: "fixed left-0 right-0 z-[2147483645] p-3 sm:p-4",
      style:
        // safe-area bottom support
        "bottom: max(0px, env(safe-area-inset-bottom));" +
        "background: linear-gradient(180deg, rgba(26,26,46,0.10), rgba(26,26,46,0.85));" +
        "pointer-events: auto;"
    });

    const card = el("div", {
      class:
        "max-w-6xl mx-auto rounded-2xl border border-brand-accent-dark/60 bg-card-bg/95 p-4 sm:p-5 shadow-2xl"
    });

    const row = el("div", { class: "flex flex-col md:flex-row md:items-center gap-3 md:gap-6" });

    const text = el("div", { class: "flex-1" });
    text.innerHTML = `
      <p class="text-sm sm:text-base font-semibold text-brand-text-light">Cookies & local storage</p>
      <p class="mt-1 text-xs sm:text-sm text-brand-text-mid leading-relaxed">
        This site stores a small amount of info on your device to keep things working.
        <button type="button" id="emm-cookie-learnmore" class="underline hover:text-white cursor-pointer">Learn more</button>.
      </p>
    `;

    const buttons = el("div", { class: "flex flex-col sm:flex-row gap-2 sm:gap-3" }, [
      el("button", {
        type: "button",
        class:
          "px-5 py-2.5 rounded-xl bg-brand-accent-light text-brand-dark-bg text-sm font-semibold " +
          "shadow-lg shadow-brand-accent-light/20 hover:bg-brand-accent-dark transition cursor-pointer",
        onClick: () => {
          markDismissed();
          banner.remove();
        }
      }, ["OK"]),
      el("button", {
        type: "button",
        class:
          "px-5 py-2.5 rounded-xl border border-brand-highlight text-brand-highlight text-sm font-semibold " +
          "hover:bg-brand-highlight/10 transition cursor-pointer",
        onClick: () => openModal(modal)
      }, ["Details"])
    ]);

    row.appendChild(text);
    row.appendChild(buttons);
    card.appendChild(row);
    banner.appendChild(card);

    // Wire the inline Learn more
    setTimeout(() => {
      const learn = document.getElementById("emm-cookie-learnmore");
      if (learn) learn.addEventListener("click", () => openModal(modal));
    }, 0);

    return banner;
  }

  function buildFloatingButton(modal) {
    // prevent duplicates
    if (document.getElementById("emm-cookie-settings-btn")) {
      return null;
    }

    return el("button", {
      type: "button",
      id: "emm-cookie-settings-btn",
      class:
        "fixed px-4 py-2 rounded-xl border border-brand-accent-dark/70 " +
        "bg-card-bg/85 text-brand-text-light text-xs sm:text-sm shadow-lg hover:bg-brand-dark-bg/60 transition cursor-pointer",
      style:
        // ✅ super reliable tap + safe-area positioning + max z-index
        "left: max(1rem, env(safe-area-inset-left));" +
        "bottom: max(1rem, env(safe-area-inset-bottom));" +
        "z-index: 2147483647;" +
        "pointer-events: auto;" +
        "touch-action: manipulation;",
      onClick: () => openModal(modal),
      "aria-label": "Cookie settings"
    }, ["Cookie settings"]);
  }

  function init() {
    if (!document?.body) return;

    // Clean up any old injected UI (avoid stacking)
    removeIfExists("emm-cookie-modal");
    removeIfExists("emm-cookie-banner");
    removeIfExists("emm-cookie-settings-btn");

    const modal = buildModal();
    document.body.appendChild(modal);

    const floating = buildFloatingButton(modal);
    if (floating) document.body.appendChild(floating);

    injectPrivacyLineOnContactPage();

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
