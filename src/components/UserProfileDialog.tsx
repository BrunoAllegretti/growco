import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  BriefcaseBusiness,
  DollarSign,
  Target,
  Trophy,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BADGES } from "@/lib/badges";
import { fmtBRL, fmtDate, fmtDateTime } from "@/lib/fmt";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/mobile-db";

type GoalMetric = "sales_revenue" | "sales_count" | "products_sold";
type GoalPeriod = "daily" | "weekly" | "monthly" | "yearly" | "custom";
type EmployeeProfile = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  role_title: string;
  avatar_url: string | null;
};
type ProfileOverview = {
  employee: EmployeeProfile | null;
  sales: { id: string; total: number; customer_name: string | null; occurred_at: string }[];
  salesCount: number;
  score: number;
  badges: { id: string; badge_code: string; unlocked_at: string }[];
  goals: {
    id: string;
    title: string;
    metric: GoalMetric;
    target_value: number;
    start_date: string;
    end_date: string;
  }[];
  teams: { id: string; name: string }[];
};

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function UserProfileDialog({
  open,
  onOpenChange,
  preview = false,
  employeeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview?: boolean;
  employeeId?: string;
}) {
  const { user, companyId, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [goalOpen, setGoalOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [goalMetric, setGoalMetric] = useState<GoalMetric>("sales_revenue");
  const [goalPeriod, setGoalPeriod] = useState<GoalPeriod>("monthly");

  const { data, isLoading } = useQuery({
    queryKey: ["user-profile-overview", employeeId ?? user?.id, companyId],
    queryFn: async (): Promise<ProfileOverview> => {
      const employeeQuery = supabase
        .from("employees")
        .select("id, user_id, full_name, email, role_title, avatar_url");
      const { data: employee, error } = employeeId
        ? await employeeQuery.eq("id", employeeId).maybeSingle()
        : await employeeQuery.eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      const targetUserId = employee?.user_id ?? (!employeeId ? user!.id : null);
      if (!employee)
        return {
          employee: null,
          sales: [],
          salesCount: 0,
          score: 0,
          badges: [],
          goals: [],
          teams: [],
        };

      const now = new Date();
      const monthStart = toDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
      const [sales, badges, score, memberships, goals] = await Promise.all([
        targetUserId
          ? supabase
              .from("sales")
              .select("id, total, customer_name, occurred_at", { count: "exact" })
              .eq("created_by", targetUserId)
              .order("occurred_at", { ascending: false })
              .limit(25)
          : Promise.resolve({ data: [], count: 0, error: null }),
        supabase
          .from("employee_badges")
          .select("id, badge_code, unlocked_at")
          .eq("employee_id", employee.id)
          .order("unlocked_at", { ascending: false }),
        supabase.rpc("employee_score", {
          _employee_id: employee.id,
          _start: monthStart,
          _end: toDateKey(now),
        }),
        supabase
          .from("team_members")
          .select("team_id, teams(id, name)")
          .eq("employee_id", employee.id),
        supabase
          .from("goals")
          .select(
            "id, title, metric, target_value, start_date, end_date, assignee_type, assignee_id",
          )
          .eq("active", true)
          .order("created_at", { ascending: false }),
      ]);
      const teams = (memberships.data ?? []).flatMap((entry) => {
        const team = Array.isArray(entry.teams) ? entry.teams[0] : entry.teams;
        return team ? [{ id: team.id, name: team.name }] : [];
      });
      const teamIds = new Set(teams.map((team) => team.id));
      const visibleGoals = (goals.data ?? []).filter(
        (goal) =>
          goal.assignee_type === "company" ||
          (goal.assignee_type === "employee" && goal.assignee_id === employee.id) ||
          (goal.assignee_type === "team" && !!goal.assignee_id && teamIds.has(goal.assignee_id)),
      );
      return {
        employee,
        sales: sales.data ?? [],
        salesCount: sales.count ?? 0,
        score: Number(score.data ?? 0),
        badges: badges.data ?? [],
        goals: visibleGoals,
        teams,
      };
    },
    enabled: open && !preview && !!user && !!companyId,
  });

  const profile: ProfileOverview = preview
    ? {
        employee: {
          id: employeeId ?? "preview-profile",
          user_id: "preview-user",
          full_name: "Ana Martins",
          email: "ana@growco.local",
          role_title: "Comercial",
          avatar_url: null,
        },
        sales: [
          {
            id: "preview-sale",
            total: 3490,
            customer_name: "Grupo Horizonte",
            occurred_at: new Date().toISOString(),
          },
        ],
        salesCount: 24,
        score: 92,
        badges: [
          { id: "preview-badge", badge_code: "sales_first", unlocked_at: new Date().toISOString() },
        ],
        goals: [
          {
            id: "preview-goal",
            title: "Receita mensal",
            metric: "sales_revenue",
            target_value: 50000,
            start_date: toDateKey(new Date()),
            end_date: toDateKey(new Date()),
          },
        ],
        teams: [{ id: "preview-team", name: "Comercial" }],
      }
    : (data ?? {
        employee: null,
        sales: [],
        salesCount: 0,
        score: 0,
        badges: [],
        goals: [],
        teams: [],
      });

  const targetUserId = profile.employee?.user_id ?? (!employeeId ? user?.id : null);
  const isOwnProfile = !employeeId || (!!targetUserId && targetUserId === user?.id);
  const displayName = isOwnProfile
    ? user?.user_metadata?.full_name ||
      profile.employee?.full_name ||
      user?.email?.split("@")[0] ||
      "Usuário"
    : profile.employee?.full_name || "Funcionário";
  const displayAvatar = isOwnProfile
    ? user?.user_metadata?.avatar_url || profile.employee?.avatar_url || ""
    : profile.employee?.avatar_url || "";
  const displayEmail = isOwnProfile
    ? user?.email || profile.employee?.email || "—"
    : profile.employee?.email || "—";

  const createGoal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin || !companyId || !profile.employee) return;
    const form = new FormData(event.currentTarget);
    const result = await supabase.from("goals").insert({
      company_id: companyId,
      title: String(form.get("title")),
      description: String(form.get("description") || "") || null,
      period: goalPeriod,
      metric: goalMetric,
      target_value: Number(form.get("target_value")),
      start_date: String(form.get("start_date")),
      end_date: String(form.get("end_date")),
      assignee_type: "employee",
      assignee_id: profile.employee.id,
      created_by: user?.id ?? null,
    });
    if (result.error) return toast.error(result.error.message);
    setGoalOpen(false);
    toast.success("Meta atribuída");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["goals"] }),
      queryClient.invalidateQueries({ queryKey: ["user-profile-overview"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard-goal-calendar"] }),
    ]);
  };

  const registerPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin || !companyId || !profile.employee) return;
    const form = new FormData(event.currentTarget);
    const paid = form.get("status") === "paid";
    const result = await supabase.from("salary_payments").insert({
      employee_id: profile.employee.id,
      company_id: companyId,
      amount: Number(form.get("amount")),
      reference_month: `${String(form.get("reference_month"))}-01`,
      notes: String(form.get("notes") || "") || null,
      paid,
      paid_at: paid ? new Date().toISOString() : null,
    });
    if (result.error) return toast.error(result.error.message);
    setPaymentOpen(false);
    toast.success(paid ? "Pagamento registrado" : "Pagamento pendente criado");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["payments"] }),
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-0 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-[-0.025em]">
              {isOwnProfile ? "Meu perfil" : "Perfil do funcionário"}
            </DialogTitle>
            <DialogDescription>Informações e resultados reais dentro da empresa.</DialogDescription>
          </DialogHeader>
          {isLoading && !preview ? (
            <div className="space-y-4">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-56 rounded-2xl" />
            </div>
          ) : !profile.employee && employeeId ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Funcionário não encontrado ou sem permissão de acesso.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-4 rounded-2xl bg-slate-50 dark:bg-white/5 p-4 sm:flex-row sm:items-center">
                <Avatar className="h-16 w-16 border-4 border-white shadow-sm">
                  <AvatarImage src={displayAvatar || undefined} />
                  <AvatarFallback className="bg-primary text-lg font-semibold text-white">
                    {initials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold tracking-[-0.02em]">{displayName}</p>
                  <p className="truncate text-sm text-muted-foreground">{displayEmail}</p>
                  <p className="mt-1 text-xs font-medium text-primary">
                    {profile.employee?.role_title || (isAdmin ? "Administrador" : "Funcionário")}
                  </p>
                </div>
                {isAdmin && profile.employee && !preview && (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setGoalOpen(true)}>
                      <Target className="mr-1.5 h-4 w-4" />
                      Definir meta
                    </Button>
                    <Button size="sm" onClick={() => setPaymentOpen(true)}>
                      <DollarSign className="mr-1.5 h-4 w-4" />
                      Registrar pagamento
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <ProfileMetric
                  icon={BriefcaseBusiness}
                  label="Vendas"
                  value={String(profile.salesCount)}
                />
                <ProfileMetric
                  icon={Trophy}
                  label="Performance"
                  value={`${profile.score.toFixed(0)} pts`}
                />
                <ProfileMetric
                  icon={Award}
                  label="Conquistas"
                  value={String(profile.badges.length)}
                />
                <ProfileMetric icon={Target} label="Metas" value={String(profile.goals.length)} />
              </div>
              <Tabs defaultValue="overview" className="mt-5">
                <TabsList className="grid h-auto w-full grid-cols-4">
                  <TabsTrigger value="overview">Perfil</TabsTrigger>
                  <TabsTrigger value="sales">Vendas</TabsTrigger>
                  <TabsTrigger value="goals">Metas</TabsTrigger>
                  <TabsTrigger value="badges">Conquistas</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-3 pt-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReadOnly label="E-mail" value={displayEmail} />
                    <ReadOnly label="Cargo" value={profile.employee?.role_title || "—"} />
                  </div>
                  <div className="rounded-xl border border-slate-100 dark:border-white/10 px-3 py-2.5">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
                      <UsersRound className="h-3.5 w-3.5" />
                      Equipe
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {profile.teams.length
                        ? profile.teams.map((team) => team.name).join(", ")
                        : "Nenhuma equipe vinculada"}
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="sales" className="pt-3">
                  <ProfileList empty="Nenhuma venda disponível.">
                    {profile.sales.map((sale) => (
                      <div
                        key={sale.id}
                        className="flex justify-between gap-3 border-b border-slate-100 dark:border-white/10 py-2.5 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {sale.customer_name || "Venda sem cliente"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {fmtDateTime(sale.occurred_at)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold">{fmtBRL(sale.total)}</span>
                      </div>
                    ))}
                  </ProfileList>
                </TabsContent>
                <TabsContent value="goals" className="pt-3">
                  <ProfileList empty="Nenhuma meta visível para este funcionário.">
                    {profile.goals.map((goal) => (
                      <div key={goal.id} className="border-b border-slate-100 dark:border-white/10 py-2.5 last:border-0">
                        <div className="flex justify-between gap-3">
                          <p className="text-sm font-medium">{goal.title}</p>
                          <span className="text-sm font-semibold">
                            {goal.metric === "sales_revenue"
                              ? fmtBRL(goal.target_value)
                              : goal.target_value}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {fmtDate(goal.start_date)} → {fmtDate(goal.end_date)}
                        </p>
                      </div>
                    ))}
                  </ProfileList>
                </TabsContent>
                <TabsContent value="badges" className="pt-3">
                  <ProfileList empty="Nenhuma conquista desbloqueada.">
                    {profile.badges.map((badge) => {
                      const definition = BADGES.find((item) => item.code === badge.badge_code);
                      return (
                        <div
                          key={badge.id}
                          className="flex items-center gap-3 border-b border-slate-100 dark:border-white/10 py-2.5 last:border-0"
                        >
                          <span
                            className={`h-9 w-9 rounded-xl ${definition?.color ?? "bg-primary"}`}
                          />
                          <div>
                            <p className="text-sm font-medium">
                              {definition?.name ?? badge.badge_code}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {definition?.description ??
                                `Desbloqueada em ${fmtDate(badge.unlocked_at)}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </ProfileList>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definir meta — {displayName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={createGoal} className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input name="title" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={goalMetric}
                  onValueChange={(value) => setGoalMetric(value as GoalMetric)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales_revenue">Receita</SelectItem>
                    <SelectItem value="sales_count">Vendas</SelectItem>
                    <SelectItem value="products_sold">Produtos vendidos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Período</Label>
                <Select
                  value={goalPeriod}
                  onValueChange={(value) => setGoalPeriod(value as GoalPeriod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diária</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                    <SelectItem value="custom">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Valor</Label>
              <Input name="target_value" type="number" min="0.01" step="0.01" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data inicial</Label>
                <Input
                  name="start_date"
                  type="date"
                  defaultValue={toDateKey(new Date())}
                  required
                />
              </div>
              <div>
                <Label>Data final</Label>
                <Input name="end_date" type="date" defaultValue={toDateKey(new Date())} required />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input name="description" />
            </div>
            <DialogFooter>
              <Button type="submit">Salvar meta</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pagamento — {displayName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={registerPayment} className="space-y-3">
            <div>
              <Label>Mês de referência</Label>
              <Input
                name="reference_month"
                type="month"
                defaultValue={toDateKey(new Date()).slice(0, 7)}
                required
              />
            </div>
            <div>
              <Label>Valor</Label>
              <Input name="amount" type="number" min="0.01" step="0.01" required />
            </div>
            <div>
              <Label>Status</Label>
              <select
                name="status"
                defaultValue="paid"
                className="h-10 w-full rounded-md border bg-background px-3"
              >
                <option value="paid">Pago — lança despesa</option>
                <option value="pending">Pendente</option>
              </select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input name="notes" />
            </div>
            <DialogFooter>
              <Button type="submit">Registrar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}
function ProfileMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-white/10 px-3 py-2.5">
      <Icon className="h-4 w-4 text-primary" />
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-base font-semibold leading-none">{value}</p>
      </div>
    </div>
  );
}
function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} readOnly className="bg-slate-50 dark:bg-white/5" />
    </div>
  );
}
function ProfileList({ children, empty }: { children: React.ReactNode[]; empty: string }) {
  return (
    <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-100 dark:border-white/10 px-3">
      {children.length ? (
        children
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}
