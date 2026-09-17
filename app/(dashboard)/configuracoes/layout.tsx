import { auth } from "@/lib/auth";
import { ConfiguracoesNav } from "./ConfiguracoesNav";

export default async function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role ?? "terapeuta";
  const isAdmin = role === "admin";

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", paddingTop: "8px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{
          fontFamily: "var(--font-heading, Georgia, serif)",
          fontSize: "calc(22px * var(--ui-font-scale))",
          color: "var(--nuit-bone)",
          fontWeight: 400,
          letterSpacing: "-0.01em",
          marginBottom: "4px",
        }}>
          Configurações
        </h1>
        <p style={{
          fontFamily: "var(--font-sans, sans-serif)",
          fontSize: "calc(13px * var(--ui-font-scale))",
          color: "#9d9d9a",
        }}>
          Gere as preferências e definições do CRM
        </p>
      </div>

      <ConfiguracoesNav isAdmin={isAdmin} />

      <div>{children}</div>
    </div>
  );
}
