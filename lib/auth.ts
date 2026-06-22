import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auditar, loginsFalhadosRecentes } from "@/lib/audit";

// Proteção brute-force: 5 tentativas falhadas em 15 min → conta bloqueada 15 min
const MAX_TENTATIVAS = 5;
const JANELA_MINUTOS = 15;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 }, // sessão expira em 12h
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const identifier = (credentials.username as string).toLowerCase().trim();

        // Lockout: demasiadas falhas recentes → recusar sem sequer verificar
        const falhas = await loginsFalhadosRecentes(identifier, JANELA_MINUTOS);
        if (falhas >= MAX_TENTATIVAS) {
          auditar({ quem: identifier, acao: "login.bloqueado", detalhe: { falhas } });
          return null;
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
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { username?: string }).username = token.username as string;
        (session.user as { precisaMudarPassword?: boolean }).precisaMudarPassword = token.precisaMudarPassword as boolean;
      }
      return session;
    },
  },
});
