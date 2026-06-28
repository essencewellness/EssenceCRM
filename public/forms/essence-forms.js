/* ═══════════════════════════════════════════════════════════════
   Essence Wellness — Motor partilhado dos formulários
   Multi-step, modo personalizado (?clienteId&sessaoId&n), chips, RGPD.
   Cada formulário define window.buildPayload() para mapear os campos.
═══════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  // Servido a partir do próprio domínio do CRM → same-origin.
  // Em ficheiro local (file://) aponta para o servidor de desenvolvimento.
  const API_BASE = location.protocol === "file:" ? "http://localhost:3000" : "";

  const P = new URLSearchParams(location.search);
  const CTX = {
    clienteId: P.get("clienteId") || null,
    sessaoId:  P.get("sessaoId")  || null,
    nome:      P.get("n")         || null,
    voucher:   P.get("sv") === "gc" || P.get("voucher") === "1",
  };
  const PERSONAL = !!(CTX.clienteId && CTX.sessaoId);

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ── Passos ────────────────────────────────────────────────────
  const allSteps   = [...document.querySelectorAll(".step")];
  const identityEl = document.querySelector(".step[data-identity]");
  const visible    = allSteps.filter((el) => !(PERSONAL && el.hasAttribute("data-identity")));
  const total      = visible.length;
  let curEl        = visible[0];

  function idxOf(el) { return visible.indexOf(el); }
  function stepNum(el) { return el.id.split("-")[1]; }

  // Esconder rótulo de progresso do passo de identidade quando personalizado
  if (PERSONAL && identityEl) {
    const lbl = document.getElementById("pl-" + stepNum(identityEl));
    if (lbl) lbl.style.display = "none";
    identityEl.classList.remove("active");
  }

  // Header com o nome (modo personalizado)
  if (PERSONAL && CTX.nome) {
    const ht = document.getElementById("header-title");
    if (ht) {
      ht.textContent = "Olá, ";
      const em = document.createElement("em");
      em.textContent = CTX.nome;
      ht.appendChild(em);
    }
  }

  // Numerar eyebrows ("Passo k de N") + sufixo opcional no primeiro
  visible.forEach((el, i) => {
    const eb = el.querySelector(".eyebrow");
    if (!eb) return;
    let t = "Passo " + (i + 1) + " de " + total;
    if (i === 0 && eb.dataset.sub) t += " · " + eb.dataset.sub;
    eb.textContent = t;
  });

  // Voucher: revelar campo do código se aplicável
  if (CTX.voucher) {
    const vg = document.getElementById("voucher-group");
    if (vg) vg.style.display = "";
  }

  // Activar o primeiro passo visível
  if (curEl) curEl.classList.add("active");

  function updateProgress() {
    const i = idxOf(curEl);
    const pf = document.getElementById("prog-fill");
    if (pf) pf.style.width = Math.round(((i + 1) / total) * 100) + "%";
    visible.forEach((el, k) => {
      const lbl = document.getElementById("pl-" + stepNum(el));
      if (!lbl) return;
      lbl.classList.toggle("active", k === i);
      lbl.classList.toggle("done", k < i);
    });
  }
  updateProgress();

  // ── Validação do passo de identidade ──────────────────────────
  function setErr(flId, inputId, errId, hasErr) {
    document.getElementById(flId)?.classList.toggle("has-err", hasErr);
    document.getElementById(inputId)?.classList.toggle("err", hasErr);
    document.getElementById(errId)?.classList.toggle("show", hasErr);
  }

  function validateStep(el) {
    if (!el || !el.hasAttribute("data-identity")) return true;
    let ok = true;
    const nome  = (document.getElementById("nome")?.value  || "").trim();
    const email = (document.getElementById("email")?.value || "").trim();
    const check = (flId, inputId, errId, hasErr) => { setErr(flId, inputId, errId, hasErr); if (hasErr) ok = false; };
    check("fl-nome",  "nome",  "err-nome",  !nome);
    check("fl-email", "email", "err-email", !emailRe.test(email));
    return ok;
  }

  document.getElementById("nome")?.addEventListener("blur", function () {
    if (PERSONAL) return;
    setErr("fl-nome", "nome", "err-nome", !this.value.trim());
  });
  document.getElementById("email")?.addEventListener("blur", function () {
    if (PERSONAL) return;
    const v = this.value.trim();
    setErr("fl-email", "email", "err-email", v.length > 0 && !emailRe.test(v));
  });

  // ── Navegação ─────────────────────────────────────────────────
  function goTo(el) {
    if (!el || el === curEl) return;
    if (idxOf(el) > idxOf(curEl) && !validateStep(curEl)) return;
    curEl.classList.remove("active");
    curEl = el;
    curEl.classList.add("active");
    updateProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function next() { const i = idxOf(curEl); if (i < total - 1) goTo(visible[i + 1]); }
  function back() { const i = idxOf(curEl); if (i > 0) goTo(visible[i - 1]); }

  document.querySelectorAll("[data-next]").forEach((b) => b.addEventListener("click", next));
  document.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", back));

  // ── Floating labels ───────────────────────────────────────────
  document.querySelectorAll(".fl input, .fl textarea").forEach((el) => {
    const w = () => el.closest(".fl");
    el.addEventListener("focus", () => w().classList.add("active"));
    el.addEventListener("blur", () => {
      w().classList.remove("active");
      w().classList.toggle("filled", el.value.trim() !== "" || el.type === "date");
    });
    el.addEventListener("input", () => w().classList.toggle("filled", el.value.trim() !== ""));
    el.addEventListener("change", () => w().classList.toggle("filled", el.type === "date" || el.value.trim() !== ""));
    if (el.type === "date") w().classList.add("filled");
  });

  // ── Chips multi ───────────────────────────────────────────────
  document.querySelectorAll(".chips .chip:not(.single):not(.outra-trigger)").forEach((chip) => {
    chip.addEventListener("click", () => chip.classList.toggle("sel"));
  });

  // ── Chips single ──────────────────────────────────────────────
  document.querySelectorAll(".chips .chip.single:not(.outra-trigger)").forEach((chip) => {
    chip.addEventListener("click", () => {
      chip.closest(".chips").querySelectorAll(".chip:not(.outra-trigger)").forEach((c) => c.classList.remove("sel"));
      chip.classList.add("sel");
      // esconder eventual campo "outro" do grupo
      const outraField = chip.closest(".fg")?.querySelector(".outra-field");
      if (outraField) outraField.classList.remove("show");
    });
  });

  // ── Chips "Outra/Outro" → revelam campo de texto ──────────────
  document.querySelectorAll(".chip.outra-trigger").forEach((chip) => {
    chip.addEventListener("click", () => {
      if (chip.closest(".chips").querySelector(".chip.single")) {
        chip.closest(".chips").querySelectorAll(".chip").forEach((c) => c.classList.remove("sel"));
      }
      chip.classList.toggle("sel");
      const target = document.getElementById(chip.dataset.target);
      if (target) {
        target.classList.toggle("show", chip.classList.contains("sel"));
        if (chip.classList.contains("sel")) target.querySelector("input, textarea")?.focus();
      }
    });
  });

  // ── Auto-avançar em grupos marcados ───────────────────────────
  document.querySelectorAll(".chips.auto-advance .chip.single").forEach((chip) => {
    chip.addEventListener("click", () => setTimeout(next, 280));
  });

  // ── Blocos reveláveis (ex.: 2.ª pessoa) ───────────────────────
  document.querySelectorAll("[data-reveal]").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const target = document.getElementById(trigger.dataset.reveal);
      if (!target) return;
      const isSim = trigger.dataset.revealValue !== "nao";
      // grupo sim/não: limpar irmãos
      trigger.parentElement.querySelectorAll("[data-reveal]").forEach((t) => t.classList.remove("sel"));
      trigger.classList.add("sel");
      target.classList.toggle("show", isSim);
    });
  });

  // Scroll mobile: o browser gere nativamente o scroll para o elemento em foco.
  // Interferir com scrollIntoView no resize do visualViewport causa jitter — não usar.

  // ── Helpers expostos aos formulários ──────────────────────────
  function chips(id) {
    return [...document.querySelectorAll("#" + id + " .chip.sel")].map((c) => c.textContent.trim());
  }
  function chip1(id) {
    return document.querySelector("#" + id + " .chip.sel")?.textContent.trim() || null;
  }
  // chips + texto "Outra/Outro" combinados (remove o rótulo do gatilho)
  function chipsCom(id, outraInputId, triggerLabel) {
    const arr = chips(id).filter((t) => t !== triggerLabel);
    const extra = (document.getElementById(outraInputId)?.value || "").trim();
    if (extra) arr.push(extra);
    return arr;
  }
  function val(id) { return (document.getElementById(id)?.value || "").trim(); }

  window.EF = { CTX, PERSONAL, chips, chip1, chipsCom, val, goTo, next, back };

  // ── Aviso de tratamento de dados (consentimento implícito no envio) ──
  (function injetarAvisoRGPD() {
    const btn = document.querySelector("[data-submit]");
    if (!btn || document.getElementById("aviso-rgpd")) return;
    const p = document.createElement("p");
    p.id = "aviso-rgpd";
    p.style.cssText =
      "margin:10px auto 0;max-width:340px;text-align:center;" +
      "font-size:10px;line-height:1.4;color:rgba(157,157,154,0.55);";
    const a = document.createElement("a");
    a.href = "https://essencewellnesspt.com/privacidade/";
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "Política de Privacidade";
    a.style.cssText = "color:inherit;text-decoration:underline;";
    p.append("Ao enviar, aceitas que tratamos os teus dados para preparar a tua sessão. ", a);
    btn.insertAdjacentElement("afterend", p);
  })();

  // ── Submissão ─────────────────────────────────────────────────
  async function submeter() {
    const btn = document.querySelector("[data-submit]");
    const ge = document.getElementById("gerr");
    ge?.classList.remove("show");

    let payload;
    try {
      payload = window.buildPayload();
    } catch (e) {
      if (e && e.focusEl) e.focusEl.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const span = btn.querySelector("span");
    const original = span.textContent;
    span.textContent = "A enviar…";
    btn.disabled = true;

    const hp = document.querySelector('input[name="website"]');
    payload.website = hp ? hp.value : "";
    if (CTX.clienteId) payload.clienteId = CTX.clienteId;
    if (CTX.sessaoId)  payload.sessaoId = CTX.sessaoId;
    // Consentimento implícito: ao enviar, a cliente aceita o tratamento dos
    // dados de saúde (aviso visível por baixo do botão). Sem esta flag, a API
    // descarta toda a ficha clínica (RGPD Art. 9).
    payload.consentimentoSaude = true;

    try {
      const res = await fetch(API_BASE + "/api/v1/public/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("HTTP " + res.status);

      curEl.classList.remove("active");
      const sc = document.getElementById("success");
      if (sc) sc.style.display = "block";
      const nomeOk = (PERSONAL && CTX.nome) ? CTX.nome : (payload.nome ? payload.nome.split(" ")[0] : "");
      const nok = document.getElementById("nome-ok");
      if (nok) nok.textContent = nomeOk;
      const pf = document.getElementById("prog-fill");
      if (pf) pf.style.width = "100%";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      if (ge) {
        ge.textContent = "Ocorreu um erro ao enviar. Por favor, tenta novamente ou contacta-nos diretamente.";
        ge.classList.add("show");
      }
      span.textContent = original;
      btn.disabled = false;
    }
  }

  document.querySelector("[data-submit]")?.addEventListener("click", submeter);
})();
