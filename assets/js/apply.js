/* ════════════════════════════════════════════════════════════
   GRAVITAS FOUNDING MEMBERS — apply.js
   Multi-step form · signature pad · validation · submission
   ════════════════════════════════════════════════════════════

   SUBMISSION ENDPOINT
   --------------------------------------------------------------
   This form POSTs to FORM_ENDPOINT as JSON. Point it at whatever
   you use for lead capture — a Formspree endpoint (as used on the
   Jobbyist pages), a Supabase Edge Function, a Zapier catch hook,
   or your own API. Leave it blank to run in local-only demo mode:
   the form still validates, signs, and confirms, and every
   submission is logged to the browser console and localStorage
   under the "gfm_applications" key so nothing is lost while you
   wire up a real backend.
   -------------------------------------------------------------- */
const FORM_ENDPOINT = "https://api.app.customjs.io/pages/form/submit/29de01bc-9089-4be6-8313-642687111a3a";

(function () {
  "use strict";

  const ASSET_PRICES = { jobbyist: 250, skinlabs: 125 };
  const ASSET_LABELS = { jobbyist: "Jobbyist Africa", skinlabs: "SkinLabs® South Africa" };
  const ZAR_RATE = 16.5;

  const form = document.getElementById("applyForm");
  if (!form) return;

  const panels = Array.from(form.querySelectorAll(".step-panel"));
  const progressFill = document.getElementById("progressFill");
  const progressSteps = Array.from(document.querySelectorAll(".progress-step"));
  let currentIndex = 0; // index into panels[] (0-4 = steps 1-5, 5 = confirm)

  const signatures = { ndaCanvas: null, indemnityCanvas: null };

  /* ── Step visibility ──────────────────────────────────── */
  function showStep(index) {
    panels.forEach((p, i) => p.classList.toggle("active", i === index));
    currentIndex = index;
    updateProgress();
    window.scrollTo({ top: form.offsetTop - 90, behavior: "smooth" });
  }

  function updateProgress() {
    const stepNum = Math.min(currentIndex + 1, 5);
    progressFill.style.width = (stepNum / 5) * 100 + "%";
    progressSteps.forEach((el, i) => {
      el.classList.toggle("active", i === stepNum - 1);
      el.classList.toggle("done", i < stepNum - 1);
    });
  }

  /* ── Field validation helpers ─────────────────────────── */
  function setError(fieldEl, show) {
    const wrap = fieldEl.closest(".field") || fieldEl.parentElement;
    if (wrap) wrap.classList.toggle("has-error", show);
    fieldEl.classList.toggle("error", show);
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
  function isValidPhone(v) {
    return /^[+()\-\s\d]{7,20}$/.test(v);
  }

  function validateStep1() {
    let ok = true;
    const name = document.getElementById("fullName");
    const email = document.getElementById("email");
    const phone = document.getElementById("phone");
    const country = document.getElementById("country");
    const age = document.getElementById("ageConfirm");

    if (name.value.trim().length < 2) { setError(name, true); ok = false; } else setError(name, false);
    if (!isValidEmail(email.value.trim())) { setError(email, true); ok = false; } else setError(email, false);
    if (!isValidPhone(phone.value.trim())) { setError(phone, true); ok = false; } else setError(phone, false);
    if (!country.value) { setError(country, true); ok = false; } else setError(country, false);

    const ageError = document.getElementById("ageConfirmError");
    if (!age.checked) { ageError.style.display = "block"; ok = false; } else ageError.style.display = "none";

    return ok;
  }

  function selectedAssets() {
    return Array.from(form.querySelectorAll('input[name="asset"]:checked')).map((el) => el.value);
  }

  function validateStep2() {
    const assets = selectedAssets();
    const err = document.getElementById("assetError");
    if (assets.length === 0) { err.style.display = "block"; return false; }
    err.style.display = "none";
    return true;
  }

  function validateStep3() {
    const agree = document.getElementById("ndaAgree");
    const err = document.getElementById("ndaError");
    const signed = signatures.ndaCanvas && signatures.ndaCanvas.hasSignature();
    if (!agree.checked || !signed) { err.style.display = "block"; return false; }
    err.style.display = "none";
    return true;
  }

  function validateStep4() {
    const agree = document.getElementById("indemnityAgree");
    const err = document.getElementById("indemnityError");
    const signed = signatures.indemnityCanvas && signatures.indemnityCanvas.hasSignature();
    if (!agree.checked || !signed) { err.style.display = "block"; return false; }
    err.style.display = "none";
    return true;
  }

  function validateStep5() {
    const agree = document.getElementById("finalConfirm");
    const err = document.getElementById("finalError");
    if (!agree.checked) { err.style.display = "block"; return false; }
    err.style.display = "none";
    return true;
  }

  const validators = [validateStep1, validateStep2, validateStep3, validateStep4, validateStep5];

  /* ── Asset selection UI + running total ───────────────── */
  function initAssetSelection() {
    const jobbyistBox = document.getElementById("optJobbyist");
    const skinlabsBox = document.getElementById("optSkinlabs");
    [jobbyistBox, skinlabsBox].forEach((box) => {
      const input = box.querySelector("input");
      input.addEventListener("change", () => {
        box.classList.toggle("checked", input.checked);
        updateTotal();
      });
    });
  }

  function updateTotal() {
    const assets = selectedAssets();
    const total = assets.reduce((sum, a) => sum + ASSET_PRICES[a], 0);
    const totalEl = document.getElementById("totalBid");
    if (assets.length === 0) {
      totalEl.innerHTML = `$0<small> · select an asset above</small>`;
    } else {
      const zar = Math.round(total * ZAR_RATE).toLocaleString();
      totalEl.innerHTML = `$${total}<small> ≈ R${zar}</small>`;
    }
  }

  /* ── Signature pad ─────────────────────────────────────── */
  function createSignaturePad(canvasId) {
    const canvas = document.getElementById(canvasId);
    const box = canvas.closest(".sig-pad-box");
    const placeholder = box.querySelector(`[data-placeholder-for="${canvasId}"]`);
    const ctx = canvas.getContext("2d");
    let drawing = false;
    let hasInk = false;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111827";
    }
    resize();
    window.addEventListener("resize", () => {
      const data = hasInk ? canvas.toDataURL() : null;
      resize();
      if (data) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr);
        img.src = data;
      }
    });

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const point = e.touches ? e.touches[0] : e;
      return { x: point.clientX - rect.left, y: point.clientY - rect.top };
    }

    function start(e) {
      e.preventDefault();
      drawing = true;
      hasInk = true;
      placeholder.style.display = "none";
      const p = getPos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }
    function move(e) {
      if (!drawing) return;
      e.preventDefault();
      const p = getPos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    function end() { drawing = false; }

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", move, { passive: false });
    canvas.addEventListener("touchend", end);

    return {
      clear() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hasInk = false;
        placeholder.style.display = "block";
      },
      hasSignature() { return hasInk; },
      dataUrl() { return hasInk ? canvas.toDataURL("image/png") : null; },
    };
  }

  function initSignaturePads() {
    signatures.ndaCanvas = createSignaturePad("ndaCanvas");
    signatures.indemnityCanvas = createSignaturePad("indemnityCanvas");

    document.querySelectorAll("[data-clear-sig]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-clear-sig");
        signatures[id].clear();
      });
    });
  }

  /* ── Review step population ───────────────────────────── */
  function populateReview() {
    document.getElementById("revName").textContent = document.getElementById("fullName").value.trim();
    document.getElementById("revEmail").textContent = document.getElementById("email").value.trim();
    document.getElementById("revPhone").textContent = document.getElementById("phone").value.trim();
    document.getElementById("revCountry").textContent = document.getElementById("country").value;

    const assets = selectedAssets();
    document.getElementById("revAssets").textContent = assets.map((a) => ASSET_LABELS[a]).join(" + ") || "—";
    const total = assets.reduce((sum, a) => sum + ASSET_PRICES[a], 0);
    document.getElementById("revTotal").textContent = `$${total} (≈ R${Math.round(total * ZAR_RATE).toLocaleString()})`;

    document.getElementById("revNda").textContent = signatures.ndaCanvas.hasSignature() ? "Signed ✓" : "Not signed";
    document.getElementById("revIndemnity").textContent = signatures.indemnityCanvas.hasSignature() ? "Signed ✓" : "Not signed";
  }

  /* ── Navigation wiring ─────────────────────────────────── */
  function initNav() {
    form.querySelectorAll("[data-next]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const stepIdx = currentIndex;
        if (!validators[stepIdx]()) return;
        if (stepIdx === 3) populateReview(); // entering step 5 (index 4) after step 4
        showStep(stepIdx + 1);
      });
    });
    form.querySelectorAll("[data-prev]").forEach((btn) => {
      btn.addEventListener("click", () => showStep(Math.max(0, currentIndex - 1)));
    });
  }

  /* ── Reference number ──────────────────────────────────── */
  function generateReference() {
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    const date = new Date();
    return `GFM-${date.getFullYear()}-${rand}`;
  }

/* ── Submission ────────────────────────────────────────── */
async function handleSubmit(e) {
  e.preventDefault();

  if (!validateStep5()) return;

  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";

  const assets = selectedAssets();
  const totalBidUSD = assets.reduce((sum, a) => sum + ASSET_PRICES[a], 0);
  const totalBidZAR = Math.round(totalBidUSD * ZAR_RATE);
  const reference = generateReference();

  const payload = {
    // Submission metadata
    reference,
    submittedAt: new Date().toISOString(),
    source: "Gravitas Partners",
    form: "Founding Members Application",
    website: window.location.origin,
    userAgent: navigator.userAgent,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

    // Applicant information
    fullName: document.getElementById("fullName").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    country: document.getElementById("country").value,

    // Investment information
    selectedAssets: assets,
    selectedAssetNames: assets.map(asset => ASSET_LABELS[asset]),
    assetCount: assets.length,
    totalBidUSD,
    totalBidZAR,
    exchangeRate: ZAR_RATE,

    // Agreement status
    ndaSigned: signatures.ndaCanvas.hasSignature(),
    indemnitySigned: signatures.indemnityCanvas.hasSignature(),

    // Signature images
    ndaSignatureDataUrl: signatures.ndaCanvas.dataUrl(),
    indemnitySignatureDataUrl: signatures.indemnityCanvas.dataUrl()
  };

  // Always keep a local backup
  try {
    const existing = JSON.parse(
      localStorage.getItem("gfm_applications") || "[]"
    );

    existing.push(payload);

    localStorage.setItem(
      "gfm_applications",
      JSON.stringify(existing)
    );
  } catch (err) {
    console.warn("Could not save locally:", err);
  }

  console.log("Founding Member application:", payload);

  if (FORM_ENDPOINT) {
    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Submission failed (${response.status})`);
      }

      console.log("Application submitted successfully.");
    } catch (err) {
      console.warn(
        "Submission failed. Application was saved locally.",
        err
      );
    }
  }

  document.getElementById(
    "confirmRef"
  ).textContent = `Reference: ${reference}`;

  showStep(panels.length - 1);

  submitBtn.disabled = false;
  submitBtn.textContent = "Submit Application →";
}

  /* ── Init ──────────────────────────────────────────────── */
  document.addEventListener("DOMContentLoaded", () => {
    initAssetSelection();
    initSignaturePads();
    initNav();
    form.addEventListener("submit", handleSubmit);
    showStep(0);
  });
})();
