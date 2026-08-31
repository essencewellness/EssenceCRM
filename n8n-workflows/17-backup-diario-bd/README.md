# 17 | Backup Diário da Base de Dados

**Estado no N8N:** ✅ ativo.

**Trigger:** Schedule, diário às 4h da manhã (hora de Lisboa).

## O que faz

1. Chama `GET /api/v1/admin/backup` (novo endpoint do CRM, protegido por
   `API_KEY_ADMIN`) — export lógico completo das 23 tabelas da base de
   dados em JSON.
2. Prepara o ficheiro com nome `backup-crm-essence-AAAA-MM-DD.json`.
3. Faz upload para a pasta do Google Drive
   [Backups CRM Essence](https://drive.google.com/drive/u/0/folders/15Hr69C1nCuSAOuD6NHenvoWJrYqup3MT)
   (ID fixo, sem procurar/criar pasta — simplificado depois de um bug real
   em que a pesquisa de pasta devolvia 0 itens e parava a execução em
   silêncio).
4. Apaga backups da mesma pasta com **mais de 30 dias**.

## Porquê existe

A Neon (plano gratuito) só garante 6 horas de histórico point-in-time. Isto
dá uma cópia diária própria, independente do plano da Neon, com 30 dias de
retenção.

## Restauro

Ver `01_CODIGO/prisma/restaurar-backup.ts` — script testado de ponta a
ponta em 2026-08-31 numa branch de teste isolada da Neon (criada e apagada
só para o teste, nunca tocou em produção): 23/23 tabelas restauradas,
contagens exactas, integridade relacional confirmada com queries reais.

```powershell
DATABASE_URL="<destino>" npx tsx prisma/restaurar-backup.ts backup.json
```

## Endpoints usados

- `GET /api/v1/admin/backup` (`X-API-Key: {{API_KEY_ADMIN}}`)
- Google Drive (credencial nativa N8N, `Google Drive account`)
