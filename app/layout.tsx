import type { Metadata } from "next";
import { DM_Serif_Display, Manrope } from "next/font/google";
import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

// Corre antes da hidratação React — sem isto via <head>, a página nasce
// sempre no tema do :root (dark) e só troca para light depois do primeiro
// render, criando um flash visível para quem tem light guardado.
const THEME_INIT_SCRIPT = `
try {
  var t = localStorage.getItem("ew-crm-theme");
  if (t === "light") document.documentElement.classList.remove("dark");
  else document.documentElement.classList.add("dark");
} catch (e) { document.documentElement.classList.add("dark"); }
`;

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Essence Wellness CRM",
  description: "Gestão de clientes e sessões · Essence Wellness",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt"
      // "dark" por omissão no HTML servido (SSR não sabe o localStorage do
      // browser) — o script abaixo corrige para "light" antes do primeiro
      // paint se for essa a preferência guardada.
      className={`${dmSerifDisplay.variable} ${manrope.variable} h-full antialiased dark`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:text-xs focus:font-medium focus:tracking-widest focus:uppercase focus:bg-[var(--nuit-champagne)] focus:text-[var(--nuit-midnight)]"
          style={{ letterSpacing: "0.1em" }}
        >
          Saltar para o conteúdo
        </a>
        <ThemeProvider>
          {/* "user" = respeita o prefers-reduced-motion do SO em todas as
              animações motion/react da app — regra vinculativa do design
              system NUIT v1.5.0, sem precisar de tocar em cada componente. */}
          <MotionConfig reducedMotion="user">{children}</MotionConfig>
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
