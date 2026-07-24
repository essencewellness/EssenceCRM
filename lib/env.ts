// Se este ficheiro se tornar demasiado genérico, mover para vários helpers —
// por agora só existe para evitar que a condição de cookies seguros derive
// entre lib/auth.ts e proxy.ts (já aconteceu uma vez).
export function isSecureCookieEnv(): boolean {
  return process.env.NODE_ENV === "production";
}
