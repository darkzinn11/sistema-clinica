import type { Transition } from "motion/react";

/**
 * Movimento padrão das abas do sistema (o mesmo do Liquid Tabs):
 * o indicador da aba ativa desliza com uma mola sem balanço, e o conteúdo novo
 * entra pelo lado para onde se foi, saindo de um leve desfoque.
 */
export const TAB_SLIDE: Transition = { type: "spring", visualDuration: 0.55, bounce: 0.12 };

const PANEL_SPRING: Transition = { type: "spring", visualDuration: 0.45, bounce: 0 };

/** Props de motion para o painel de uma aba; `dir` é 1 (foi para a direita) ou -1. */
export function panelEnter(dir: number) {
  return {
    initial: { opacity: 0, x: dir * 18, filter: "blur(4px)" },
    // no fim o filtro sai de vez: parado em blur(0) ele ainda criaria um contexto de composição no conteúdo
    animate: { opacity: 1, x: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } },
    transition: PANEL_SPRING,
  };
}
