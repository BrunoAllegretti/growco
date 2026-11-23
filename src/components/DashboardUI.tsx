import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { UserProfileDialog } from "@/components/UserProfileDialog";
import { useIsDark } from "@/hooks/use-theme";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  CalendarDays,
  Package,
  Settings,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { fmtBRL, fmtDateTime } from "@/lib/fmt";

type GoalMetric = "sales_revenue" | "sales_count" | "products_sold";

export type DashboardData = {
  income: number;
  expense: number;
  profit: number;
  salesCount: number;
  productsCount: number;
  employeesCount: number;
  selectedDate?: string;
  lowStock: { id: string; name: string; stock: number }[];
  monthly: { mes: string; receita: number; despesa: number }[];
  cashFlow?: { type: "income" | "expense"; amount: number; occurred_at: string }[];
  top: { name: string; qty: number }[];
  goals?: {
    id: string;
    title: string;
    metric: GoalMetric;
    target: number;
    progress: number;
  }[];
  topEmployees: {
    id: string;
    full_name: string;
    role_title: string | null;
    avatar_url: string | null;
    score?: number;
  }[];
  recentSales: {
    id: string;
    total: number;
    customer_name: string | null;
    occurred_at: string;
    sale_items: { quantity: number; products: { name: string } | null }[];
  }[];
};

export type CalendarGoalStatus = {
  day: string;
  status: "met" | "missed" | "neutral";
  applicableCount: number;
  metCount: number;
};

type ChartPeriod = "1" | "3" | "6" | "12";

const PERIOD_LABELS: Record<ChartPeriod, string> = {
  "1": "1 mês",
  "3": "3 meses",
  "6": "6 meses",
  "12": "1 ano",
};
const PIE_COLORS = ["#3b9ef5", "#6ab6f8", "#8bc7f8", "#a9d6f8", "#c8e5fb"];

export function DashboardUI({
  dashboard,
  showAdminMetrics,
  loading = false,
  selectedDate,
  onSelectedDateChange,
  calendarMonth,
  onCalendarMonthChange,
  calendarStatuses = [],
}: {
  dashboard?: DashboardData;
  showAdminMetrics: boolean;
  loading?: boolean;
  selectedDate?: string;
  onSelectedDateChange?: (date: string) => void;
  calendarMonth?: Date;
  onCalendarMonthChange?: (month: Date) => void;
  calendarStatuses?: CalendarGoalStatus[];
}) {
  const [period, setPeriod] = useState<ChartPeriod>("6");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [localSelectedDate, setLocalSelectedDate] = useState(() => toLocalDateKey(new Date()));
  const [localCalendarMonth, setLocalCalendarMonth] = useState(() => new Date());
  const [profileEmployeeId, setProfileEmployeeId] = useState<string | null>(null);
  const isDark = useIsDark();
  const activeDate = selectedDate ?? localSelectedDate;
  const activeMonth = calendarMonth ?? localCalendarMonth;
  const statusMap = useMemo(
    () => new Map(calendarStatuses.map((entry) => [entry.day, entry])),
    [calendarStatuses],
  );
  const calendarDays = useMemo(() => getCalendarDays(activeDate), [activeDate]);
  const chartData = useMemo(() => buildCashFlowSeries(dashboard, period), [dashboard, period]);
  const productTotal = (dashboard?.top ?? []).reduce((sum, item) => sum + item.qty, 0);
  const maxEmployeeScore = Math.max(
    1,
    ...(dashboard?.topEmployees ?? []).map((employee) => employee.score ?? 0),
  );
  const kpis = [
    { title: "Receita", value: fmtBRL(dashboard?.income), icon: TrendingUp, show: true },
    {
      title: "Despesas",
      value: fmtBRL(dashboard?.expense),
      icon: TrendingDown,
      show: showAdminMetrics,
    },
    { title: "Lucro", value: fmtBRL(dashboard?.profit), icon: Wallet, show: showAdminMetrics },
    { title: "Vendas", value: String(dashboard?.salesCount ?? 0), icon: ShoppingCart, show: true },
    {
      title: "Produtos vendidos",
      value: String(dashboard?.productsCount ?? 0),
      icon: Package,
      show: true,
    },
    {
      title: "Funcionários",
      value: String(dashboard?.employeesCount ?? 0),
      icon: Users,
      show: showAdminMetrics,
    },
  ];

  const selectDate = (date: Date) => {
    const key = toLocalDateKey(date);
    setLocalSelectedDate(key);
    setLocalCalendarMonth(date);
    onSelectedDateChange?.(key);
    onCalendarMonthChange?.(date);
    setCalendarOpen(false);
  };

  const changeMonth = (month: Date) => {
    setLocalCalendarMonth(month);
    onCalendarMonthChange?.(month);
  };

  const calendarModifiers = {
    goalMet: calendarStatuses
      .filter((entry) => entry.status === "met")
      .map((entry) => parseLocalDate(entry.day)),
    goalMissed: calendarStatuses
      .filter((entry) => entry.status === "missed")
      .map((entry) => parseLocalDate(entry.day)),
    goalNeutral: calendarStatuses
      .filter((entry) => entry.status === "neutral")
      .map((entry) => parseLocalDate(entry.day)),
  };

  return (
    <div className="space-y-[clamp(.9rem,1.4vw,1.5rem)]">
      <header className="flex flex-col gap-[clamp(.9rem,1.4vw,1.5rem)] sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[clamp(1.05rem,1.25vw,1.35rem)] font-bold tracking-[-0.035em] text-slate-950 dark:text-slate-50">
          growCo. Dashboard
        </h1>
        <div className="flex items-center gap-[clamp(.55rem,.8vw,.85rem)]">
          <button
            type="button"
            aria-label="Notificações"
            className="grid h-[clamp(2.65rem,3.1vw,3.35rem)] w-[clamp(2.65rem,3.1vw,3.35rem)] place-items-center rounded-full bg-primary text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Bell
              className="h-[clamp(.95rem,1.2vw,1.2rem)] w-[clamp(.95rem,1.2vw,1.2rem)]"
              strokeWidth={1.8}
            />
          </button>
          <Link
            to="/configuracoes"
            aria-label="Abrir configurações"
            className="grid h-[clamp(2.65rem,3.1vw,3.35rem)] w-[clamp(2.65rem,3.1vw,3.35rem)] place-items-center rounded-full bg-primary text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Settings
              className="h-[clamp(.95rem,1.2vw,1.2rem)] w-[clamp(.95rem,1.2vw,1.2rem)]"
              strokeWidth={1.8}
            />
          </Link>
        </div>
      </header>

      <div className="grid gap-[clamp(.9rem,1.4vw,1.5rem)] md:grid-cols-[1.95fr_1.05fr]">
        <div className="space-y-[clamp(.9rem,1.4vw,1.5rem)]">
          <section aria-labelledby="dashboard-calendar-title">
            <div className="mb-2 flex items-center gap-1.5">
              <h2
                id="dashboard-calendar-title"
                className="text-[clamp(.82rem,.96vw,1.03rem)] font-semibold tracking-[-0.015em]"
              >
                Calendário
              </h2>
              <button
                type="button"
                onClick={() => setCalendarOpen(true)}
                className="rounded-md p-0.5 text-slate-700 dark:text-slate-200 transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Abrir calendário mensal"
              >
                <CalendarDays className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-7 overflow-hidden rounded-[clamp(.8rem,1vw,1rem)] bg-white dark:bg-card px-2 py-[clamp(.45rem,.65vw,.7rem)] shadow-[0_8px_24px_rgba(0,0,0,0.055)]">
              {calendarDays.map((day) => {
                const goalStatus = statusMap.get(day.key)?.status ?? "neutral";
                return (
                  <button
                    type="button"
                    key={day.key}
                    onClick={() => selectDate(day.date)}
                    className={`relative flex min-w-0 flex-col items-center justify-center rounded-lg py-1 text-center transition-colors hover:bg-slate-50 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${day.isSelected ? "bg-primary/10 ring-1 ring-inset ring-primary/15" : ""}`}
                    aria-current={day.isToday ? "date" : undefined}
                    aria-pressed={day.isSelected}
                    aria-label={`Filtrar dashboard por ${day.date.toLocaleDateString("pt-BR")}`}
                  >
                    <span className="text-[clamp(.58rem,.64vw,.7rem)] font-medium uppercase leading-none tracking-[0.035em] text-slate-500 dark:text-slate-400">
                      {day.month}
                    </span>
                    <span
                      className={`mt-0.5 text-[clamp(.84rem,.92vw,1rem)] font-bold leading-none ${day.isSelected || day.isToday ? "text-primary" : "text-slate-900 dark:text-slate-50"}`}
                    >
                      {day.day}
                    </span>
                    <span
                      className={`absolute top-0 h-1.5 w-1.5 rounded-full ${goalStatus === "met" ? "bg-primary" : goalStatus === "missed" ? "bg-red-500" : "bg-slate-300 dark:bg-slate-600"}`}
                      title={
                        goalStatus === "met"
                          ? "Meta atingida"
                          : goalStatus === "missed"
                            ? "Meta não atingida"
                            : "Sem resultado aplicável"
                      }
                    />
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[clamp(.62rem,.7vw,.76rem)] font-medium text-slate-500 dark:text-slate-400">
              Dados de{" "}
              {parseLocalDate(activeDate).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </section>

          <div className="grid grid-cols-2 gap-[clamp(.9rem,1.4vw,1.5rem)] md:grid-cols-3">
            {loading
              ? Array.from({ length: showAdminMetrics ? 6 : 3 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="h-[clamp(4rem,5.4vw,5.9rem)] rounded-[clamp(.75rem,1vw,1rem)]"
                  />
                ))
              : kpis
                  .filter((kpi) => kpi.show)
                  .map((kpi) => (
                    <KPI key={kpi.title} title={kpi.title} value={kpi.value} icon={kpi.icon} />
                  ))}
          </div>

          {dashboard && dashboard.lowStock.length > 0 && (
            <Card className="bg-[#fff8e8] dark:bg-amber-400/10 shadow-none">
              <CardContent className="pt-6">
                <p className="font-medium text-amber-900 dark:text-amber-200">Alerta de estoque baixo</p>
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  {dashboard.lowStock
                    .map((product) => `${product.name} (${product.stock})`)
                    .join(", ")}
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="h-[clamp(18rem,24vw,27rem)]">
            <CardHeader className="flex-row items-center justify-between space-y-0 px-[clamp(1rem,1.4vw,1.5rem)] py-[clamp(1rem,1.4vw,1.5rem)]">
              <CardTitle className="text-[clamp(.85rem,1vw,1.1rem)] font-semibold tracking-tight">
                Receita x Despesa
              </CardTitle>
              <Select value={period} onValueChange={(value) => setPeriod(value as ChartPeriod)}>
                <SelectTrigger
                  aria-label="Selecionar período do gráfico"
                  className="h-8 w-[6.7rem] rounded-full border-0 bg-primary px-3 text-xs font-medium text-white shadow-none focus:ring-primary/30 [&>svg]:text-white [&>svg]:opacity-100"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end" className="rounded-xl border-slate-100 dark:border-white/10">
                  {(Object.keys(PERIOD_LABELS) as ChartPeriod[]).map((value) => (
                    <SelectItem key={value} value={value} className="rounded-lg">
                      {PERIOD_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="h-[calc(100%-4rem)] px-[clamp(.8rem,1.2vw,1.25rem)] pb-5 pt-1">
              {chartData.every((item) => item.receita === 0 && item.despesa === 0) ? (
                <div className="grid h-full place-items-center text-sm text-muted-foreground">
                  Nenhuma movimentação no período selecionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barGap={4}>
                    <CartesianGrid
                      vertical={false}
                      stroke={isDark ? "rgba(255,255,255,.08)" : "#eef2f7"}
                      strokeDasharray="3 5"
                    />
                    <XAxis
                      dataKey="mes"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: isDark ? "#93adc2" : "#94a3b8", fontSize: 10 }}
                    />
                    <YAxis hide />
                    <ChartTooltip
                      cursor={{ fill: isDark ? "rgba(255,255,255,.04)" : "rgba(59,158,245,.04)" }}
                      contentStyle={{
                        border: "0",
                        background: isDark ? "#0d3250" : "#ffffff",
                        color: isDark ? "#e8f1f8" : "#0f172a",
                        borderRadius: "12px",
                        boxShadow: "0 8px 24px rgba(15,23,42,.1)",
                        fontSize: "12px",
                      }}
                      formatter={(value: number, name: string) => [
                        fmtBRL(Number(value)),
                        name === "receita" ? "Receita" : "Despesa",
                      ]}
                    />
                    <Bar dataKey="receita" fill="#3b9ef5" radius={[5, 5, 0, 0]} maxBarSize={26} />
                    <Bar dataKey="despesa" fill={isDark ? "#4b6a82" : "#d8d8d8"} radius={[5, 5, 0, 0]} maxBarSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-[clamp(.9rem,1.4vw,1.5rem)] md:pt-[clamp(1.65rem,2vw,2rem)]">
          <Card className="h-[clamp(17rem,21vw,23rem)]">
            <CardHeader className="px-[clamp(1rem,1.4vw,1.5rem)] py-[clamp(.8rem,1.1vw,1.2rem)]">
              <CardTitle className="text-[clamp(.85rem,1vw,1.1rem)] font-semibold tracking-tight">
                Produtos mais vendidos
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-3.5rem)] px-4 pb-5 pt-0">
              {(dashboard?.top ?? []).length === 0 ? (
                <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
                  Nenhuma venda registrada ainda.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboard?.top ?? []}
                      dataKey="qty"
                      nameKey="name"
                      outerRadius="82%"
                      stroke={isDark ? "#0b2d44" : "#fff"}
                      strokeWidth={2}
                    >
                      {(dashboard?.top ?? []).map((item, index) => (
                        <Cell key={item.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ProductTooltip total={productTotal} />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="min-h-[clamp(19rem,24vw,26rem)]">
            <CardContent className="space-y-[clamp(1rem,1.3vw,1.4rem)] px-[clamp(1rem,1.4vw,1.5rem)] py-[clamp(1rem,1.35vw,1.45rem)]">
              <section aria-labelledby="dashboard-goals-title">
                <h2
                  id="dashboard-goals-title"
                  className="text-[clamp(.85rem,1vw,1.1rem)] font-semibold tracking-tight"
                >
                  Metas
                </h2>
                {(dashboard?.goals ?? []).length === 0 ? (
                  <p className="py-5 text-sm text-muted-foreground">Nenhuma meta configurada.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {(dashboard?.goals ?? []).slice(0, 2).map((goal) => {
                      const percentage = Math.min(100, (goal.progress / goal.target) * 100);
                      return (
                        <div key={goal.id}>
                          <div className="mb-1.5 flex items-center justify-between gap-3 text-[clamp(.7rem,.78vw,.84rem)]">
                            <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                              {goal.title}
                            </span>
                            <span className="shrink-0 text-slate-500 dark:text-slate-400">
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full border border-slate-100 dark:border-white/10 bg-white dark:bg-card">
                            <div
                              className="h-full rounded-full bg-primary transition-[width] duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[clamp(.62rem,.68vw,.74rem)] text-slate-500 dark:text-slate-400">
                            {formatGoalValue(goal.metric, goal.progress)} de{" "}
                            {formatGoalValue(goal.metric, goal.target)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <div className="h-px bg-slate-100 dark:bg-white/10" />
              <section aria-labelledby="dashboard-employees-title">
                <h2
                  id="dashboard-employees-title"
                  className="text-[clamp(.85rem,1vw,1.1rem)] font-semibold tracking-tight"
                >
                  Top funcionários
                </h2>
                {(dashboard?.topEmployees ?? []).length === 0 ? (
                  <p className="py-5 text-sm text-muted-foreground">Nenhum funcionário ativo.</p>
                ) : (
                  <div className="mt-3 space-y-[clamp(.7rem,.9vw,1rem)]">
                    {(dashboard?.topEmployees ?? []).map((employee) => (
                      <button
                        type="button"
                        key={employee.id}
                        onClick={() => setProfileEmployeeId(employee.id)}
                        className="flex w-full items-center gap-[clamp(.6rem,.75vw,.85rem)] rounded-xl p-1 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        aria-label={`Abrir perfil de ${employee.full_name}`}
                      >
                        <Avatar className="h-[clamp(1.8rem,2.1vw,2.25rem)] w-[clamp(1.8rem,2.1vw,2.25rem)]">
                          <AvatarImage src={employee.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-[#6d86d5] text-[clamp(.58rem,.66vw,.72rem)] font-medium text-white">
                            {employee.full_name
                              .split(" ")
                              .map((word) => word[0])
                              .slice(0, 2)
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[clamp(.75rem,.84vw,.92rem)] font-medium text-slate-800 dark:text-slate-100">
                              {employee.full_name}
                            </p>
                            <span className="text-[clamp(.6rem,.68vw,.74rem)] text-slate-500 dark:text-slate-400">
                              {(employee.score ?? 0).toFixed(0)} pts
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{
                                width: `${Math.max(8, ((employee.score ?? 0) / maxEmployeeScore) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="min-h-[clamp(16rem,19vw,22rem)]">
        <CardHeader className="px-[clamp(1rem,1.4vw,1.5rem)] py-[clamp(1rem,1.4vw,1.5rem)]">
          <CardTitle className="text-[clamp(.85rem,1vw,1.1rem)] font-semibold tracking-tight">
            Atividades recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(dashboard?.recentSales ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma venda ainda. Registre em <span className="font-medium">Vendas</span> para ver
              aqui.
            </p>
          ) : (
            <ul className="mx-auto max-w-2xl divide-y divide-slate-100 dark:divide-white/10">
              {(dashboard?.recentSales ?? []).map((sale) => (
                <li
                  key={sale.id}
                  className="flex items-start justify-between gap-4 py-[clamp(.7rem,.9vw,1rem)]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[clamp(.8rem,.92vw,1.02rem)] font-medium">
                      {sale.sale_items
                        .map((item) => `${item.quantity}× ${item.products?.name ?? "?"}`)
                        .join(", ")}
                    </p>
                    <p className="text-[clamp(.7rem,.8vw,.9rem)] text-muted-foreground">
                      {fmtDateTime(sale.occurred_at)}{" "}
                      {sale.customer_name ? `• ${sale.customer_name}` : ""}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-[clamp(.8rem,.92vw,1.02rem)] font-medium text-slate-700 dark:text-slate-200">
                    {fmtBRL(sale.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
        <DialogContent className="w-[min(92vw,29rem)] border-0 p-5 sm:max-w-[29rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-[-0.025em]">
              Selecionar data
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={parseLocalDate(activeDate)}
              onSelect={(date) => date && selectDate(date)}
              month={activeMonth}
              onMonthChange={changeMonth}
              captionLayout="dropdown"
              startMonth={new Date(2020, 0)}
              endMonth={new Date(new Date().getFullYear() + 5, 11)}
              modifiers={calendarModifiers}
              modifiersClassNames={{
                goalMet: "[&>button]:after:bg-primary",
                goalMissed: "[&>button]:after:bg-red-500",
                goalNeutral: "[&>button]:after:bg-slate-300 dark:[&>button]:after:bg-slate-600",
              }}
              className="w-full [--cell-size:2.7rem] [&_[data-day]]:relative [&_[data-day]]:after:absolute [&_[data-day]]:after:bottom-1 [&_[data-day]]:after:left-1/2 [&_[data-day]]:after:h-1 [&_[data-day]]:after:w-1 [&_[data-day]]:after:-translate-x-1/2 [&_[data-day]]:after:rounded-full"
            />
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
            <CalendarLegend color="bg-primary" label="Meta atingida" />
            <CalendarLegend color="bg-red-500" label="Não atingida" />
            <CalendarLegend color="bg-slate-300 dark:bg-slate-600" label="Sem resultado" />
          </div>
        </DialogContent>
      </Dialog>

      <UserProfileDialog
        open={!!profileEmployeeId}
        onOpenChange={(open) => !open && setProfileEmployeeId(null)}
        employeeId={profileEmployeeId ?? undefined}
        preview={profileEmployeeId?.startsWith("preview-")}
      />
    </div>
  );
}

function KPI({ title, value, icon: Icon }: { title: string; value: string; icon: LucideIcon }) {
  return (
    <Card className="h-[clamp(4rem,5.4vw,5.9rem)] rounded-[clamp(.75rem,1vw,1rem)]">
      <CardContent className="flex h-full items-start justify-between p-[clamp(.7rem,1vw,1rem)]">
        <div className="min-w-0">
          <p className="text-[clamp(.7rem,.8vw,.86rem)] text-slate-600 dark:text-slate-300">{title}</p>
          <p className="mt-1 truncate text-[clamp(.88rem,1.08vw,1.22rem)] font-semibold tracking-tight">
            {value}
          </p>
        </div>
        <Icon
          className="mt-0.5 h-[clamp(.8rem,.95vw,1.05rem)] w-[clamp(.8rem,.95vw,1.05rem)] shrink-0 text-slate-500 dark:text-slate-400"
          strokeWidth={1.8}
        />
      </CardContent>
    </Card>
  );
}

function ProductTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { name?: string; qty?: number } }>;
  total: number;
}) {
  const item = payload?.[0]?.payload;
  if (!active || !item) return null;
  const quantity = Number(item.qty ?? 0);
  const percentage = total > 0 ? (quantity / total) * 100 : 0;
  return (
    <div className="rounded-xl bg-white dark:bg-card px-3 py-2 text-xs shadow-[0_8px_24px_rgba(15,23,42,.12)]">
      <p className="font-semibold text-slate-800 dark:text-slate-100">{item.name}</p>
      <p className="mt-0.5 text-slate-500 dark:text-slate-400">
        {quantity} unidade{quantity === 1 ? "" : "s"} • {percentage.toFixed(1)}%
      </p>
    </div>
  );
}

function toLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getCalendarDays(selectedDate: string) {
  const selected = parseLocalDate(selectedDate);
  const now = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate() + index - 1,
    );
    return {
      key: toLocalDateKey(date),
      date,
      day: date.getDate(),
      month: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      isToday: date.toDateString() === now.toDateString(),
      isSelected: date.toDateString() === selected.toDateString(),
    };
  });
}

function CalendarLegend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function buildCashFlowSeries(dashboard: DashboardData | undefined, period: ChartPeriod) {
  if (!dashboard?.cashFlow) return (dashboard?.monthly ?? []).slice(-Number(period));
  const now = dashboard.selectedDate ? parseLocalDate(dashboard.selectedDate) : new Date();
  now.setHours(23, 59, 59, 999);
  if (period === "1") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    const weeks = Array.from({ length: 5 }, (_, index) => ({
      mes: `${index * 7 + 1}–${Math.min(index * 7 + 7, 30)} dias`,
      receita: 0,
      despesa: 0,
    }));
    dashboard.cashFlow.forEach((entry) => {
      const date = new Date(entry.occurred_at);
      if (date < start || date > now) return;
      const day = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
      const bucket = weeks[Math.min(4, Math.floor(day / 7))];
      bucket[entry.type === "income" ? "receita" : "despesa"] += entry.amount;
    });
    return weeks;
  }
  const count = Number(period);
  const months: Record<string, { mes: string; receita: number; despesa: number }> = {};
  for (let index = count - 1; index >= 0; index--) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    months[key] = {
      mes: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      receita: 0,
      despesa: 0,
    };
  }
  dashboard.cashFlow.forEach((entry) => {
    const date = new Date(entry.occurred_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!months[key]) return;
    months[key][entry.type === "income" ? "receita" : "despesa"] += entry.amount;
  });
  return Object.values(months);
}

function formatGoalValue(metric: GoalMetric, value: number) {
  return metric === "sales_revenue" ? fmtBRL(value) : Math.floor(value).toLocaleString("pt-BR");
}
