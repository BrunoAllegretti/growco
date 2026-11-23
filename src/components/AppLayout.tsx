import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Package,
  ShoppingCart,
  FileBarChart,
  Settings,
  Clock,
  LogOut,
  Menu,
  X,
  Target,
  UsersRound,
  Trophy,
  CircleHelp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserProfileDialog } from "@/components/UserProfileDialog";
import { RibbonIcon } from "@/components/RibbonIcon";
import { useAppTheme } from "@/hooks/use-theme";

const allItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, adminOnly: false },
  { to: "/vendas", label: "Vendas", icon: ShoppingCart, adminOnly: false },
  { to: "/estoque", label: "Estoque", icon: Package, adminOnly: false },
  { to: "/ponto", label: "Ponto", icon: Clock, adminOnly: false },
  { to: "/metas", label: "Metas", icon: Target, adminOnly: false },
  { to: "/performance", label: "Performance", icon: Trophy, adminOnly: false },
  { to: "/conquistas", label: "Conquistas", icon: RibbonIcon, adminOnly: false },
  { to: "/funcionarios", label: "Funcionários", icon: Users, adminOnly: true },
  { to: "/equipes", label: "Equipes", icon: UsersRound, adminOnly: true },
  { to: "/financeiro", label: "Financeiro", icon: Wallet, adminOnly: true },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart, adminOnly: true },
  { to: "/configuracoes", label: "Configurações", icon: Settings, adminOnly: true },
] as const;

/**
 * `preview` exists only for the local /preview route. The default path retains
 * the existing authentication and company-membership guard unchanged.
 */
export function AppLayout({
  preview = false,
  children,
}: {
  preview?: boolean;
  children?: ReactNode;
}) {
  const { user, loading, isAdmin, companyId, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { isDark, setTheme } = useAppTheme();

  useEffect(() => {
    if (preview || loading) return;
    if (!user) navigate({ to: "/login" });
    else if (!companyId) navigate({ to: "/onboarding" });
  }, [preview, user, loading, companyId, navigate]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  if (!preview && (loading || !user || !companyId)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  const displayIsAdmin = preview || isAdmin;
  const items = allItems.filter((i) => !i.adminOnly || displayIsAdmin);
  const firstName =
    user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Pedro";

  return (
    <div className="min-h-screen bg-[#f5f7fb] dark:bg-background flex">
      {/* mobile topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white/95 dark:bg-card/95 backdrop-blur border-b border-slate-100 dark:border-white/10 flex items-center justify-between px-4 h-16">
        <Link to="/dashboard">
          <span className="text-base font-bold tracking-[-0.04em] text-primary">growCo.</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* sidebar */}
      <aside
        className={`${open ? "translate-x-0" : "-translate-x-full"} app-sidebar md:translate-x-0 fixed md:sticky top-0 left-0 z-40 flex h-screen w-[clamp(10rem,15.7vw,17rem)] flex-col overflow-y-auto border-r border-slate-100 dark:border-white/10 bg-white dark:bg-card transition-transform md:overflow-hidden`}
      >
        <div className="app-sidebar-logo flex h-[clamp(4rem,5vw,5.5rem)] items-center justify-center">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="text-base font-bold tracking-[-0.04em] text-primary">growCo.</span>
          </Link>
        </div>
        <div className="app-sidebar-profile px-[clamp(.75rem,1.4vw,1.5rem)] pb-[clamp(.8rem,1.3vh,1.2rem)] pt-[clamp(.7rem,1.8vh,1.5rem)] text-center">
          <button
            type="button"
            aria-label="Ver meu perfil"
            onClick={() => setProfileOpen(true)}
            className="group mx-auto block rounded-xl px-2 py-1 transition-colors hover:bg-slate-50 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
          <Avatar className="app-sidebar-avatar mx-auto mb-[clamp(.65rem,1vw,1rem)] h-[clamp(3.5rem,4vw,4.75rem)] w-[clamp(3.5rem,4vw,4.75rem)]">
            <AvatarFallback className="bg-[#d8d8d8] dark:bg-secondary text-[clamp(.9rem,1.2vw,1.25rem)] font-semibold text-primary">
              {firstName.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center justify-center gap-1">
            <p className="text-[clamp(.82rem,.92vw,1rem)] font-bold leading-tight tracking-[-0.025em]">
              Bom dia, {firstName}
            </p>
          </div>
          </button>
          <p className="mt-0.5 text-[clamp(.5rem,.55vw,.65rem)] text-muted-foreground">
            {displayIsAdmin ? "Administrador" : "Funcionário"}
          </p>
        </div>
        <nav className="app-sidebar-nav flex-none space-y-[clamp(.16rem,.28vh,.28rem)] px-[clamp(.6rem,1vw,1rem)]">
          {items.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`app-sidebar-nav-item flex items-center gap-[clamp(.4rem,.6vw,.65rem)] rounded-[clamp(.25rem,.35vw,.4rem)] px-[clamp(.55rem,.8vw,.9rem)] py-[clamp(.27rem,.42vh,.45rem)] text-[clamp(.64rem,.68vw,.76rem)] font-medium transition-colors md:h-[clamp(1.55rem,3.2vh,1.9rem)] md:py-0 ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-[#d8d8d8] dark:bg-secondary text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600"
                }`}
              >
                <Icon className="h-[clamp(.7rem,.85vw,.9rem)] w-[clamp(.7rem,.85vw,.9rem)]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="app-sidebar-footer mt-auto space-y-[clamp(.45rem,.65vh,.65rem)] p-[clamp(.8rem,1.2vw,1.25rem)] pt-3">
          <a
            href="mailto:support@growco.com"
            className="flex items-center gap-1.5 text-[clamp(.6rem,.7vw,.75rem)] font-medium text-slate-700 dark:text-slate-200 hover:text-primary"
          >
            <CircleHelp className="h-[clamp(.7rem,.8vw,.85rem)] w-[clamp(.7rem,.8vw,.85rem)]" />{" "}
            Suporte
          </a>
          <div className="flex items-center justify-between text-[clamp(.6rem,.7vw,.75rem)] font-medium text-slate-700 dark:text-slate-200">
            <span>Tema</span>

          <Switch
            aria-label="Alternar tema escuro"
            checked={isDark}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            className="
              border-2 border-slate-600
              data-[state=unchecked]:bg-slate-600
              data-[state=checked]:bg-sky-600
              dark:border-sky-400
              dark:data-[state=unchecked]:bg-slate-700
              dark:data-[state=checked]:bg-sky-500
              [&>span]:!bg-white
            "


            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="app-sidebar-exit mt-[clamp(.6rem,1.2vh,1rem)] w-full justify-center px-0 text-[clamp(.64rem,.7vw,.76rem)] text-slate-700 dark:text-slate-200 hover:bg-transparent hover:text-primary"
            onClick={async () => {
              if (preview) return;
              await signOut();
              navigate({ to: "/login" });
            }}
          >
            Sair
          </Button>
        </div>
      </aside>

      {open && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-30" onClick={() => setOpen(false)} />
      )}

      <main className="min-w-0 flex-1 pt-16 md:ml-0 md:pt-0">
        <div className="mx-auto box-border w-full max-w-[75rem] px-[clamp(1.25rem,2.2vw,3rem)] pb-[clamp(1.25rem,2.2vw,3rem)] pt-4 md:w-[clamp(42rem,83%,75rem)] md:py-[clamp(2rem,3vw,3.5rem)]">
          {children ?? <Outlet />}
        </div>
      </main>

      <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} preview={preview} />
    </div>
  );
}
