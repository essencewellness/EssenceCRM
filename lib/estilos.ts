// Estilos partilhados por componentes de formulário do dashboard.
//
// Todo o dashboard usa `outline: "none"` nos campos (para desenhar o
// contorno dourado da marca em vez do azul nativo do browser), mas isso
// só é seguro se cada campo compensar com um foco visível próprio —
// senão quem navega por teclado (Tab) perde por completo o rasto de
// onde está. Usar sempre em conjunto com onFocusCampo/onBlurCampo.
export const FOCO_DOURADO = "0 0 0 3px rgba(212,184,134,0.25)"

export function onFocusCampo(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.boxShadow = FOCO_DOURADO
}

export function onBlurCampo(e: React.FocusEvent<HTMLElement>) {
  e.currentTarget.style.boxShadow = "none"
}
