"use server";

import { getContextoUtilizador } from "@/lib/contexto-utilizador";

export async function testarWebhookN8N(url: string): Promise<{ ok: boolean; status?: number }> {
  const ctx = await getContextoUtilizador();
  if (!ctx.isAdmin) throw new Error("Sem permissão");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teste: true, origem: "crm-integracoes" }),
      signal: AbortSignal.timeout(5000),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false };
  }
}
