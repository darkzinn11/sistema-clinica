import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import type { Icon as IconType } from "iconsax-reactjs";
import { LayoutGroup, motion } from "motion/react";
import { TAB_SLIDE, panelEnter } from "@/lib/motion";
import "./liquid-tabs.css";

/**
 * Liquid Tabs (pinui), adaptado para as telas de cadastro.
 *
 * O corpo do card e a aba ativa são duas formas fundidas por um filtro "goo": a aba é parte do card
 * (uma orelha) e, ao trocar, escorre por baixo do próximo rótulo. O conteúdo da aba nova entra pelo
 * lado para onde se foi, saindo de um leve desfoque. Setas ← → trocam de aba.
 *
 * Diferenças do original: recebe as abas e o painel (o original trazia dados de notificação fixos),
 * usa a fonte e os tokens do sistema (o tema escuro vem junto) e não tem a faixa cinza atrás das abas.
 */

export interface LiquidTab {
  label: string;
  /** Ícone opcional antes do rótulo. */
  icon?: IconType;
  /** Contador opcional ao lado do rótulo. */
  count?: number;
}

const TAB_H = 56;


export default function LiquidTabs({
  tabs,
  defaultIndex = 0,
  corner = 22,
  label = "Seções",
  actions,
  active: activeProp,
  onChange,
  flush,
  children,
}: {
  tabs: LiquidTab[];
  defaultIndex?: number;
  /** Raio do card e da aba, 0–40px. */
  corner?: number;
  /** Nome da lista de abas para leitor de tela. */
  label?: string;
  /** Aba ativa controlada de fora (ex.: abas que são rotas). Sem isto, o componente guarda a aba sozinho. */
  active?: number;
  onChange?: (index: number) => void;
  /** Sem respiro no painel: para conteúdos que já trazem seus blocos (cards) com padding próprio. */
  flush?: boolean;
  /** Conteúdo à direita da linha de abas (ex.: busca). */
  actions?: ReactNode;
  /** Recebe o índice da aba ativa e devolve o painel. */
  children: (active: number) => ReactNode;
}) {
  const radius = Math.min(40, Math.max(0, corner));
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gooId = `pltabs-goo-${uid}`;

  const [activeState, setActiveState] = useState(defaultIndex);
  const active = activeProp ?? activeState;
  const [dir, setDir] = useState(1);

  /* a aba ativa é medida, para a orelha líquida deslizar até ela */
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [blob, setBlob] = useState<{ x: number; w: number } | null>(null);
  const [rootWidth, setRootWidth] = useState(0);
  // Bordas da linha de abas com mais abas escondidas: ganham um esmaecimento, para ficar claro que dá para rolar.
  const [fade, setFade] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const root = rootRef.current;
    const el = tabRefs.current[active];
    if (!root || !el) return;
    const r = root.getBoundingClientRect();
    const t = el.getBoundingClientRect();
    setBlob({ x: t.left - r.left, w: t.width });
    setRootWidth(r.width);
    const bar = barRef.current;
    if (bar) {
      const left = bar.scrollLeft > 1;
      const right = bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 1;
      setFade((f) => (f.left === left && f.right === right ? f : { left, right }));
    }
  }, [active]);

  useLayoutEffect(measure, [measure]);

  // A aba ativa sempre à vista na linha de abas (ex.: abrir direto numa seção do fim da lista), sem rolar a página.
  useLayoutEffect(() => {
    const bar = barRef.current;
    const el = tabRefs.current[active];
    if (!bar || !el) return;
    if (el.offsetLeft < bar.scrollLeft) bar.scrollLeft = el.offsetLeft - 16;
    else if (el.offsetLeft + el.offsetWidth > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = el.offsetLeft + el.offsetWidth - bar.clientWidth + 16;
  }, [active]);

  useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (rootRef.current) ro.observe(rootRef.current);
    tabRefs.current.forEach((el) => el && ro.observe(el));
    const bar = barRef.current;
    bar?.addEventListener("scroll", measure, { passive: true });
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      ro.disconnect();
      bar?.removeEventListener("scroll", measure);
    };
  }, [measure]);

  const select = (index: number) => {
    if (index === active) return;
    setDir(index > active ? 1 : -1);
    setActiveState(index);
    onChange?.(index);
  };

  const onTabKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    select(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <LayoutGroup id={uid}>
      <div ref={rootRef} className="pltabs">
        {/* o goo: desfoca e devolve o alfa a uma borda nítida */}
        <svg aria-hidden="true" className="pltabs__defs">
          <defs>
            <filter id={gooId} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
            </filter>
          </defs>
        </svg>

        {/* o card: corpo e orelha líquida, fundidos pelo goo */}
        <div aria-hidden="true" className="pltabs__surface">
          <div className="pltabs__gooLayer" style={{ filter: `url(#${gooId})` }}>
            {/* Quando a orelha encosta numa borda do card, aquele canto do corpo fica reto: dois cantos redondos
                se tocando ali faziam o goo "estrangular" a junção. */}
            <div
              className="pltabs__body"
              style={{
                top: TAB_H,
                borderRadius: `${blob && blob.x <= 1 ? 0 : radius + 2}px ${blob && rootWidth - (blob.x + blob.w) <= 1 ? 0 : radius + 2}px ${radius + 2}px ${radius + 2}px`,
              }}
            />
            {blob && (
              <motion.div
                className="pltabs__blob"
                // só os cantos de cima arredondados: embaixo a orelha se funde reta no corpo
                style={{ height: TAB_H + 18, borderRadius: `${radius + 2}px ${radius + 2}px 0 0` }}
                initial={false}
                animate={{ x: blob.x, width: blob.w }}
                transition={TAB_SLIDE}
              />
            )}
          </div>
        </div>

        <div className="pltabs__bar" style={{ height: TAB_H }}>
        <div ref={barRef} role="tablist" aria-label={label} className="pltabs__tabs" data-fade-left={fade.left} data-fade-right={fade.right}>
          {tabs.map((tab, i) => {
            const isActive = i === active;
            return (
              <button
                key={tab.label}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${uid}-tab-${i}`}
                aria-selected={isActive}
                aria-controls={`${uid}-panel`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => select(i)}
                onKeyDown={(e) => onTabKeyDown(e, i)}
                className="pltabs__tab"
                data-active={isActive}
              >
                <span className="pltabs__tabLabel">
                  {tab.icon && <tab.icon size={16} aria-hidden className="pltabs__icon" />}
                  {/* a barrinha mede exatamente o texto do rótulo (sem o contador) e desliza entre eles */}
                  <span className="pltabs__tabText">
                    {tab.label}
                    {isActive && <motion.span layoutId="underline" className="pltabs__underline" transition={TAB_SLIDE} />}
                  </span>
                  {tab.count !== undefined && <span className="pltabs__count">{tab.count}</span>}
                </span>
              </button>
            );
          })}
        </div>
        {actions && <div className="pltabs__actions">{actions}</div>}
        </div>

        <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${active}`} className={flush ? "pltabs__panel pltabs__panel--flush" : "pltabs__panel"}>
          <motion.div
            key={active}
            {...panelEnter(dir)}
          >
            {children(active)}
          </motion.div>
        </div>
      </div>
    </LayoutGroup>
  );
}
