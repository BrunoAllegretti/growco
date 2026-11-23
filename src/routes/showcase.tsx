import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import { SHOWCASE_URL, hasExternalShowcase } from "@/lib/site-config";

export const Route = createFileRoute("/showcase")({ component: Showcase });

function Showcase() {
  // Showcase oficial hospedado fora (Vercel): /showcase apenas redireciona.
  useEffect(() => {
    if (hasExternalShowcase) window.location.replace(SHOWCASE_URL);
  }, []);
  return (
    <main className="min-h-screen bg-[#061f30] px-5 py-5 text-white sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1280px] flex-col rounded-[28px] border border-white/10 px-6 py-6 sm:px-10 sm:py-9">
        <header className="flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-bold text-slate-300 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <Logo className="text-xl text-white" />
        </header>
        <div className="my-auto grid items-center gap-12 py-16 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.2em] text-[#38a3ff]">
              Showcase growCo.
            </p>
            <h1 className="mt-5 max-w-3xl text-[clamp(3rem,8vw,7.5rem)] font-black leading-[.86] tracking-[-.075em]">
              Uma gestão que se move junto.
            </h1>
            <p className="mt-7 max-w-lg text-base leading-relaxed text-slate-300">
              Uma leitura visual da plataforma growCo. e de como cada parte do negócio se conecta.
            </p>
            <Link
              to="/login"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#38a3ff] px-5 py-3 text-sm font-bold text-white"
            >
              Entrar no sistema <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="relative h-[360px] rounded-[26px] bg-white p-6 text-[#061f30] shadow-[0_20px_55px_rgba(0,0,0,.24)]">
            <p className="text-sm font-black">growCo. em movimento</p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-16 rounded-xl bg-[#f1f5f9]" />
              ))}
            </div>
            <div className="mt-4 flex h-44 items-end gap-3 rounded-xl bg-[#f5f7fb] p-5">
              {[38, 64, 55, 88, 72, 98].map((height, index) => (
                <span
                  key={index}
                  className="flex-1 rounded-t bg-[#38a3ff]"
                  style={{ height: `${height}%`, opacity: 0.5 + index / 12 }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
