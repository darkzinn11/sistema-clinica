import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <h1 className="text-xl font-semibold text-text">Clínica (clone)</h1>
      <p className="max-w-md text-base text-text-muted">
        As telas do produto chegam em /replica-build. Por enquanto, confira o
        design system em desenvolvimento.
      </p>
      <Link href="/design" className="text-accent underline">
        Ver design system →
      </Link>
    </main>
  );
}
