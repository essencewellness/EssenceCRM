// Reexporta o client gerado pelo Prisma 7 (output custom em prisma/generated/prisma)
// a partir de um caminho estável — evita import relativo profundo espalhado por
// toda a app. Importar sempre daqui, nunca diretamente de "@prisma/client".
export * from "../prisma/generated/prisma/client"
