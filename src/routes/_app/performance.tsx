import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/lib/mobile-db";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Award, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { RibbonIcon } from "@/components/RibbonIcon";
import { fmtBRL } from "@/lib/fmt";
import { BADGES } from "@/lib/badges";

export const Route = createFileRoute("/_app/performance")({ component: Performance });

type Period = "day" | "week" | "month" | "quarter" | "year";

function periodRange(p: Period): { start: string; end: string; prevStart: string; prevEnd: string } {
  const now = new Date();
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  if (p === "day") start.setHours(0, 0, 0, 0);
  else if (p === "week") { start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0); }
  else if (p === "month") { start.setDate(1); start.setHours(0, 0, 0, 0); }
  else if (p === "quarter") { start.setMonth(now.getMonth() - 3); start.setHours(0, 0, 0, 0); }
  else { start.setMonth(0, 1); start.setHours(0, 0, 0, 0); }
  const span = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - span);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end), prevStart: iso(prevStart), prevEnd: iso(prevEnd) };
}

function Performance() {
  const { companyId } = useAuth();
  const [period, setPeriod] = useState<Period>("month");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  const { data: departments } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: async () => (await supabase.from("departments").select("id, name").order("name")).data ?? [],
    enabled: !!companyId,
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-perf", companyId],
    queryFn: async () => (await supabase.from("employees").select("id, full_name, role_title, avatar_url, department_id, active").eq("active", true)).data ?? [],
    enabled: !!companyId,
  });

  const { data: badges } = useQuery({
    queryKey: ["employee-badges", companyId],
    queryFn: async () => (await supabase.from("employee_badges").select("employee_id, badge_code")).data ?? [],
    enabled: !!companyId,
  });

  const { data: scores } = useQuery({
    queryKey: ["scores", companyId, period, employees?.length],
    queryFn: async () => {
      if (!employees) return {};
      const r = periodRange(period);
      const out: Record<string, { now: number; prev: number }> = {};
      await Promise.all(employees.map(async (e) => {
        const a = await supabase.rpc("employee_score", { _employee_id: e.id, _start: r.start, _end: r.end });
        const b = await supabase.rpc("employee_score", { _employee_id: e.id, _start: r.prevStart, _end: r.prevEnd });
        out[e.id] = { now: Number(a.data ?? 0), prev: Number(b.data ?? 0) };
      }));
      return out;
    },
    enabled: !!employees,
  });

  const ranking = useMemo(() => {
    const list = (employees ?? [])
      .filter((e) => deptFilter === "all" || e.department_id === deptFilter)
      .map((e) => {
        const s = scores?.[e.id] ?? { now: 0, prev: 0 };
        const evo = s.prev === 0 ? (s.now > 0 ? 100 : 0) : ((s.now - s.prev) / s.prev) * 100;
        const myBadges = (badges ?? []).filter((b) => b.employee_id === e.id);
        return { ...e, score: s.now, prev: s.prev, evo, badges: myBadges.length };
      })
      .sort((a, b) => b.score - a.score);
    return list;
  }, [employees, scores, badges, deptFilter]);

  const totalBadges = (badges ?? []).length;
  const totalScore = ranking.reduce((s, r) => s + r.score, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Performance</h1>
        <p className="text-muted-foreground text-sm">Ranking e gamificação dos colaboradores</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI title="Colaboradores" value={String(ranking.length)} icon={Trophy} />
        <KPI title="Pontuação total" value={fmtBRL(totalScore).replace("R$", "").trim()} icon={Award} />
        <KPI title="Insígnias desbloqueadas" value={String(totalBadges)} icon={RibbonIcon} />
        <KPI title="Período" value={({ day: "Hoje", week: "Semana", month: "Mês", quarter: "Trimestre", year: "Ano" } as const)[period]} icon={TrendingUp} />
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-2">
          {(["day", "week", "month", "quarter", "year"] as Period[]).map((p) => (
            <Button key={p} size="sm" variant={p === period ? "default" : "outline"} onClick={() => setPeriod(p)}>
              {({ day: "Hoje", week: "Semana", month: "Mês", quarter: "Trimestre", year: "Ano" } as const)[p]}
            </Button>
          ))}
          <div className="w-px bg-border mx-2" />
          <Button size="sm" variant={deptFilter === "all" ? "default" : "outline"} onClick={() => setDeptFilter("all")}>Todos os setores</Button>
          {(departments ?? []).map((d) => (
            <Button key={d.id} size="sm" variant={deptFilter === d.id ? "default" : "outline"} onClick={() => setDeptFilter(d.id)}>{d.name}</Button>
          ))}
        </CardContent>
      </Card>

      {/* Top 3 podium */}
      {ranking.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          {ranking.slice(0, 3).map((r, i) => (
            <Card key={r.id} className={`relative overflow-hidden ${i === 0 ? "border-amber-400 border-2" : ""}`}>
              <div className={`absolute top-0 right-0 h-16 w-16 flex items-center justify-center font-bold text-2xl ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 dark:bg-slate-600" : "bg-orange-300"} rounded-bl-full pt-2 pr-2`}>{i + 1}</div>
              <CardContent className="pt-6 flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={r.avatar_url ?? undefined} />
                  <AvatarFallback>{r.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{r.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.role_title ?? "—"}</p>
                  <p className="text-2xl font-bold text-primary mt-1">{r.score.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {r.evo > 0 ? <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : r.evo < 0 ? <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" /> : <Minus className="h-3 w-3" />}
                    {r.evo.toFixed(1)}% vs anterior • {r.badges} insígnias
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Ranking completo</CardTitle></CardHeader>
        <CardContent className="p-0">
          {ranking.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum colaborador encontrado</p>
          ) : (
            <ul className="divide-y">
              {ranking.map((r, i) => (
                <li key={r.id} className="flex items-center gap-4 p-4">
                  <span className="text-lg font-bold w-8 text-muted-foreground">#{i + 1}</span>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={r.avatar_url ?? undefined} />
                    <AvatarFallback>{r.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.role_title ?? "—"}</p>
                  </div>
                  <Badge variant="secondary" className="gap-1">{r.badges} <RibbonIcon className="h-4 w-4" /></Badge>
                  <div className="text-right">
                    <p className="font-bold">{r.score.toFixed(0)} pts</p>
                    <p className="text-xs flex items-center justify-end gap-1">
                      {r.evo > 0 ? <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> : r.evo < 0 ? <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" /> : <Minus className="h-3 w-3" />}
                      <span className={r.evo > 0 ? "text-emerald-600 dark:text-emerald-400" : r.evo < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}>{r.evo.toFixed(1)}%</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Insígnias disponíveis</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {BADGES.slice(0, 12).map((b) => (
              <div key={b.code} className="text-center p-3 rounded-md border">
                <div className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center text-white ${b.color}`}><RibbonIcon className="h-5 w-5" /></div>
                <p className="text-xs font-semibold mt-2 truncate">{b.name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
          </div>
          <Icon className="h-8 w-8 text-primary opacity-70" />
        </div>
      </CardContent>
    </Card>
  );
}