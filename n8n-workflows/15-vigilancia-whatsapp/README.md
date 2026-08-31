# 15 | Vigilância WhatsApp (Evolution API)

**Estado no N8N:** ✅ ativo. Construído e testado ao vivo em 2026-08-29
(durante uma desconexão real do WhatsApp).

**Trigger:** Schedule, a cada 15 min.

## O que faz

1. Verifica o estado da instância Evolution API (`connectionState`).
2. Só regista mudança de estado (não toca no CRM, por isso não conta como
   consumo de CU-hours da Neon — usa `$getWorkflowStaticData` para lembrar o
   último estado conhecido).
3. **Se acabou de cair:** gera um novo QR code de reconexão e manda por
   email (com a imagem embutida) — lembrete **de hora a hora** enquanto
   continuar em baixo, **nunca entre as 22h e as 08h** (hora de Lisboa).
4. **Se acabou de recuperar:** manda um email de confirmação. Se a
   recuperação acontecer dentro da janela de silêncio (22h-08h), o aviso
   fica pendente e sai na primeira verificação depois das 08h — nunca se
   perde.

## Endpoints usados

- `GET https://evolution.essencewellnesspt.com/instance/connectionState/essence_whatsapp`
- `GET https://evolution.essencewellnesspt.com/instance/connect/essence_whatsapp` (QR code)
- Gmail (único canal — não depende do próprio WhatsApp para avisar que o WhatsApp está em baixo)

Nota: destinatário do email é `geral@essencewellnesspt.com` (o
[16-alerta-falha-workflow](../16-alerta-falha-workflow/) é que vai para o
email pessoal do Nuno, não este).
