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
    linkToken: P.get("t")         || null,
    voucher:   P.get("sv") === "gc" || P.get("voucher") === "1",
    temNascimento: P.get("tb") === "1",
  };
  const PERSONAL = !!(CTX.clienteId && CTX.sessaoId);

  // Já temos a data de nascimento desta cliente (vem assinalado pelo N8N
  // via ?tb=1) — não faz sentido voltar a perguntar
  if (CTX.temNascimento) {
    const nascInput = document.getElementById("dataNascimento");
    const nascGroup = nascInput ? nascInput.closest(".fg") : null;
    if (nascGroup) nascGroup.style.display = "none";
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const MENSAGEM_ERRO_GENERICA = "Ocorreu um erro ao enviar. Por favor, tenta novamente ou contacta-nos diretamente.";

  // ── Passos ────────────────────────────────────────────────────
  const allSteps   = [...document.querySelectorAll(".step")];
  const identityEl = document.querySelector(".step[data-identity]");
  const visible    = allSteps.filter((el) => !(PERSONAL && el.hasAttribute("data-identity")));
  const total      = visible.length;
  let curEl        = visible[0];

  // Uso único (link personalizado): já preencheste esta ficha antes de uma
  // sessão concreta — mostra logo o ecrã final em vez de deixar preencher
  // tudo outra vez para nada. Só verifica quando há sessaoId: sem ele (lead
  // solta, sem sessão associada) não há nada para trancar.
  if (CTX.sessaoId) {
    (async function verificarJaEnviado() {
      try {
        const qs = new URLSearchParams({ sessaoId: CTX.sessaoId, ...(CTX.linkToken ? { t: CTX.linkToken } : {}) });
        const res = await fetch(API_BASE + "/api/v1/public/onboarding?" + qs.toString());
        if (!res.ok) return; // sem verificação possível, deixa preencher normalmente
        const dados = await res.json();
        if (!dados.jaSubmetido) return;

        allSteps.forEach((el) => el.classList.remove("active"));
        const sc = document.getElementById("success");
        if (!sc) return;
        sc.style.display = "block";
        const nok = document.getElementById("nome-ok");
        if (nok) nok.textContent = CTX.nome || "";
        const titulo = sc.querySelector("h2");
        if (titulo) titulo.textContent = "Já recebemos a tua ficha, " + (CTX.nome ? CTX.nome + "." : ".");
        const pf = document.getElementById("prog-fill");
        if (pf) pf.style.width = "100%";
      } catch {
        // falha a verificar não pode bloquear quem ainda não enviou
      }
    })();
  }

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

  // ── Seletor de data personalizado (substitui o calendário nativo) ──
  // Cada <input type="date"> vira um par: um input de texto só-de-leitura
  // (o que a cliente vê e clica, formatado dd/mm/aaaa) + um input escondido
  // com o mesmo id, a guardar sempre o valor ISO — window.buildPayload() de
  // cada formulário continua a ler EF.val("dataNascimento") sem alterações.
  const MESES_PT = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const DIAS_PT  = ["D","S","T","Q","Q","S","S"];

  function pad2(n) { return String(n).padStart(2, "0"); }
  function isoParaData(iso) {
    if (!iso) return null;
    const [a, m, d] = iso.split("-").map(Number);
    if (!a || !m || !d) return null;
    return new Date(a, m - 1, d);
  }
  function dataParaIso(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
  function dataParaPt(d) { return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`; }

  function ligarCalendario(visivel, oculto) {
    let painel = null;
    let mesAtual, anoAtual;
    const valorInicial = isoParaData(oculto.value);
    const hoje = new Date();
    mesAtual = valorInicial ? valorInicial.getMonth() : hoje.getMonth();
    anoAtual = valorInicial ? valorInicial.getFullYear() : hoje.getFullYear();

    function selecionar(d) {
      oculto.value = dataParaIso(d);
      visivel.value = dataParaPt(d);
      visivel.dispatchEvent(new Event("change", { bubbles: true }));
      fechar();
    }

    function limpar() {
      oculto.value = "";
      visivel.value = "";
      visivel.dispatchEvent(new Event("change", { bubbles: true }));
      fechar();
    }

    function reposicionar() {
      if (!painel) return;
      const r = visivel.getBoundingClientRect();
      painel.style.top = r.bottom + 6 + "px";
      painel.style.left = r.left + "px";
    }

    function render() {
      if (!painel) return;
      const primeiroDiaMes = new Date(anoAtual, mesAtual, 1);
      const offset = primeiroDiaMes.getDay();
      const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
      const selecionada = isoParaData(oculto.value);

      const anos = [];
      for (let a = hoje.getFullYear(); a >= hoje.getFullYear() - 100; a--) anos.push(a);

      let grid = "";
      for (let i = 0; i < offset; i++) {
        const diaAnterior = new Date(anoAtual, mesAtual, 1 - offset + i).getDate();
        grid += `<button type="button" class="ef-cal-dia ef-cal-fora" data-fora="-1" data-dia="${diaAnterior}">${diaAnterior}</button>`;
      }
      for (let dia = 1; dia <= diasNoMes; dia++) {
        const d = new Date(anoAtual, mesAtual, dia);
        const sel = selecionada && d.getTime() === selecionada.getTime();
        const eHoje = d.toDateString() === hoje.toDateString();
        grid += `<button type="button" class="ef-cal-dia${sel ? " ef-cal-sel" : ""}${eHoje ? " ef-cal-hoje" : ""}" data-dia="${dia}">${dia}</button>`;
      }
      const restantes = (7 - ((offset + diasNoMes) % 7)) % 7;
      for (let dia = 1; dia <= restantes; dia++) {
        grid += `<button type="button" class="ef-cal-dia ef-cal-fora" data-fora="1" data-dia="${dia}">${dia}</button>`;
      }

      painel.innerHTML = `
        <div class="ef-cal-header">
          <select class="ef-cal-select ef-cal-mes"></select>
          <select class="ef-cal-select ef-cal-ano"></select>
        </div>
        <div class="ef-cal-semana">${DIAS_PT.map((d) => `<span>${d}</span>`).join("")}</div>
        <div class="ef-cal-grid">${grid}</div>
        <div class="ef-cal-footer">
          <button type="button" class="ef-cal-link" data-acao="limpar">Limpar</button>
          <button type="button" class="ef-cal-link" data-acao="hoje">Hoje</button>
        </div>
      `;

      const selMes = painel.querySelector(".ef-cal-mes");
      MESES_PT.forEach((nome, i) => {
        const op = document.createElement("option");
        op.value = String(i);
        op.textContent = nome;
        if (i === mesAtual) op.selected = true;
        selMes.appendChild(op);
      });
      const selAno = painel.querySelector(".ef-cal-ano");
      anos.forEach((a) => {
        const op = document.createElement("option");
        op.value = String(a);
        op.textContent = String(a);
        if (a === anoAtual) op.selected = true;
        selAno.appendChild(op);
      });
      selMes.addEventListener("change", () => { mesAtual = Number(selMes.value); render(); });
      selAno.addEventListener("change", () => { anoAtual = Number(selAno.value); render(); });

      painel.querySelectorAll(".ef-cal-dia").forEach((btn) => {
        btn.addEventListener("click", () => {
          const dia = Number(btn.dataset.dia);
          const fora = btn.dataset.fora;
          if (fora === "-1") { mesAtual = mesAtual === 0 ? 11 : mesAtual - 1; anoAtual = mesAtual === 11 ? anoAtual - 1 : anoAtual; }
          else if (fora === "1") { mesAtual = mesAtual === 11 ? 0 : mesAtual + 1; anoAtual = mesAtual === 0 ? anoAtual + 1 : anoAtual; }
          if (fora) { render(); return; }
          selecionar(new Date(anoAtual, mesAtual, dia));
        });
      });
      painel.querySelector('[data-acao="limpar"]').addEventListener("click", limpar);
      painel.querySelector('[data-acao="hoje"]').addEventListener("click", () => {
        mesAtual = hoje.getMonth();
        anoAtual = hoje.getFullYear();
        render();
      });
    }

    function abrir() {
      if (painel) return;
      painel = document.createElement("div");
      painel.className = "ef-cal-painel";
      document.body.appendChild(painel);
      render();
      reposicionar();
      window.addEventListener("scroll", reposicionar, true);
      window.addEventListener("resize", reposicionar);
      setTimeout(() => document.addEventListener("click", aoClicarFora), 0);
    }

    function fechar() {
      if (!painel) return;
      painel.remove();
      painel = null;
      window.removeEventListener("scroll", reposicionar, true);
      window.removeEventListener("resize", reposicionar);
      document.removeEventListener("click", aoClicarFora);
    }

    function aoClicarFora(ev) {
      if (painel && !painel.contains(ev.target) && ev.target !== visivel) fechar();
    }

    visivel.addEventListener("click", abrir);
    visivel.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") fechar();
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); abrir(); }
    });
  }

  document.querySelectorAll('input[type="date"]').forEach((original) => {
    const originalId = original.id;
    const wrapper = original.closest(".fl");

    const oculto = document.createElement("input");
    oculto.type = "hidden";
    oculto.id = originalId;
    oculto.value = original.value || "";

    const visivel = document.createElement("input");
    visivel.type = "text";
    visivel.readOnly = true;
    visivel.autocomplete = "off";
    visivel.setAttribute("inputmode", "none");
    visivel.placeholder = " ";
    visivel.className = original.className;
    visivel.id = originalId + "-visivel";
    if (original.value) visivel.value = dataParaPt(isoParaData(original.value));

    original.replaceWith(visivel);
    visivel.insertAdjacentElement("afterend", oculto);

    const label = wrapper ? wrapper.querySelector(`label[for="${originalId}"]`) : null;
    if (label) label.setAttribute("for", visivel.id);

    ligarCalendario(visivel, oculto);
  });

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

  // ── Aviso de tratamento de dados (consentimento no acto de envio) ──
  // Declaração explícita: enviar o formulário é o acto afirmativo de
  // consentimento (RGPD Art. 9). A versão deste texto fica registada no
  // audit log do CRM (ver CONSENT_VERSAO em /api/v1/public/onboarding).
  (function injetarAvisoRGPD() {
    const btn = document.querySelector("[data-submit]");
    if (!btn || document.getElementById("aviso-rgpd")) return;
    const p = document.createElement("p");
    p.id = "aviso-rgpd";
    p.style.cssText =
      "margin:16px auto 0;max-width:420px;text-align:center;" +
      "font-size:10px;line-height:1.5;color:rgba(157,157,154,0.55);";
    const a = document.createElement("a");
    a.href = "https://essencewellnesspt.com/privacidade/";
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "Política de Privacidade";
    a.style.cssText = "color:inherit;text-decoration:underline;";
    p.append(
      "Ao enviar esta ficha dás o teu consentimento explícito à Essence Wellness " +
      "para tratar os dados que partilhas — incluindo dados de saúde — apenas para " +
      "preparar e personalizar as tuas sessões. Podes retirar o consentimento ou " +
      "pedir o apagamento dos teus dados a qualquer momento. ",
      a
    );
    // Depois do contentor .nav, não do botão: em desktop o .nav é flex row-reverse
    // (essence-forms.css:511), e inserir aqui logo após o botão fazia do aviso um
    // terceiro item flex — espremido numa coluna estreita entre "Voltar" e "Enviar".
    (btn.closest(".nav") || btn).insertAdjacentElement("afterend", p);
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
    if (CTX.linkToken) payload.t = CTX.linkToken;
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
      if (!res.ok) {
        // A API devolve mensagens úteis (ex.: link expirado) — mostrar essas
        // em vez do aviso genérico sempre que existirem.
        let mensagem = MENSAGEM_ERRO_GENERICA;
        try {
          const corpo = await res.json();
          if (corpo && typeof corpo.error === "string") mensagem = corpo.error;
        } catch {}
        const erro = new Error(mensagem);
        erro.paraMostrar = mensagem;
        throw erro;
      }

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
        ge.textContent = (err && err.paraMostrar) || MENSAGEM_ERRO_GENERICA;
        ge.classList.add("show");
      }
      span.textContent = original;
      btn.disabled = false;
    }
  }

  document.querySelector("[data-submit]")?.addEventListener("click", submeter);
})();
