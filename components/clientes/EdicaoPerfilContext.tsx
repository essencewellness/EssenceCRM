"use client"

import { createContext, useContext, useRef, useState } from "react"

interface EdicaoPerfilCtx {
  editing: boolean
  setEditing: (v: boolean) => void
  /** Chamado por cada InlineEditField ao entrar em modo editável. Devolve
   *  `true` apenas para o primeiro a chamar depois de `editing` passar a
   *  `true` — esse é quem deve focar-se a si próprio (ver InlineEditField).
   */
  consumirFocoInicial: () => boolean
}

const Ctx = createContext<EdicaoPerfilCtx | null>(null)

// Um único botão liga/desliga o modo de edição de toda a ficha do cliente
// (cabeçalho + informações gerais). Os InlineEditField dentro do Provider
// leem este contexto automaticamente — não precisam de receber `editing`
// como prop. Fora do Provider (ex: drawer de sessões), continuam a
// funcionar no modo antigo (clicar em cada campo individualmente).
export function EdicaoPerfilProvider({ children }: { children: React.ReactNode }) {
  const [editing, setEditingState] = useState(false)
  const focoConsumidoRef = useRef(false)

  function setEditing(v: boolean) {
    // Nova sessão de edição: permite que o primeiro campo volte a focar-se.
    if (v) focoConsumidoRef.current = false
    setEditingState(v)
  }

  function consumirFocoInicial(): boolean {
    if (focoConsumidoRef.current) return false
    focoConsumidoRef.current = true
    return true
  }

  return (
    <Ctx.Provider value={{ editing, setEditing, consumirFocoInicial }}>
      {children}
    </Ctx.Provider>
  )
}

export function useEdicaoPerfilOpcional() {
  return useContext(Ctx)
}

export function useEdicaoPerfil() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useEdicaoPerfil deve ser usado dentro de EdicaoPerfilProvider")
  return ctx
}
