import Link from "next/link";
import UserMenu from "./components/UserMenu";

const sections = [
  {
    id: "projects",
    label: "Proyectos",
    href: "#projects",
    subtle: true,
  },
  {
    id: "quotes",
    label: "Cotizaciones",
    href: "#quotes",
    subtle: true,
  },
  {
    id: "tools",
    label: "Herramientas",
    href: "#tools",
    subtle: true,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F8F6F2] text-[#171717] flex flex-col">
      <header className="border-b border-neutral-200/70 bg-[#F8F6F2]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="tracking-[0.35em] text-xs uppercase text-neutral-500">
            LATINA
          </div>
          <nav className="flex items-center gap-6 text-xs text-neutral-500">
            {sections.map((section) => (
              <a
                key={section.id}
                href={section.href}
                className="hover:text-neutral-900 transition-colors"
              >
                {section.label}
              </a>
            ))}
            <UserMenu />
          </nav>
        </div>
      </header>

      <div className="flex-1">
        <section
          aria-label="Overview"
          className="border-b border-neutral-200/70"
        >
          <div className="max-w-6xl mx-auto px-6 py-16 grid gap-12 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)] items-end">
            <div className="space-y-8">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">
                  Panel Principal
                </p>
                <h1 className="text-3xl md:text-4xl font-light leading-snug text-neutral-900">
                  Diseño de interiores para{" "}
                  <span className="underline decoration-neutral-400/60 underline-offset-4">
                    espacios
                  </span>{" "}
                  y{" "}
                  <span className="underline decoration-neutral-400/60 underline-offset-4">
                    piezas
                  </span>
                  .
                </h1>
              </div>
              <p className="text-sm md:text-base text-neutral-500 max-w-xl leading-relaxed">
                Captura un brief, esboza la intención y llega a un número
                con el que puedas respaldar. Diseñado como una superficie interna para
                diseñadores que ya piensan en capas.
              </p>
              <div className="flex flex-wrap gap-3 text-xs">
                <Link
                  href="/projects"
                  className="inline-flex items-center justify-center rounded-full border border-neutral-900 bg-neutral-900 px-4 py-2 text-neutral-50 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                >
                  Proyectos
                </Link>
                <Link
                  href="/quotes"
                  className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
                >
                  Crear cotización
                </Link>
                <Link
                  href="/tools/enhancer"
                  className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
                >
                  Asistente de render
                </Link>
              </div>
            </div>

            <div className="space-y-6 text-xs text-neutral-500">
              <div className="border border-neutral-200 rounded-2xl bg-white/70 backdrop-blur-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-[0.2em] text-[0.6rem]">
                    Resumen
                  </span>
                  <span className="text-[0.6rem] text-neutral-400">
                    Vista interna
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-neutral-400">Esta semana</span>
                    <span className="text-neutral-900 text-sm">
                      Cotizaciones.
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-[0.7rem]">
                    <div className="border border-neutral-200 rounded-xl px-3 py-3 space-y-1">
                      <div className="text-neutral-900 text-base font-light">
                        0
                      </div>
                      <div className="text-neutral-400">Espacios</div>
                    </div>
                    <div className="border border-neutral-200 rounded-xl px-3 py-3 space-y-1">
                      <div className="text-neutral-900 text-base font-light">
                        0
                      </div>
                      <div className="text-neutral-400">Piezas</div>
                    </div>
                    <div className="border border-neutral-200 rounded-xl px-3 py-3 space-y-1">
                      <div className="text-neutral-900 text-base font-light">
                        0
                      </div>
                      <div className="text-neutral-400">Enviadas esta semana</div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[0.7rem] text-neutral-400 leading-relaxed">
                Esta información es privada, no de acceso público.
              </p>
            </div>
          </div>
        </section>

        <section
          id="quotes"
          aria-label="Quotes"
          className="border-b border-neutral-200/70 bg-[#F8F6F2]"
        >
          <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                Cotizaciones
              </p>
              <p className="text-sm text-neutral-500 mt-2 max-w-md">
                Un espacio completo o una pieza individual.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              <Link
                href="/quotes/space"
                className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
              >
                Cotización diseño de espacios
              </Link>
              <Link
                href="/quotes/furniture"
                className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
              >
                Cotización pieza de mobiliario
              </Link>
            </div>
          </div>
        </section>

        <section
          id="tools"
          aria-label="Tools"
          className="border-b border-neutral-200/70 bg-white"
        >
          <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                Herramientas
              </p>
              <p className="text-sm text-neutral-500 mt-2 max-w-md">
                Pequeños asistentes para render, notas y archivos. 
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              <Link
                href="/tools/enhancer"
                className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
              >
                Mejorador de imágenes de propuesta
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
