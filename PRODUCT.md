# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Beatriz Leão (Bea), terapeuta principal e utilizadora principal.** Usa o CRM todos os dias, sobretudo no iPad/tablet, entre e depois das sessões, em pé ou em movimento e com as mãos ocupadas ou cansadas, não sentada a uma secretária. (Confirmado pelo Nuno.)

**Cristina Martins (Cris), segunda terapeuta**, e **Nuno, admin/dono do sistema**, usam com menos frequência e com permissões diferentes. (Perfis e permissões documentados no repositório.)

Os clientes finais nunca usam o CRM: recebem WhatsApp e preenchem formulários públicos.

## Product Purpose

CRM próprio da Essence Wellness (centro de massagens de relaxamento em Vila Nova de Gaia), construído de raiz para substituir o Notion e o HubSpot na gestão de clientes, sessões, comunicação e reactivação.

Tarefas principais que tem de tornar rápidas (confirmadas pelo Nuno):

- preparar e acompanhar sessões: ficha do cliente, histórico, registo pós-sessão, feedback;
- aprovar mensagens e reactivar clientes: fila de mensagens IA, campanhas, etiquetas, estados CRM;
- finanças e repasses: receita, packs, vouchers, repasse MBWay à Cristina;
- marcações e agenda: sessões do dia, agenda mensal, confirmações.

Sucesso é a Bea gastar menos tempo no computador e mais no cliente, sem perder nenhuma marcação, mensagem ou euro.

## Positioning

A IA prepara e a Bea aprova. O CRM está ligado ao N8N e ao WhatsApp da própria Essence e gera mensagens de reactivação que soam como a Bea escreve; campanhas e reactivação nunca saem sem a aprovação dela. (Origem: documentação do repositório, não resposta directa.)

## Operating Context

- Sessões de 60 ou 90 minutos, com poucos minutos entre clientes para consultar e registar.
- Automação em N8N (Hetzner), WhatsApp via Evolution API, marcações no Calendly, base de dados Neon (Frankfurt), hosting na Vercel.
- Pagamentos por MBWay e dinheiro; parte do valor recebido pela Bea é repassado à Cristina e tem de ser rastreado.
- Está em fase final de testes antes de migrar cerca de 200 clientes reais do HubSpot.

## Capabilities and Constraints

- Nove estados de cliente CRM (lead até vip_embaixadora, mais blacklist) calculados por um motor diário e também inline quando uma sessão passa a realizada.
- Só a Bea e o admin veem e aprovam Mensagens IA; a Cristina nunca as vê. (Decisão de negócio de 2026-09-04, documentada no repositório.)
- Apagar um cliente nunca apaga receita nem histórico financeiro: sessões, packs, feedbacks e mensagens ficam como "Cliente eliminada".
- O telefone é sempre gravado como `+351XXXXXXXXX`.
- Os formulários públicos e o CRM são superfícies diferentes; o CRM exige login.

## Brand Commitments

Confirmadas pelo Nuno como regras a preservar em qualquer trabalho futuro:

- Português europeu em toda a interface e mensagens, sem nunca escrever a palavra "você": omitir o pronome ou usar o primeiro nome.
- Nunca revelar ao cliente que uma mensagem é automática; tem de soar como a Bea.
- Dados de saúde tratados como RGPD: ficha clínica nunca exposta, anonimização e exportação a pedido.

Voz e assinatura das mensagens: tom directo e próximo, curto, sereno, nunca comercial; assinatura `Essence Wellness ✦` (ou `Beatriz | Essence Wellness ✦` em casos pessoais). A identidade visual NUIT já está em produção e não foi alterada por este registo.

## Evidence on Hand

- Dados reais ainda em migração: há muito poucos clientes reais em produção. Os clientes com prefixo `DEMO —` são de demonstração e nunca devem ser usados como prova nem em capturas públicas.
- Documentação do sistema em `../CLAUDE.md`, `CLAUDE.md`, `../02_DOCUMENTACAO/` e `../../_conhecimento/`.
- Não existem testemunhos, métricas de uso nem benchmarks medidos; não os inventar.

## Product Principles

1. **A Bea decide, a automação prepara.** Nada que fale por ela sai sem a sua aprovação.
2. **Feito para o iPad, entre sessões.** Cada tarefa frequente tem de caber em poucos toques e num ecrã, sem exigir precisão.
3. **Nunca perder dinheiro nem histórico.** Apagar, editar ou migrar preserva a receita e o registo.
4. **Privacidade antes de conveniência.** Dados de saúde e contactos só aparecem a quem precisa.
5. **Soa como a Bea.** Texto de interface e mensagens são calmos, curtos e directos, nunca corporativos.

## Accessibility & Inclusion

- Tamanho de texto ajustável pela utilizadora (baixo, médio, alto) em Configurações, aplicado a todo o CRM.
- Campos de formulário com pelo menos 16px, para o Safari do iPad não fazer zoom ao focar.
- Foco visível para navegação por teclado; respeitar `prefers-reduced-motion` (fica só o feedback de estado).
- Alvos de toque adequados a uso com uma mão e em movimento.
