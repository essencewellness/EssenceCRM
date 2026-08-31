# 05b | Lembrete Individual — Registo Sessão

**Estado no N8N:** ✅ ativo. Chamado apenas pelo **[WF05](../05-feedback-pos-sessao/)** (`Agendar Lembrete Individual`, modo `each`, `waitForSubWorkflow: false`) — nunca é acionado directamente.

**Trigger:** Execute Workflow Trigger (recebe `sessaoId`, `nomeCliente`, `servico`, `hora`, `link`, `esperarAte`).

## Porque existe

Antes (5/8), o WF05 verificava a fila de registo **a cada 15 minutos, 24h/dia** — o maior consumidor isolado de horas de computação da Neon Postgres. Este sub-workflow substitui esse polling: o WF05 passou a correr só **2x/dia** (7h e 20h — ver README dele), e cada sessão por registar é entregue aqui individualmente, com um nó **Wait** que "dorme" até à hora exacta (fim da sessão + 10 min) sem tocar em nada — zero custo enquanto espera.

## O que faz

1. **Espera** até `esperarAte` (nó Wait, `resume: specificTime`).
2. Ao acordar, verifica outra vez a sessão no CRM — se entretanto já foi registada ou cancelada, não faz nada (`Ainda Por Registar?`).
3. Se ainda fizer sentido, tenta o WhatsApp; se falhar (Evolution API em baixo), cai no fallback de email — mesmo padrão dos outros workflows.
4. Marca `lembretePosSessaoEnviado: true` em qualquer dos dois caminhos.

## Endpoints usados

- `GET /api/v1/sessoes/{id}` (verificação antes de enviar)
- `PATCH /api/v1/sessoes/{id}` (`lembretePosSessaoEnviado`)
- Evolution API + Gmail (fallback)

Testado de ponta a ponta com uma sessão de teste real em 2026-08-31 (ver histórico da sessão de trabalho) — confirmado o percurso completo: espera → verificação → WhatsApp (falhou, API desligada) → fallback email → confirmação.
