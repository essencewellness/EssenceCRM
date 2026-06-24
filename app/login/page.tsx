import Image from "next/image";
import { LoginForm } from "@/components/login-form";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const hasError = params.error === "credentials" || params.error === "CredentialsSignin";
  const callbackUrl = params.callbackUrl ?? "/";

  return (
    <main
      className="min-h-screen flex items-center justify-center relative"
      style={{ backgroundColor: "#161a26" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 90% 70% at 50% -20%, #0e1119 0%, transparent 65%)",
        }}
      />

      <div className="relative w-full max-w-sm px-6">
        {/* Lockup canónico NUIT — centrado */}
        <div className="mb-12 flex flex-col items-center gap-5">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Image
              src="/lotus.png"
              alt=""
              width={44}
              height={44}
              style={{ objectFit: "contain", opacity: 0.90 }}
              priority
              aria-hidden="true"
            />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "3px" }}>
              <span style={{
                fontFamily: "var(--font-heading, 'DM Serif Display', Georgia, serif)",
                fontSize: "28px",
                lineHeight: 1,
                color: "#ece6d6",
                letterSpacing: "-0.005em",
              }}>
                Essence
              </span>
              <span style={{
                fontFamily: "var(--font-heading, 'DM Serif Display', Georgia, serif)",
                fontSize: "14px",
                lineHeight: 1,
                color: "#d4b886",
              }}>
                Wellness
              </span>
            </div>
          </div>

          <div style={{ width: "26px", height: "1px", backgroundColor: "#d4b886", opacity: 0.45 }} />

          <p style={{
            fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
            fontSize: "9px",
            letterSpacing: "0.52em",
            textTransform: "uppercase",
            color: "#d4b886",
            fontWeight: 500,
            paddingLeft: "0.52em",
          }}>
            CRM
          </p>
        </div>

        {/* Cartão — overlay sobre midnight, hairline champagne */}
        <div
          className="p-8"
          style={{
            backgroundColor: "#1f2433",
            border: "1px solid rgba(212,184,134,0.16)",
            borderRadius: "4px",
            boxShadow: "0 30px 60px rgba(0,0,0,0.55), 0 10px 20px rgba(0,0,0,0.30)",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-heading, 'DM Serif Display', Georgia, serif)",
              color: "#ece6d6",
              fontSize: "22px",
              marginBottom: "4px",
              letterSpacing: "-0.005em",
            }}
          >
            Bem-vinda
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans, 'Manrope', sans-serif)",
              color: "var(--nuit-smoke)",
              fontSize: "13px",
              marginBottom: "28px",
              lineHeight: 1.6,
            }}
          >
            Acede à tua área de gestão de clientes.
          </p>

          <LoginForm hasError={hasError} callbackUrl={callbackUrl} />
        </div>

        <p
          className="mt-8 text-center"
          style={{
            fontFamily: "var(--font-sans, sans-serif)",
            fontSize: "10px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--nuit-smoke)",
          }}
        >
          Essence Wellness · Uso exclusivo interno
        </p>
      </div>
    </main>
  );
}
