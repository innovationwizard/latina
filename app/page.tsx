import Link from "next/link";

const sections = [
  {
    id: "projects",
    label: "Projects",
    href: "#projects",
    subtle: true,
  },
  {
    id: "quotes",
    label: "Quotes",
    href: "#quotes",
    subtle: true,
  },
  {
    id: "tools",
    label: "Tools",
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
                  Studio Console
                </p>
                <h1 className="text-3xl md:text-4xl font-light leading-snug text-neutral-900">
                  Quiet control for{" "}
                  <span className="underline decoration-neutral-400/60 underline-offset-4">
                    rooms
                  </span>{" "}
                  and{" "}
                  <span className="underline decoration-neutral-400/60 underline-offset-4">
                    pieces
                  </span>
                  .
                </h1>
              </div>
              <p className="text-sm md:text-base text-neutral-500 max-w-xl leading-relaxed">
                Capture a brief, sketch the intention, and arrive at a number
                you can stand behind. Designed as an internal surface for
                designers who already think in layers.
              </p>
              <div className="flex flex-wrap gap-3 text-xs">
                <Link
                  href="/projects"
                  className="inline-flex items-center justify-center rounded-full border border-neutral-900 bg-neutral-900 px-4 py-2 text-neutral-50 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                >
                  Projects
                </Link>
                <Link
                  href="/quotes"
                  className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
                >
                  Create quote
                </Link>
                <Link
                  href="/tools/enhancer"
                  className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
                >
                  Render assistant
                </Link>
              </div>
            </div>

            <div className="space-y-6 text-xs text-neutral-500">
              <div className="border border-neutral-200 rounded-2xl bg-white/70 backdrop-blur-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-[0.2em] text-[0.6rem]">
                    Snapshot
                  </span>
                  <span className="text-[0.6rem] text-neutral-400">
                    Internal view
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-neutral-400">This week</span>
                    <span className="text-neutral-900 text-sm">
                      Quotes, not posts.
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-[0.7rem]">
                    <div className="border border-neutral-200 rounded-xl px-3 py-3 space-y-1">
                      <div className="text-neutral-900 text-base font-light">
                        0
                      </div>
                      <div className="text-neutral-400">Open rooms</div>
                    </div>
                    <div className="border border-neutral-200 rounded-xl px-3 py-3 space-y-1">
                      <div className="text-neutral-900 text-base font-light">
                        0
                      </div>
                      <div className="text-neutral-400">Pieces in study</div>
                    </div>
                    <div className="border border-neutral-200 rounded-xl px-3 py-3 space-y-1">
                      <div className="text-neutral-900 text-base font-light">
                        0
                      </div>
                      <div className="text-neutral-400">Sent this week</div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[0.7rem] text-neutral-400 leading-relaxed">
                This console is private to the studio. Anything client-facing is
                a deliberate export.
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
                Quotes
              </p>
              <p className="text-sm text-neutral-500 mt-2 max-w-md">
                Two paths: a room as a whole, or a single piece. Begin where the
                conversation actually starts.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              <Link
                href="/quotes/space"
                className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
              >
                Space design quote
              </Link>
              <Link
                href="/quotes/furniture"
                className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
              >
                Furniture piece quote
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
                Tools
              </p>
              <p className="text-sm text-neutral-500 mt-2 max-w-md">
                Small assistants for render, notes, and files. Useful, but
                quiet.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              <Link
                href="/tools/enhancer"
                className="inline-flex items-center justify-center rounded-full border border-neutral-300 px-4 py-2 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition-colors"
              >
                Proposal image enhancer
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
