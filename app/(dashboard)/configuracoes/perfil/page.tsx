import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PerfilForm } from "./PerfilForm";

interface PerfilPageProps {
  searchParams: Promise<{ obrigatorio?: string }>;
}

export default async function PerfilPage({ searchParams }: PerfilPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { obrigatorio } = await searchParams;
  const ehObrigatorio = obrigatorio === "1";

  return (
    <div style={{ maxWidth: "520px" }}>
      {ehObrigatorio && (
        <div
          style={{
            marginBottom: "24px",
            padding: "14px 18px",
            backgroundColor: "rgba(185,160,122,0.10)",
            border: "1px solid rgba(185,160,122,0.35)",
            borderRadius: "4px",
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "13px",
            color: "#b9a07a",
            lineHeight: 1.6,
          }}
        >
          Por segurança, é necessário definir uma nova password antes de continuar.
        </div>
      )}

      <PerfilForm
        nomeInicial={session.user.name ?? ""}
        emailInicial={session.user.email ?? ""}
        obrigatorio={ehObrigatorio}
      />
    </div>
  );
}
