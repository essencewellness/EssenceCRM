import type { Metadata } from "next";
import { DM_Serif_Display, Manrope } from "next/font/google";
import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";
import "./globals.css";

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
      className={`${dmSerifDisplay.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:text-xs focus:font-medium focus:tracking-widest focus:uppercase focus:bg-[var(--nuit-champagne)] focus:text-[var(--nuit-midnight)]"
          style={{ letterSpacing: "0.1em" }}
        >
          Saltar para o conteúdo
        </a>
        {/* "user" = respeita o prefers-reduced-motion do SO em todas as
            animações motion/react da app — regra vinculativa do design
            system NUIT v1.5.0, sem precisar de tocar em cada componente. */}
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
