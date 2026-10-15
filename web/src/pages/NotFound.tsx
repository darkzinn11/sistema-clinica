import { IconCircle } from "@/components/ui/icon-circle";
import { Discover } from "iconsax-reactjs";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <IconCircle tone="neutral" size="2xl">
        <Discover size={22} aria-hidden />
      </IconCircle>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-text">Página não encontrada</h1>
        <p className="text-base text-text-muted">O endereço pode ter mudado ou não existir.</p>
      </div>
      <ButtonLink to="/inicio" variant="primary">Voltar ao início</ButtonLink>
    </div>
  );
}
