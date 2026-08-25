import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auditar, loginsFalhadosRecentes, loginsFalhadosPorIp } from "@/lib/audit";
import { isSecureCookieEnv } from "@/lib/env";

// Proteção brute-force: 5 tentativas falhadas em 15 min → conta bloqueada 15 min
const MAX_TENTATIVAS = 5;
const JANELA_MINUTOS = 15;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 }, // sessão expira em 12h
  // Partilhado com proxy.ts via lib/env.ts — as duas condições já
  // andaram desalinhadas, daí não repetir a expressão em cada ficheiro.
  useSecureCookies: isSecureCookieEnv(),
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.username || !credentials?.password) return null;

        const identifier = (credentials.username as string).toLowerCase().trim();
        const ip = (request as Request).headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

        // Lockout por conta: demasiadas falhas recentes → recusar
        const falhas = await loginsFalhadosRecentes(identifier, JANELA_MINUTOS);
        if (falhas >= MAX_TENTATIVAS) {
          auditar({ quem: identifier, acao: "login.bloqueado", detalhe: { falhas }, ip });
          return null;
        }

        // Lockout por IP: evita ataques multi-conta do mesmo IP (threshold 3×)
        if (ip) {
          const falhasIp = await loginsFalhadosPorIp(ip, JANELA_MINUTOS);
          if (falhasIp >= MAX_TENTATIVAS * 3) {
            auditar({ quem: `ip:${ip}`, acao: "login.bloqueado_ip", detalhe: { falhasIp }, ip });
            return null;
          }
        }

        // Suporta login por username OU email (backward compat durante migração)
        const user = await prisma.user.findFirst({
          where: {
            AND: [
              { ativo: true },
              { OR: [{ username: identifier }, { email: identifier }] },
            ],
          },
        });

        // bcrypt.compare corre sempre (hash dummy) — sem oráculo de "username existe"
        const hash =
          user?.password ??
          "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalida";
        const valid = await bcrypt.compare(credentials.password as string, hash);

        if (!user?.password || !valid) {
          auditar({ quem: identifier, acao: "login.falhado" });
          return null;
        }

        auditar({ quem: identifier, acao: "login.sucesso", entidade: "User", entidadeId: user.id });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          username: user.username ?? identifier,
          precisaMudarPassword: user.precisaMudarPassword,
          preferenciaFonte: user.preferenciaFonte,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "terapeuta";
        token.username = (user as { username?: string }).username ?? "";
        token.precisaMudarPassword = (user as { precisaMudarPassword?: boolean }).precisaMudarPassword ?? false;
        token.preferenciaFonte = (user as { preferenciaFonte?: string }).preferenciaFonte ?? "baixo";
        token.ativo = true; // authorize() já filtra ativo:true — sempre verdadeiro num login novo
      } else if (token.id) {
        // Revalida a cada pedido (jwt() corre em todo o auth()/getToken(), não só no
        // login) — sem isto, desativar uma conta (configuracoes/utilizadores) não
        // revogava o acesso até a sessão expirar (12h): bug real encontrado em
        // produção 2026-08-12 na mesma família do de precisaMudarPassword. Custo:
        // 1 lookup indexado por id, aceitável face ao risco de acesso pós-revogação.
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { ativo: true, role: true, precisaMudarPassword: true, preferenciaFonte: true },
        });
        token.ativo = dbUser?.ativo ?? false;
        if (dbUser) {
          token.role = dbUser.role;
          token.precisaMudarPassword = dbUser.precisaMudarPassword;
          token.preferenciaFonte = dbUser.preferenciaFonte;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { username?: string }).username = token.username as string;
        (session.user as { precisaMudarPassword?: boolean }).precisaMudarPassword = token.precisaMudarPassword as boolean;
        (session.user as { ativo?: boolean }).ativo = token.ativo as boolean;
        (session.user as { preferenciaFonte?: string }).preferenciaFonte = (token.preferenciaFonte as string) ?? "baixo";
      }
      return session;
    },
  },
});
