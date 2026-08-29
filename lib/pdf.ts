import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import type { Sessao, Cliente } from "@/lib/prisma-client"

type DadosSessao = Pick<
  Sessao,
  | "data" | "hora" | "duracao" | "servico"
  | "aromaSessao" | "resumoSessao" | "notasPosSessao"
  | "estadoEmocional" | "dataRecomendadaRegresso"
> & {
  // Nome oficial via terapeutaId (User.name), resolvido pelo chamador —
  // nunca o texto livre Sessao.terapeuta, que tem valores antigos
  // inconsistentes ("beatriz" minúsculas vs "Beatriz Leão").
  nomeTerapeuta: string | null
}

type DadosCliente = Pick<Cliente, "nome" | "dataNascimento">

function formatarData(d: Date): string {
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export async function gerarPdfSessao(
  sessao: DadosSessao,
  cliente: DadosCliente
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842]) // A4
  const { width, height } = page.getSize()

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const fontNormal = await doc.embedFont(StandardFonts.Helvetica)

  const corPrincipal = rgb(0.28, 0.49, 0.45) // verde Essence
  const corTexto = rgb(0.15, 0.15, 0.15)
  const corCinza = rgb(0.45, 0.45, 0.45)

  let y = height - 50

  // Cabeçalho
  page.drawText("Essence Wellness", { x: 50, y, font: fontBold, size: 20, color: corPrincipal })
  y -= 18
  page.drawText("geral@essencewellnesspt.com | essencewellnesspt.com", {
    x: 50, y, font: fontNormal, size: 9, color: corCinza,
  })
  y -= 8
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: corPrincipal })
  y -= 24

  // Título
  page.drawText("Relatório de Sessão", { x: 50, y, font: fontBold, size: 14, color: corTexto })
  y -= 28

  // Dados do cliente
  page.drawText("CLIENTE", { x: 50, y, font: fontBold, size: 9, color: corCinza })
  y -= 14
  page.drawText(cliente.nome, { x: 50, y, font: fontBold, size: 12, color: corTexto })
  y -= 14
  if (cliente.dataNascimento) {
    page.drawText(`Data de nascimento: ${formatarData(new Date(cliente.dataNascimento))}`, {
      x: 50, y, font: fontNormal, size: 10, color: corTexto,
    })
    y -= 14
  }
  y -= 10

  // Dados da sessão
  page.drawText("SESSÃO", { x: 50, y, font: fontBold, size: 9, color: corCinza })
  y -= 14

  const linhasSessao = [
    ["Data", formatarData(new Date(sessao.data))],
    ["Hora", sessao.hora ?? "—"],
    ["Duração", sessao.duracao ? `${sessao.duracao} minutos` : "—"],
    ["Serviço", sessao.servico ?? "—"],
    ["Terapeuta", sessao.nomeTerapeuta ?? "-"],
    ["Aroma utilizado", sessao.aromaSessao ?? "—"],
    ["Estado emocional", sessao.estadoEmocional ?? "—"],
  ]

  for (const [label, valor] of linhasSessao) {
    page.drawText(`${label}:`, { x: 50, y, font: fontBold, size: 10, color: corTexto })
    page.drawText(valor, { x: 180, y, font: fontNormal, size: 10, color: corTexto })
    y -= 14
  }
  y -= 10

  // Resumo
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })
  y -= 18
  page.drawText("RESUMO DA SESSÃO", { x: 50, y, font: fontBold, size: 9, color: corCinza })
  y -= 16

  const linhasResumo = wrapText(sessao.resumoSessao ?? "", 85)
  for (const linha of linhasResumo) {
    if (y < 80) break
    page.drawText(linha, { x: 50, y, font: fontNormal, size: 10, color: corTexto })
    y -= 14
  }
  y -= 10

  // Notas pós-sessão
  if (sessao.notasPosSessao) {
    page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })
    y -= 18
    page.drawText("NOTAS PÓS-SESSÃO", { x: 50, y, font: fontBold, size: 9, color: corCinza })
    y -= 16
    for (const linha of wrapText(sessao.notasPosSessao, 85)) {
      if (y < 80) break
      page.drawText(linha, { x: 50, y, font: fontNormal, size: 10, color: corTexto })
      y -= 14
    }
    y -= 10
  }

  // Data recomendada de regresso
  if (sessao.dataRecomendadaRegresso) {
    page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })
    y -= 18
    page.drawText("PRÓXIMA SESSÃO RECOMENDADA", { x: 50, y, font: fontBold, size: 9, color: corCinza })
    y -= 16
    page.drawText(formatarData(new Date(sessao.dataRecomendadaRegresso)), {
      x: 50, y, font: fontNormal, size: 10, color: corTexto,
    })
  }

  // Rodapé
  const dataGeracao = formatarData(new Date())
  page.drawLine({
    start: { x: 50, y: 50 }, end: { x: width - 50, y: 50 },
    thickness: 0.5, color: rgb(0.8, 0.8, 0.8),
  })
  page.drawText(`Gerado em ${dataGeracao} · Essence Wellness`, {
    x: 50, y: 35, font: fontNormal, size: 8, color: corCinza,
  })

  return doc.save()
}

function wrapText(text: string, maxChars: number): string[] {
  const palavras = text.split(" ")
  const linhas: string[] = []
  let atual = ""
  for (const palavra of palavras) {
    if ((atual + " " + palavra).trim().length > maxChars) {
      if (atual) linhas.push(atual.trim())
      atual = palavra
    } else {
      atual = atual ? atual + " " + palavra : palavra
    }
  }
  if (atual) linhas.push(atual.trim())
  return linhas
}
