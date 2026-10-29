import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Footer from "../components/Footer";

export function LegalSection({ id, title, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {children}
      </div>
    </section>
  );
}

export default function LegalPage({ title, intro, effectiveDate, sections, children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash?.slice(1);
    if (hash) {
      const element = document.getElementById(hash);
      if (element) setTimeout(() => element.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } else {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-white text-slate-900 dark:bg-[#0a0a0c] dark:text-slate-100">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#0a0a0c]/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <button
            onClick={() => navigate("/home")}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to home
          </button>
          <button onClick={() => navigate("/home")} className="flex items-center transition-transform hover:scale-[1.03]">
            <img src="/execui-logo.png" alt="ExecUI" className="h-7 w-auto object-contain" draggable="false" />
          </button>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-slate-50/60 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="mx-auto max-w-4xl px-6 py-14">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">SUL TECH · ExecUI</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">{intro}</p>
          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">Effective {effectiveDate}</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <nav className="mb-12 rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]" aria-label="On this page">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">On this page</p>
          <ol className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="group inline-flex items-baseline gap-2 text-sm text-slate-600 transition hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-400"
                >
                  <span className="text-xs tabular-nums text-slate-300 dark:text-slate-600">{String(index + 1).padStart(2, "0")}</span>
                  {section.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-12">{children}</div>
      </div>

      <Footer />
    </div>
  );
}
