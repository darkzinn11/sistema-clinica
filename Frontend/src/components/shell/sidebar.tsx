
import { ArrowDown2, ExportSquare, Lifebuoy, SidebarLeft, SidebarRight } from "iconsax-reactjs";
import { Link } from "react-router";
import { useLocation } from "react-router";
import { useState, type CSSProperties } from "react";
import { NAV, type NavItem, findActiveChild, findSection } from "@/lib/nav";
import { Tooltip } from "@/components/ui/misc";
import { Modal } from "@/components/ui/overlay";
import { cn } from "@/lib/cn";
import { BrandLogo } from "@/components/shell/brand-logo";

function Logo({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      to="/inicio"
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden rounded-xl transition-[opacity,transform] duration-200 hover:opacity-85 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        collapsed ? "px-0" : "px-2",
      )}
    >
      <BrandLogo reduced={collapsed} className={collapsed ? "h-[38px] w-auto max-w-full shrink-0 object-contain" : "h-[48px] w-auto max-w-full shrink-0 object-contain"} />
    </Link>
  );
}

/** Ampliação progressiva (efeito dock) com influência nos ícones vizinhos. */
function dockScale(index: number, hovered: number | null): number {
  if (hovered === null) return 1;
  const distance = Math.abs(index - hovered);
  if (distance === 0) return 1.12;
  if (distance === 1) return 1.035;
  return 1;
}

const DOCK_INDEX = new Map(NAV.flatMap((group) => group.items).map((item, index) => [item.href, index]));

function Item({
  item, collapsed, pathname, onNavigate, dockIndex, dockHovered, onDockHover,
}: {
  item: NavItem;
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
  dockIndex: number;
  dockHovered: number | null;
  onDockHover: (index: number) => void;
}) {
  const section = findSection(pathname);
  const isActive = section?.href === item.href;
  const hasSubmenu = !!item.children?.length && !item.childrenInPage;
  const [open, setOpen] = useState(isActive);
  const [wasActive, setWasActive] = useState(isActive);
  // Expande sozinho ao entrar na seção (isActive virar true), mas não força
  // aberto a cada render — senão o botão de recolher nunca conseguiria fechar
  // o grupo da página em que você já está.
  if (isActive !== wasActive) {
    setWasActive(isActive);
    if (isActive) setOpen(true);
  }
  const expanded = hasSubmenu && open && !collapsed;
  const activeChild = isActive ? findActiveChild(item, pathname) : undefined;
  const Icon = item.icon;

  const rowCls = cn(
    "ui-nav-link group flex h-10 w-full items-center gap-3 rounded-full px-3 text-base font-medium",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    collapsed
      ? "ms-dock-item relative justify-center px-0 text-text-muted"
      : isActive ? "ui-nav-active bg-accent-muted text-text" : "text-text-muted hover:bg-surface hover:text-text",
  );

  const link = (
    <Link
      to={item.href}
      onClick={onNavigate}
      onMouseEnter={collapsed ? () => onDockHover(dockIndex) : undefined}
      onFocus={collapsed ? () => onDockHover(dockIndex) : undefined}
      aria-label={collapsed ? item.label : undefined}
      aria-current={isActive && !activeChild ? "page" : undefined}
      data-active={collapsed && isActive ? "true" : undefined}
      className={rowCls}
    >
      {collapsed ? (
        <span
          aria-hidden
          className="ms-dock-icon pointer-events-none inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full"
          style={{ "--ms-dock-scale": dockScale(dockIndex, dockHovered) } as CSSProperties}
        >
          <Icon size={20} variant={isActive ? "Bulk" : "Linear"} className="shrink-0" />
        </span>
      ) : (
        <>
          <Icon size={18} variant={isActive ? "Bulk" : "Linear"} aria-hidden className="shrink-0" />
          <span className="flex-1 truncate">{item.label}</span>
        </>
      )}
    </Link>
  );

  return (
    <li className={collapsed ? "relative" : undefined} style={collapsed ? { zIndex: dockHovered === dockIndex ? 2 : 1 } : undefined}>
      <div className="relative flex items-center">
        {collapsed ? (
          <Tooltip content={item.label} side="right">
            {link}
          </Tooltip>
        ) : (
          link
        )}
        {hasSubmenu && !collapsed && (
          <button
            type="button"
            aria-label={`${expanded ? "Recolher" : "Expandir"} ${item.label}`}
            aria-expanded={expanded}
            onClick={() => setOpen(!expanded)}
            className={cn("ui-nav-toggle absolute right-1 flex h-7 w-7 items-center justify-center rounded-full transition-colors", isActive ? "ui-nav-toggle-active text-text-muted hover:bg-accent-muted" : "text-text-subtle hover:bg-surface hover:text-text")}
          >
            <ArrowDown2 size={15} aria-hidden className={cn("transition-transform duration-300", expanded && "rotate-180")} />
          </button>
        )}
      </div>
      {expanded && (
        <ul className="ui-submenu-enter mb-2 ml-[23px] mt-1 flex flex-col gap-0.5 border-l border-border pl-3">
          {item.children!.map((child) => {
            const active = activeChild?.href === child.href;
            return (
              <li key={child.href}>
                <Link
                  to={child.href}
                  target={child.external ? "_blank" : undefined}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "ui-nav-link flex h-8 items-center justify-between gap-2 rounded-full px-3 text-sm",
                    active ? "font-medium text-accent bg-accent-muted" : "text-text-muted hover:bg-surface-raised hover:text-text",
                  )}
                >
                  {child.label}
                  {child.external && <ExportSquare size={12} aria-label="abre em nova aba" className="text-text-subtle" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  onNavigate,
  mobile,
}: {
  collapsed: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  const pathname = useLocation().pathname;
  const [dockHovered, setDockHovered] = useState<number | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        "flex h-full flex-col",
        "ui-shell-sidebar", mobile && "rounded-none",
        collapsed ? "w-[72px]" : "w-[260px]",
        "transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
      )}
    >
      <div className={cn("flex shrink-0 items-center justify-center", mobile ? "h-[96px] px-4" : collapsed ? "h-[96px] px-2" : "h-[96px] px-4")}>
        <Logo collapsed={collapsed} />
      </div>
      <div
        className={cn("ui-scrollbar min-h-0 flex-1 overflow-y-auto px-3 pb-3", mobile ? "pt-3" : collapsed ? "pt-10" : "pt-3")}
        onMouseLeave={collapsed ? () => setDockHovered(null) : undefined}
        onBlurCapture={collapsed ? (event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDockHovered(null);
        } : undefined}
      >
        {NAV.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            {!collapsed && <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.09em] text-text-subtle">{group.label}</p>}
            {collapsed && <div aria-hidden className="mx-auto mb-2 h-px w-6 bg-border first:hidden" />}
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => (
                <Item
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  pathname={pathname}
                  onNavigate={onNavigate}
                  dockIndex={DOCK_INDEX.get(item.href) ?? 0}
                  dockHovered={collapsed ? dockHovered : null}
                  onDockHover={setDockHovered}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className={cn("flex shrink-0 items-center gap-1 p-3", collapsed && "flex-col")}>
        {collapsed ? (
          <Tooltip content="Ajuda e suporte" side="right">
            <button type="button" onClick={() => setHelpOpen(true)} aria-label="Ajuda e suporte" className="ui-nav-link ms-dock-footer-control flex h-10 w-full items-center justify-center rounded-full text-text-muted hover:bg-surface hover:text-text">
              <Lifebuoy size={18} aria-hidden />
            </button>
          </Tooltip>
        ) : (
          <button type="button" onClick={() => setHelpOpen(true)} className="ui-nav-link flex h-10 flex-1 items-center gap-3 rounded-full px-3 text-left text-sm text-text-muted hover:bg-surface-raised hover:text-text">
            <Lifebuoy size={18} aria-hidden /> Ajuda e suporte
          </button>
        )}
        {!mobile && onToggleCollapsed && (
          collapsed ? (
            <Tooltip content="Expandir menu" side="right">
              <button
                type="button"
                onClick={onToggleCollapsed}
                aria-label="Expandir menu"
                className="ui-nav-link ms-dock-footer-control flex h-9 w-full shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface hover:text-text"
              >
                <SidebarRight size={18} aria-hidden />
              </button>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label="Recolher menu"
              className="ui-nav-link flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-raised hover:text-text"
            >
              <SidebarLeft size={18} aria-hidden />
            </button>
          )
        )}
      </div>
      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="Ajuda e suporte"
        description="Orientações rápidas para navegar no MultiSaúde."
        size="sm"
      >
        <div className="space-y-3 text-sm text-text-muted">
          <p>Use o menu lateral para acessar as áreas do sistema. Com a barra recolhida, passe o cursor ou use Tab para identificar cada aba.</p>
          <p>Para localizar pacientes, telas e ações, pressione <kbd className="rounded border border-border px-1.5 py-0.5 font-medium text-text">⌘/Ctrl + K</kbd> ou use a busca no topo.</p>
          <p>Para questões administrativas ou suporte técnico, procure o responsável pela clínica.</p>
        </div>
      </Modal>
    </nav>
  );
}
