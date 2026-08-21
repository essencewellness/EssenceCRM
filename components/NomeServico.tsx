// Destaca "a dois"/"a duas" em itálico e dourado dentro do nome de um serviço,
// para ficar claro à primeira vista que é uma sessão para duas pessoas.
export function NomeServico({ nome }: { nome: string }) {
  const match = nome.match(/(a dois|a duas)/i)
  if (!match || match.index === undefined) return <>{nome}</>

  const antes = nome.slice(0, match.index)
  const termo = match[0]
  const depois = nome.slice(match.index + termo.length)

  return (
    <>
      {antes}
      <em style={{ fontStyle: "italic", color: "var(--nuit-champagne-soft)", fontWeight: 700 }}>{termo}</em>
      {depois}
    </>
  )
}
