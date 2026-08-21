"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

const BONE = "var(--nuit-bone)";
const CHAMPAGNE = "var(--nuit-champagne)";
const SMOKE = "var(--nuit-bone-soft)";
const DEEP = "var(--nuit-deep)";
const TERRA = "#c98a78";

// callbackUrl só pode ser caminho interno — nunca URL absoluta (open redirect)
function sanitizarDestino(url: string): string {
  return url.startsWith("/") && !url.startsWith("//") ? url : "/";
}

export function LoginForm({ hasError, callbackUrl = "/" }: { hasError: boolean; callbackUrl?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(hasError);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const form = e.currentTarget;
    const username = (form.elements.namedItem("username") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(true);
      setLoading(false);
    } else {
      router.push(sanitizarDestino(callbackUrl));
      router.refresh();
    }
  }

  const inputStyle: React.CSSProperties = {
    backgroundColor: DEEP,
    border: "1px solid rgba(212,184,134,0.18)",
    borderRadius: "3px",
    color: BONE,
    fontFamily: "var(--font-sans, sans-serif)",
  };

  return (
    <>
      {error && (
        <div
          className="mb-6 px-4 py-3 text-sm"
          role="alert"
          style={{
            backgroundColor: "rgba(176,96,80,0.12)",
            border: "1px solid rgba(176,96,80,0.35)",
            borderRadius: "3px",
            color: TERRA,
            fontFamily: "var(--font-sans, sans-serif)",
            lineHeight: 1.55,
          }}
        >
          Username ou password incorrectos. Após 5 tentativas falhadas, o acesso
          fica bloqueado durante 15 minutos.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label
            htmlFor="username"
            className="block"
            style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: CHAMPAGNE,
            }}
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            placeholder="bea"
            className="w-full px-4 py-2.5 text-sm outline-none transition-all placeholder:opacity-40"
            style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = "rgba(212,184,134,0.55)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(212,184,134,0.18)"; }}
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block"
            style={{
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: CHAMPAGNE,
            }}
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="w-full px-4 py-2.5 text-sm outline-none transition-all placeholder:opacity-40"
            style={inputStyle}
            onFocus={(e) => { e.target.style.borderColor = "rgba(212,184,134,0.55)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(212,184,134,0.18)"; }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 transition-opacity duration-200 mt-2 disabled:opacity-60 hover:opacity-85 cursor-pointer"
          style={{
            backgroundColor: CHAMPAGNE,
            color: "var(--nuit-midnight)",
            border: "none",
            borderRadius: "3px",
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
          }}
        >
          {loading ? "A entrar…" : "Entrar"}
        </button>

        <p
          style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "11px",
            color: SMOKE,
            textAlign: "center",
            lineHeight: 1.6,
            marginTop: "8px",
          }}
        >
          Sessão segura — expira automaticamente após 12 horas.
        </p>
      </form>
    </>
  );
}
