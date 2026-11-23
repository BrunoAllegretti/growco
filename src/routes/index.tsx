import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  ChevronRight,
  CircleDollarSign,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Target,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { ShowcaseLink } from "@/components/ShowcaseLink";
import { supabase } from "@/lib/mobile-db";
import teamPlaceholder from "@/assets/team-placeholder.svg";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);
const modules = [
  {
    name: "Vendas",
    icon: ShoppingCart,
    detail: "Vendas registradas com clareza — e sem retrabalho.",
    color: "bg-[#38a3ff]",
  },
  {
    name: "Estoque",
    icon: Package,
    detail: "Visibilidade sobre cada produto e movimento da operação.",
    color: "bg-[#eaf5ff]",
  },
  {
    name: "Financeiro",
    icon: CircleDollarSign,
    detail: "Entradas e saídas conectadas ao que acontece na empresa.",
    color: "bg-[#d8ebff]",
  },
  {
    name: "Pessoas",
    icon: Users,
    detail: "A rotina do time organizada em um único lugar.",
    color: "bg-[#f1f5f9]",
  },
  {
    name: "Metas",
    icon: Target,
    detail: "Objetivos visíveis, próximos e acionáveis para todos.",
    color: "bg-[#eaf5ff]",
  },
  {
    name: "Performance",
    icon: BarChart3,
    detail: "Decisões guiadas pelo que o negócio realmente mostra.",
    color: "bg-[#d8ebff]",
  },
] as const;

const flowSteps = [
  {
    title: "Venda registrada",
    note: "O início de uma informação que não fica isolada.",
    icon: ShoppingCart,
  },
  {
    title: "Estoque atualizado",
    note: "A disponibilidade acompanha o que acabou de acontecer.",
    icon: Package,
  },
  {
    title: "Financeiro atualizado",
    note: "O fluxo de caixa se ajusta no mesmo momento.",
    icon: CircleDollarSign,
  },
  {
    title: "Meta recalculada",
    note: "O progresso passa a refletir a operação real.",
    icon: Target,
  },
  {
    title: "Dashboard atualizado",
    note: "Uma nova leitura para a próxima decisão.",
    icon: LayoutDashboard,
  },
] as const;

type TeamMember = { name: string; role: string; bio: string; photo: string };

const DEFAULT_BIO = "Uma das pessoas por trás de uma gestão mais clara, conectada e humana.";

const team: (TeamMember & { tone: string })[] = (
  [
    { name: "Leonardo Di Ciommo", role: "Equipe growCo.", bio: DEFAULT_BIO, photo: "leonardo.jpg" },
    { name: "Pedro Faria de Oliveira", role: "Equipe growCo.", bio: DEFAULT_BIO, photo: "pedro.jpg" },
    { name: "Bruno Allegretti de Pádua", role: "Equipe growCo.", bio: DEFAULT_BIO, photo: "bruno.jpg" },
    { name: "Vinícius Ferreira Monteiro", role: "Equipe growCo.", bio: DEFAULT_BIO, photo: "vinicius.jpg" },
    { name: "Guilherme Augusto Zelaquete", role: "Equipe growCo.", bio: DEFAULT_BIO, photo: "guilherme-zelaquete.jpg" },
    { name: "Lucas Rocha Monteiro", role: "Equipe growCo.", bio: DEFAULT_BIO, photo: "lucas.jpg" },
    { name: "Miguel Lourenço Camargo", role: "Equipe growCo.", bio: DEFAULT_BIO, photo: "miguel.jpg" },
    { name: "Guilherme dos Santos Gonçalves", role: "Equipe growCo.", bio: DEFAULT_BIO, photo: "guilherme-goncalves.jpg" },
  ] as TeamMember[]
).map((member, index) => ({
  ...member,
  tone: ["bg-[#38a3ff]/20", "bg-[#0c334b]/25", "bg-[#6a94b2]/20", "bg-[#cfdeea]/50"][index % 4],
}));

export const Route = createFileRoute("/")({ component: Index });

function useInView<T extends HTMLElement>(threshold = 0.2): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || visible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, visible]);

  return [ref, visible];
}

function Index() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ lerp: 0.085, duration: 1.15, smoothWheel: true });
    const updateTrigger = () => ScrollTrigger.update();
    lenis.on("scroll", updateTrigger);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.refresh();
    return () => {
      lenis.off("scroll", updateTrigger);
      lenis.destroy();
      gsap.ticker.remove(tick);
    };
  }, []);

  return (
    <main className="min-h-screen overflow-x-clip bg-white font-[Avenir_Next,Montserrat,Inter,ui-sans-serif,system-ui] text-[#061f30]">
      <Hero />
      <About />
      <Pillars />
      <Principles />
      <Modules />
      <ConnectedFlow />
      <ProductPreview />
      <ShowcaseInvite />
      <Team />
      <Contact />
      <Footer />
    </main>
  );
}

function Hero() {
  return (
    <section id="top" className="px-3 pt-3 sm:px-5 sm:pt-5 lg:px-7">
      <div className="relative mx-auto flex min-h-[92svh] max-w-[1440px] flex-col overflow-hidden rounded-[28px] bg-[#061f30] px-5 pb-8 pt-4 text-white sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute -right-28 bottom-0 h-72 w-72 rounded-full bg-[#38a3ff]/10 blur-3xl" />
        <nav className="relative z-10 mx-auto flex w-full max-w-[1210px] items-center justify-between rounded-full bg-white px-4 py-2 text-[#061f30] shadow-[0_8px_25px_rgba(0,0,0,.11)] sm:px-5">
          <a href="#top" aria-label="growCo. início">
            <Logo className="text-xl text-[#38a3ff]" />
          </a>
          <div className="hidden items-center gap-7 text-xs font-semibold tracking-[-.01em] sm:flex">
            <a href="#sobre" className="transition hover:text-[#38a3ff]">
              Sobre
            </a>
            <a href="#modulos" className="transition hover:text-[#38a3ff]">
              Módulos
            </a>
            <a href="#produto" className="transition hover:text-[#38a3ff]">
              Produto
            </a>
            <a href="#equipe" className="transition hover:text-[#38a3ff]">
              Equipe
            </a>
            <a href="#showcase" className="transition hover:text-[#38a3ff]">
              Showcase
            </a>
          </div>
          <Link
            to="/login"
            className="rounded-full bg-[#38a3ff] px-4 py-3 text-xs font-bold tracking-[-.01em] text-white transition hover:bg-[#2494ef] sm:px-6"
          >
            Entrar no sistema
          </Link>
        </nav>
        <div className="relative z-10 mx-auto grid w-full max-w-[1210px] flex-1 items-center gap-12 py-14 lg:grid-cols-[.98fr_1.02fr] lg:py-20">
          <div className="animate-[growco-rise_.7s_ease-out_both]">
            <h1 className="max-w-[540px] text-[clamp(2.35rem,4.25vw,4.45rem)] font-semibold leading-[.96] tracking-[-.055em]">
              O painel de controle <span className="text-[#38a3ff]">completo</span> para a sua
              empresa.
            </h1>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#modulos"
                className="rounded-full bg-[#38a3ff] px-5 py-3 text-sm font-bold transition hover:bg-[#2494ef]"
              >
                Conheça a growCo.
              </a>
              <a
                href="#sobre"
                className="rounded-full bg-white px-5 py-3 text-sm font-bold text-[#061f30] transition hover:bg-slate-100"
              >
                Ler a proposta
              </a>
            </div>
          </div>
          <HeroProduct />
        </div>
      </div>
    </section>
  );
}

function HeroProduct() {
  return (
    <div className="relative mx-auto w-full max-w-[560px] animate-[growco-slide_.8s_.15s_ease-out_both]">
      <div className="absolute right-[2%] top-[8%] h-[76%] w-[73%] rounded-xl bg-white p-4 shadow-[0_18px_35px_rgba(0,0,0,.22)]">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold text-slate-800">Dashboard</span>
          <span className="h-2 w-10 rounded-full bg-slate-100" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-10 rounded-md bg-slate-100" />
          ))}
        </div>
        <div className="mt-4 flex h-[118px] items-end gap-2 rounded-lg bg-[#f5f7fb] p-3">
          {[45, 70, 53, 94, 64].map((height, index) => (
            <span
              key={index}
              className="flex-1 rounded-t bg-[#38a3ff]"
              style={{ height: `${height}%`, opacity: 0.52 + index / 10 }}
            />
          ))}
        </div>
      </div>
      <div className="relative z-10 pt-[20%]">
        <div className="flex h-[190px] items-end justify-center gap-4 px-6 sm:h-[250px] sm:gap-6">
          {[44, 72, 56, 98, 80].map((height, index) => (
            <div
              key={index}
              className="w-[12%] rounded-t-md bg-[#38a3ff] shadow-[0_8px_15px_rgba(0,0,0,.15)]"
              style={{ height: `${height}%`, opacity: index === 3 ? 1 : 0.78 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function About() {
  const [ref, visible] = useInView<HTMLDivElement>();
  return (
    <section id="sobre" ref={ref} className="px-6 py-28 text-center sm:py-36">
      <div className="mx-auto max-w-3xl">
        <p className="overflow-hidden text-[clamp(2rem,4vw,3.7rem)] font-semibold tracking-[-.06em] text-[#38a3ff]">
          <span
            className={`inline-block transition duration-700 ${visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}
          >
            We’re
          </span>{" "}
          <span
            className={`inline-block transition delay-100 duration-700 ${visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}
          >
            growCo.
          </span>
        </p>
        <p
          className={`mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 transition delay-300 duration-700 sm:text-lg ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
        >
          Uma plataforma para conectar vendas, estoque, financeiro, pessoas, metas e performance em
          um ambiente que finalmente trabalha como a sua empresa.
        </p>
      </div>
    </section>
  );
}

function Pillars() {
  const pillars = [
    { title: "Centralize", text: "Tudo que importa, em um só lugar.", icon: LayoutDashboard },
    { title: "Conecte", text: "Cada ação atualiza o restante da operação.", icon: Boxes },
    { title: "Entenda", text: "Transforme dados em decisões mais claras.", icon: BarChart3 },
  ];
  return (
    <section className="mx-auto grid max-w-[1120px] gap-5 px-6 sm:grid-cols-3">
      {pillars.map(({ title, text, icon: Icon }) => (
        <article
          key={title}
          className="group flex min-h-[250px] flex-col rounded-[22px] bg-[#061f30] p-7 text-white transition duration-300 hover:-translate-y-1 hover:bg-[#0a2d41] hover:shadow-[0_18px_36px_rgba(6,31,48,.18)]"
        >
          <Icon
            className="h-7 w-7 text-[#38a3ff] transition duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
            strokeWidth={1.6}
          />
          <div className="mt-auto">
            <h3 className="text-2xl font-semibold tracking-[-.04em]">{title}</h3>
            <p className="mt-3 max-w-[210px] text-sm leading-relaxed text-slate-300">{text}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

function Principles() {
  const rows = [
    ["Missão", "Tornar a gestão mais clara para empresas que querem crescer conectadas."],
    ["Visão", "Criar uma operação onde toda decisão nasce de informação viva."],
    ["Valores", "Clareza, colaboração, simplicidade e evolução contínua."],
  ];
  return (
    <section className="mx-auto max-w-[1120px] px-6 py-28 sm:py-36">
      <div className="space-y-7">
        {rows.map(([title, text], index) => (
          <PrincipleRow key={title} title={title} text={text} reverse={index === 1} />
        ))}
      </div>
    </section>
  );
}

function PrincipleRow({ title, text, reverse }: { title: string; text: string; reverse: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLHeadingElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const element = rootRef.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      const startClip = reverse
        ? "inset(0 0 0 100% round .75rem)"
        : "inset(0 100% 0 0 round .75rem)";
      const timeline = gsap.timeline({
        scrollTrigger: { trigger: rootRef.current, start: "top 83%", once: true },
      });
      timeline
        .fromTo(
          labelRef.current,
          { x: reverse ? 18 : -18, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, duration: 0.75, ease: "power3.out" },
        )
        .fromTo(
          messageRef.current,
          { clipPath: startClip, autoAlpha: 0 },
          {
            clipPath: "inset(0 0 0 0 round .75rem)",
            autoAlpha: 1,
            duration: 1.15,
            ease: "power3.inOut",
          },
          0.14,
        )
        .fromTo(
          textRef.current,
          { y: 10, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.75, ease: "power2.out" },
          0.55,
        );
    }, rootRef);
    return () => context.revert();
  }, [reverse]);
  return (
    <div
      ref={rootRef}
      className={`flex flex-col gap-4 sm:items-center ${reverse ? "sm:flex-row-reverse" : "sm:flex-row"}`}
    >
      <h3
        ref={labelRef}
        className={`w-28 text-lg font-semibold tracking-[-.04em] text-[#38a3ff] transition duration-[800ms] ease-[cubic-bezier(.16,1,.3,1)] ${revealed ? "translate-x-0 opacity-100" : reverse ? "translate-x-5 opacity-0" : "-translate-x-5 opacity-0"}`}
      >
        {title}
      </h3>
      <div
        ref={messageRef}
        className={`flex-1 overflow-hidden rounded-xl bg-[#f1f3f5] transition-[clip-path,opacity] duration-[1200ms] ease-[cubic-bezier(.65,0,.35,1)] ${revealed ? "[clip-path:inset(0_0_0_0_round_.75rem)] opacity-100" : reverse ? "[clip-path:inset(0_0_0_100%_round_.75rem)] opacity-0" : "[clip-path:inset(0_100%_0_0_round_.75rem)] opacity-0"}`}
      >
        <p
          ref={textRef}
          className={`px-6 py-5 text-sm leading-relaxed text-slate-600 transition duration-[800ms] ease-[cubic-bezier(.16,1,.3,1)] sm:text-base ${revealed ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
        >
          {text}
        </p>
      </div>
    </div>
  );
}

function Modules() {
  const [active, setActive] = useState(0);
  const selected = modules[active];
  const Icon = selected.icon;
  return (
    <section id="modulos" className="bg-[#f7f9fc] px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-[1120px]">
        <h2 className="text-center text-[clamp(2rem,4vw,3.8rem)] font-semibold tracking-[-.06em] text-[#061f30]">
          Um ecossistema, vários módulos
        </h2>
        <div className="mt-14 grid gap-12 lg:grid-cols-[.82fr_1.18fr] lg:items-center">
          <PhoneMock active={active} />
          <div className="flex min-h-[610px] flex-col rounded-[20px] border border-[#061f30]/25 bg-white p-3 sm:p-5 lg:h-[650px]">
            {modules.map((module, index) => {
              const ModuleIcon = module.icon;
              const isActive = active === index;
              return (
                <button
                  key={module.name}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  onClick={() => setActive(index)}
                  className={`flex w-full items-center gap-4 border-b border-slate-200 px-3 py-4 text-left transition last:border-0 ${isActive ? "bg-[#eaf5ff]" : "hover:bg-slate-50"}`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-md ${isActive ? "bg-[#38a3ff] text-white" : "bg-slate-100 text-[#061f30]"}`}
                  >
                    <ModuleIcon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-bold">{module.name}</span>
                  <ChevronRight
                    className={`h-4 w-4 transition ${isActive ? "translate-x-1 text-[#38a3ff]" : "text-slate-400"}`}
                  />
                </button>
              );
            })}
            <div className="mt-auto grid h-[178px] grid-cols-[auto_1fr] gap-5 overflow-hidden rounded-xl bg-[#061f30] p-6 text-white sm:p-7">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-lg ${selected.color} text-[#061f30]`}
              >
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#38a3ff]">
                  {selected.name}
                </p>
                <p className="mt-3 max-w-md text-base leading-relaxed text-slate-300">
                  {selected.detail} Acompanhe o que importa sem perder o contexto do restante da
                  operação.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PhoneMock({ active }: { active: number }) {
  return (
    <div className="relative mx-auto h-[420px] w-[230px] self-center rounded-[32px] border-[5px] border-[#061f30] bg-white p-4 shadow-[0_18px_30px_rgba(6,31,48,.15)] lg:translate-y-0">
      <span className="absolute left-1/2 top-2 h-5 w-20 -translate-x-1/2 rounded-full bg-[#061f30]" />
      <div className="mt-8 grid grid-cols-2 gap-3">
        {modules.slice(0, 6).map((module, index) => {
          const Icon = module.icon;
          const current = active === index;
          return (
            <div
              key={module.name}
              className={`flex h-20 items-center justify-center rounded-xl transition duration-300 ${current ? "-translate-y-1 bg-[#38a3ff] text-white shadow-lg" : "bg-[#f1f3f5] text-[#061f30]"}`}
            >
              <Icon className="h-6 w-6" />
            </div>
          );
        })}
      </div>
      <div className="mt-5 rounded-xl bg-[#061f30] p-4">
        <div className="h-2 w-16 rounded-full bg-[#38a3ff]" />
        <div className="mt-3 h-2 w-full rounded-full bg-white/20" />
        <div className="mt-2 h-2 w-3/4 rounded-full bg-white/20" />
      </div>
    </div>
  );
}

function ConnectedFlow() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const context = gsap.context(() => {
      const media = gsap.matchMedia();
      const updateStep = (progress: number) =>
        setActive(Math.min(flowSteps.length - 1, Math.round(progress * (flowSteps.length - 1))));
      media.add("(min-width: 768px)", () => {
        const progress = { value: 0 };
        const tween = gsap.to(progress, {
          value: 1,
          ease: "none",
          onUpdate: () => updateStep(progress.value),
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 1.1,
            invalidateOnRefresh: true,
          },
        });
        return () => tween.kill();
      });
      media.add("(max-width: 767px)", () => {
        const progress = { value: 0 };
        const tween = gsap.to(progress, {
          value: 1,
          ease: "none",
          onUpdate: () => updateStep(progress.value),
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.75,
            invalidateOnRefresh: true,
          },
        });
        return () => tween.kill();
      });
      return () => media.revert();
    }, sectionRef);
    return () => context.revert();
  }, []);

  const current = flowSteps[active];
  const CurrentIcon = current.icon;
  return (
    <section ref={sectionRef} className="relative mx-auto h-[340svh] max-w-[1120px] px-6">
      <div className="sticky top-0 flex h-[100svh] items-center py-8 sm:py-12">
        <div className="w-full overflow-hidden rounded-[24px] bg-[#061f30] px-6 py-12 text-white sm:px-10 sm:py-16">
          <p className="text-sm font-bold uppercase tracking-[.18em] text-[#38a3ff]">
            Tudo trabalha junto
          </p>
          <h2 className="mt-3 max-w-xl text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[.95] tracking-[-.055em]">
            Uma ação, toda a empresa em movimento.
          </h2>
          <div className="relative mt-12 min-h-[330px] overflow-hidden rounded-[18px] border border-white/10 bg-white/[.035] p-6 sm:p-10">
            <span className="absolute -right-3 -top-16 text-[11rem] font-semibold leading-none tracking-[-.12em] text-white/[.035]">
              0{active + 1}
            </span>
            <div className="relative flex h-full min-h-[250px] flex-col justify-between">
              <div
                key={current.title}
                className="animate-[growco-flow-in_.7s_cubic-bezier(.16,1,.3,1)_both]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#38a3ff]">
                  <CurrentIcon className="h-6 w-6" />
                </div>
                <p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-[#38a3ff]">
                  etapa 0{active + 1}
                </p>
                <h3 className="mt-3 text-[clamp(2rem,4vw,4rem)] font-semibold leading-none tracking-[-.06em]">
                  {current.title}
                </h3>
                <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300 sm:text-base">
                  {current.note}
                </p>
              </div>
              <div className="mt-10 flex items-center gap-2">
                {flowSteps.map((step, index) => (
                  <button
                    key={step.title}
                    onClick={() => setActive(index)}
                    aria-label={step.title}
                    className="group flex flex-1 items-center gap-2"
                  >
                    <span className={`h-[3px] flex-1 overflow-hidden rounded-full bg-white/15`}>
                      <span
                        className={`block h-full bg-[#38a3ff] transition-all duration-700 ${index <= active ? "w-full" : "w-0"}`}
                      />
                    </span>
                    <span
                      className={`text-[10px] font-bold transition ${index === active ? "text-white" : "text-slate-500"}`}
                    >
                      0{index + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductPreview() {
  const [ref, visible] = useInView<HTMLElement>();
  return (
    <section id="produto" ref={ref} className="bg-[#f7f9fc] px-6 py-28 sm:py-36">
      <div className="mx-auto max-w-[1120px]">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[.18em] text-[#38a3ff]">
            Uma visão clara
          </p>
          <h2 className="mt-3 text-[clamp(2rem,4vw,3.8rem)] font-semibold leading-[.95] tracking-[-.06em]">
            Seu negócio inteiro, em uma única leitura.
          </h2>
        </div>
        <div
          className={`relative mt-12 rounded-[24px] bg-white p-5 shadow-[0_18px_45px_rgba(6,31,48,.09)] transition duration-700 sm:p-8 ${visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-lg font-black">Dashboard</span>
            <div className="flex gap-2">
              <span className="h-8 w-28 rounded-full bg-slate-100" />
              <span className="h-8 w-8 rounded-full bg-[#38a3ff]" />
            </div>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-[1.6fr_.8fr]">
            <div>
              <div className="grid grid-cols-3 gap-3">
                {["Receita", "Vendas", "Produtos"].map((item, index) => (
                  <div
                    key={item}
                    className={`rounded-xl bg-[#f5f7fb] p-4 transition duration-500 ${visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
                    style={{ transitionDelay: `${index * 100 + 160}ms` }}
                  >
                    <p className="text-xs text-slate-500">{item}</p>
                    <p className="mt-2 text-lg font-black">{["R$ 48.2k", "284", "126"][index]}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex h-48 items-end gap-3 rounded-xl bg-[#f5f7fb] p-5">
                {[42, 64, 53, 92, 75, 98].map((height, index) => (
                  <span
                    key={index}
                    className="flex-1 rounded-t bg-[#38a3ff]"
                    style={{ height: `${height}%`, opacity: 0.55 + index / 13 }}
                  />
                ))}
              </div>
            </div>
            <div className="grid gap-4">
              <div className="rounded-xl bg-[#061f30] p-5 text-white">
                <p className="text-xs text-slate-300">Desempenho</p>
                <p className="mt-3 text-3xl font-black text-[#38a3ff]">+18%</p>
                <p className="mt-1 text-xs text-slate-300">em relação ao último mês</p>
              </div>
              <div className="rounded-xl bg-[#f5f7fb] p-5">
                <p className="text-xs text-slate-500">Atividade recente</p>
                <div className="mt-4 space-y-2">
                  {[1, 2, 3].map((item) => (
                    <span
                      key={item}
                      className="block h-2 rounded-full bg-slate-200"
                      style={{ width: `${100 - item * 15}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ShowcaseInvite() {
  return (
    <section id="showcase" className="px-6 py-28 sm:py-36">
      <div className="mx-auto grid max-w-[1120px] items-center gap-10 rounded-[26px] bg-[#061f30] px-7 py-12 text-white sm:px-12 lg:grid-cols-[1.2fr_.8fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.18em] text-[#38a3ff]">
            Por trás da growCo.
          </p>
          <h2 className="mt-4 text-[clamp(2rem,4vw,3.6rem)] font-semibold leading-[.95] tracking-[-.06em]">
            Explore a growCo. além da interface.
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-slate-300 sm:text-base">
            Uma experiência visual dedicada para conhecer a visão, a linguagem e as possibilidades
            do produto.
          </p>
          <ShowcaseLink className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#38a3ff] px-5 py-3 text-sm font-bold transition hover:bg-[#2494ef]">
            Explorar showcase <ArrowRight className="h-4 w-4" />
          </ShowcaseLink>
        </div>
        <div className="relative mx-auto h-44 w-full max-w-[270px] rounded-2xl bg-white/8 p-5">
          <div className="absolute right-5 top-5 h-20 w-20 rounded-full border-[14px] border-[#38a3ff]" />
          <div className="absolute bottom-6 left-5 h-3 w-32 rounded-full bg-white/70" />
          <div className="absolute bottom-12 left-5 h-3 w-44 rounded-full bg-[#38a3ff]" />
        </div>
      </div>
    </section>
  );
}

function Team() {
  const [active, setActive] = useState(0);
  return (
    <section id="equipe" className="mx-auto max-w-[1120px] px-6 py-28 sm:py-36">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.18em] text-[#38a3ff]">Equipe</p>
          <h2 className="mt-3 text-[clamp(2rem,4vw,3.5rem)] font-semibold tracking-[-.06em]">
            Quem faz a growCo.
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-slate-600">
          Produto, design, tecnologia e estratégia trabalhando no mesmo ritmo.
        </p>
      </div>
      <div className="mt-12 flex gap-2 overflow-x-auto pb-2 md:h-[430px] md:overflow-hidden">
        {team.map((person, index) => {
          const selected = active === index;
          return (
            <button
              key={person.name}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onClick={() => setActive(index)}
              className={`group relative h-[360px] min-w-[190px] overflow-hidden rounded-[18px] text-left transition-[flex,min-width] duration-500 ease-out md:h-full md:min-w-0 ${selected ? "md:flex-[3.2]" : "md:flex-1"}`}
            >
              <img
                src={`/equipe/${person.photo}`}
                alt={`Foto de ${person.name}`}
                loading="lazy"
                onError={(event) => {
                  const img = event.currentTarget;
                  if (img.src !== new URL(teamPlaceholder, window.location.origin).href) {
                    img.onerror = null;
                    img.src = teamPlaceholder;
                  }
                }}
                className="h-full w-full object-cover grayscale transition duration-500 group-hover:grayscale-0"
              />
              <div className={`absolute inset-0 ${person.tone} mix-blend-multiply`} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#061f30] via-[#061f30]/65 to-transparent p-5 pt-20 text-white">
                <p className="text-sm font-semibold tracking-[-.03em]">{person.name}</p>
                <p className="mt-1 text-xs text-[#b7dbf7]">{person.role}</p>
                <div
                  className={`grid transition-all duration-500 ${selected ? "mt-4 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"}`}
                >
                  <p className="overflow-hidden text-xs leading-relaxed text-slate-200">
                    {person.bio}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [loading, setLoading] = useState(false);
  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: form.name,
      email: form.email,
      company: form.company || null,
      message: form.message,
    });
    setLoading(false);
    if (error) return toast.error("Não foi possível enviar. Tente novamente.");
    toast.success("Mensagem enviada! Entraremos em contato.");
    setForm({ name: "", email: "", company: "", message: "" });
  }
  return (
    <section id="contato" className="bg-[#f7f9fc] px-6 py-28 sm:py-36">
      <div className="mx-auto grid max-w-[1120px] gap-10 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.18em] text-[#38a3ff]">
            Fale com a gente
          </p>
          <h2 className="mt-3 text-[clamp(2rem,4vw,3.6rem)] font-semibold leading-[.95] tracking-[-.06em]">
            Gestão mais clara começa com tudo conectado.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
            Conte um pouco sobre a sua operação. Nossa equipe responde com uma proposta para a sua
            realidade.
          </p>
        </div>
        <form
          onSubmit={onSubmit}
          className="rounded-[22px] bg-white p-6 shadow-[0_14px_35px_rgba(6,31,48,.07)] sm:p-8"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Nome"
              value={form.name}
              onChange={(name) => setForm({ ...form, name })}
              required
            />
            <Field
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(email) => setForm({ ...form, email })}
              required
            />
            <Field
              label="Empresa"
              value={form.company}
              onChange={(company) => setForm({ ...form, company })}
            />
          </div>
          <label className="mt-4 block text-xs font-bold text-slate-600">
            Mensagem
            <textarea
              required
              rows={4}
              value={form.message}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
              className="mt-2 w-full rounded-xl bg-[#f5f7fb] px-4 py-3 text-sm outline-none ring-[#38a3ff] transition focus:ring-2"
            />
          </label>
          <button
            disabled={loading}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#38a3ff] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#2494ef] disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar mensagem"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-bold text-slate-600">
      {label}
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl bg-[#f5f7fb] px-4 py-3 text-sm outline-none ring-[#38a3ff] transition focus:ring-2"
      />
    </label>
  );
}

function Footer() {
  return (
    <footer className="bg-[#061f30] px-6 py-10 text-white">
      <div className="mx-auto flex max-w-[1120px] flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
        <Logo className="w-fit text-2xl text-white" />
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-300">
          <a href="#produto">Produto</a>
          <a href="#modulos">Módulos</a>
          <a href="#sobre">Sobre</a>
          <ShowcaseLink>Showcase</ShowcaseLink>
          <Link to="/login">Entrar</Link>
        </div>
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} growCo.</p>
      </div>
    </footer>
  );
}
