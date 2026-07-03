/* ════════════════════════════════════════════════════════════
   GRAVITAS FOUNDING MEMBERS — main.js
   Hero network canvas · seat tracker · FAQ accordion · modals
   ════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── Config: update as seats fill ────────────────────── */
  const TOTAL_SEATS = 10;
  const SEATS_FILLED = 0; // update manually as applications convert to funded seats

  /* ── Seat tracker (hero) ─────────────────────────────── */
  function renderSeatTracker() {
    const row = document.getElementById("seatRow");
    if (!row) return;
    row.innerHTML = "";
    for (let i = 0; i < TOTAL_SEATS; i++) {
      const node = document.createElement("div");
      node.className = "seat-node" + (i >= SEATS_FILLED ? " open" : "");
      node.title = i < SEATS_FILLED ? `Seat ${i + 1} — Filled` : `Seat ${i + 1} — Available`;
      row.appendChild(node);
    }
    const caption = document.getElementById("seatCaption");
    if (caption) {
      const remaining = TOTAL_SEATS - SEATS_FILLED;
      caption.innerHTML = `<strong>${remaining} of ${TOTAL_SEATS}</strong> founding seats remaining`;
    }
  }

  /* ── Hero network canvas (abstract AI network) ───────── */
  function initNetworkCanvas() {
    const canvas = document.getElementById("networkCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w, h, dpr;
    let nodes = [];
    const NODE_COUNT_BASE = 46;
    const LINK_DIST = 150;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((w * h) / 26000);
      nodes = Array.from({ length: Math.max(18, Math.min(NODE_COUNT_BASE, count)) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.6 + 0.9,
        hue: Math.random() > 0.5 ? "blue" : "green",
      }));
    }

    function step() {
      ctx.clearRect(0, 0, w, h);
      // update
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      });
      // links
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.35;
            ctx.strokeStyle = `rgba(72,160,255,${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      // nodes
      nodes.forEach((n) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.hue === "blue" ? "rgba(126,180,255,0.85)" : "rgba(107,240,203,0.85)";
        ctx.fill();
      });
      if (!reduceMotion) requestAnimationFrame(step);
    }

    resize();
    window.addEventListener("resize", resize);
    step();
    if (reduceMotion) {
      // draw a single static frame
      step();
    }
  }

  /* ── FAQ accordion ────────────────────────────────────── */
  function initFaq() {
    document.querySelectorAll(".faq-q").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = btn.closest(".faq-item");
        const wasOpen = item.classList.contains("open");
        document.querySelectorAll(".faq-item").forEach((el) => el.classList.remove("open"));
        if (!wasOpen) item.classList.add("open");
      });
    });
  }

  /* ── Modal (Terms / Memorandum quick view) ───────────── */
  function initModals() {
    document.querySelectorAll("[data-modal-open]").forEach((trigger) => {
      trigger.addEventListener("click", (e) => {
        e.preventDefault();
        const id = trigger.getAttribute("data-modal-open");
        const modal = document.getElementById(id);
        if (modal) {
          modal.classList.add("active");
          document.body.style.overflow = "hidden";
        }
      });
    });
    document.querySelectorAll("[data-modal-close]").forEach((btn) => {
      btn.addEventListener("click", () => closeAllModals());
    });
    document.querySelectorAll(".modal-ov").forEach((ov) => {
      ov.addEventListener("click", (e) => {
        if (e.target === ov) closeAllModals();
      });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAllModals();
    });
  }
  function closeAllModals() {
    document.querySelectorAll(".modal-ov").forEach((m) => m.classList.remove("active"));
    document.body.style.overflow = "";
  }

  /* ── Nav shadow / active link on scroll (lightweight) ── */
  function initNav() {
    const nav = document.querySelector(".navbar");
    if (!nav) return;
    window.addEventListener("scroll", () => {
      if (window.scrollY > 8) nav.style.boxShadow = "0 8px 24px rgba(0,0,0,.28)";
      else nav.style.boxShadow = "none";
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderSeatTracker();
    initNetworkCanvas();
    initFaq();
    initModals();
    initNav();
  });
})();
