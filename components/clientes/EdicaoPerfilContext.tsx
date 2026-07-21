"use client"

import { createContext, useContext, useState } from "react"

interface EdicaoPerfilCtx {
  editing: boolean
  setEditing: (v: boolean) => void
}

const Ctx = createContext<EdicaoPerfilCtx | null>(null)

// Um único botão liga/desliga o modo de edição de toda a ficha do cliente
// (cabeçalho + informações gerais). Os InlineEditField dentro do Provider
// leem este contexto automaticamente — não precisam de receber `editing`
// como prop. Fora do Provider (ex: drawer de sessões), continuam a
// funcionar no modo antigo (clicar em cada campo individualmente).
export function EdicaoPerfilProvider({ children }: { children: React.ReactNode }) {
  const [editing, setEditing] = useState(false)
  return <Ctx.Provider value={{ editing, setEditing }}>{children}</Ctx.Provider>
}

export function useEdicaoPerfilOpcional() {
  return useContext(Ctx)
}

export function useEdicaoPerfil() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useEdicaoPerfil deve ser usado dentro de EdicaoPerfilProvider")
  return ctx
}
