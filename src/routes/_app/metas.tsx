import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/mobile-db";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Target, Trash2, Building2, User, Users } from "lucide-react";
import { fmtBRL, fmtDate } from "@/lib/fmt";

export const Route = createFileRoute("/_app/metas")({ component: Metas });

type Period = "daily" | "weekly" | "monthly" | "yearly" | "custom";
type Metric = "sales_revenue" | "sales_count" | "products_sold";
type Assignee = "employee" | "team" | "company";

type Goal = {
  id: string; title: string; description: string | null;
  period: Period; start_date: string; end_date: string;
  metric: Metric; target_value: number;
  assignee_type: Assignee; assignee_id: string | null;
  active: boolean;
};

const METRIC_LABEL: Record<Metric, string> = {
  sales_revenue: "Faturamento (R$)",
  sales_count: "Nº de vendas",
  products_sold: "Produtos vendidos",
};
const PERIOD_LABEL: Record<Period, string> = {
  daily: "Diária", weekly: "Semanal", monthly: "Mensal", yearly: "Anual", custom: "Personalizada",
};

function computeDates(period: Period): { start: string; end: string } {
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
  const iso = (dt: Date) => dt.toISOString().slice(0, 10);
  if (period === "daily") return { start: iso(today), end: iso(today) };
  if (period === "weekly") {
    const day = today.getDay(); // 0=Sun
    const monday = new Date(y, m, d - ((day + 6) % 7));
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    return { start: iso(monday), end: iso(sunday) };
  }
  if (period === "monthly") return { start: iso(new Date(y, m, 1)), end: iso(new Date(y, m + 1, 0)) };
  if (period === "yearly") return { start: iso(new Date(y, 0, 1)), end: iso(new Date(y, 11, 31)) };
  return { start: iso(today), end: iso(today) };
}

function Metas() {
  const { isAdmin, companyId } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("monthly");
  const [metric, setMetric] = useState<Metric>("sales_revenue");
  const [assignee, setAssignee] = useState<Assignee>("company");
  const [assigneeId, setAssigneeId] = useState<string>("");

  const { data: goals } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => (await supabase.from("goals").select("*").eq("active", true).order("created_at", { ascending: false })).data as Goal[] ?? [],
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-for-goals"],
    queryFn: async () => (await supabase.from("employees").select("id, full_name").eq("active", true)).data ?? [],
    enabled: isAdmin,
  });

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => (await supabase.from("teams").select("id, name")).data ?? [],
  });

  const { data: progresses } = useQuery({
    queryKey: ["goal-progress", goals?.map((g) => g.id).join(",")],
    queryFn: async () => {
      if (!goals || goals.length === 0) return {};
      const entries = await Promise.all(goals.map(async (g) => {
        const { data } = await supabase.rpc("goal_progress" as never, { _goal_id: g.id } as never);
        return [g.id, Number(data ?? 0)] as const;
      }));
      return Object.fromEntries(entries) as Record<string, number>;
    },
    enabled: !!goals && goals.length > 0,
  });

  const labels = useQuery({
    queryKey: ["goal-labels"],
    queryFn: async () => {
      const [e, t] = await Promise.all([
        supabase.from("employees").select("id, full_name"),
        supabase.from("teams").select("id, name"),
      ]);
      const emp: Record<string, string> = {}; (e.data ?? []).forEach((x) => { emp[x.id] = x.full_name; });
      const tm: Record<string, string> = {}; (t.data ?? []).forEach((x) => { tm[x.id] = x.name; });
      return { emp, tm };
    },
  });

  const create = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!companyId) return;
    const fd = new FormData(e.currentTarget);
    const dates = period === "custom"
      ? { start: String(fd.get("start_date")), end: String(fd.get("end_date")) }
      : computeDates(period);
    const payload = {
      company_id: companyId,
      title: String(fd.get("title")),
      description: String(fd.get("description") || "") || null,
      period,
      start_date: dates.start,
      end_date: dates.end,
      metric,
      target_value: Number(fd.get("target_value")),
      assignee_type: assignee,
      assignee_id: assignee === "company" ? null : assigneeId || null,
    };
    if (!payload.title || !payload.target_value) return toast.error("Preencha título e meta");
    if (assignee !== "company" && !assigneeId) return toast.error("Escolha o responsável");
    const res = await supabase.from("goals").insert(payload);
    if (res.error) return toast.error(res.error.message);
    toast.success("Meta criada");
    setOpen(false); setAssigneeId("");
    qc.invalidateQueries({ queryKey: ["goals"] });
  };

  const deactivate = async (id: string) => {
    if (!confirm("Desativar esta meta?")) return;
    await supabase.from("goals").update({ active: false }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["goals"] });
  };

  const formatValue = (m: Metric, v: number) => m === "sales_revenue" ? fmtBRL(v) : String(Math.floor(v));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Metas</h1>
          <p className="text-muted-foreground text-sm">{isAdmin ? "Defina objetivos para a equipe" : "Seus objetivos e da empresa"}</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova meta</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Nova meta</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-3">
                <div><Label>Título</Label><Input name="title" required placeholder="Ex: Vender R$ 10.000 este mês" /></div>
                <div><Label>Descrição (opcional)</Label><Textarea name="description" rows={2} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Período</Label>
                    <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
                          <SelectItem key={p} value={p}>{PERIOD_LABEL[p]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Métrica</Label>
                    <Select value={metric} onValueChange={(v) => setMetric(v as Metric)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(METRIC_LABEL) as Metric[]).map((m) => (
                          <SelectItem key={m} value={m}>{METRIC_LABEL[m]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {period === "custom" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Início</Label><Input name="start_date" type="date" required /></div>
                    <div><Label>Fim</Label><Input name="end_date" type="date" required /></div>
                  </div>
                )}
                <div><Label>Meta (valor alvo)</Label><Input name="target_value" type="number" step="0.01" min="0.01" required /></div>
                <div>
                  <Label>Responsável</Label>
                  <Select value={assignee} onValueChange={(v) => { setAssignee(v as Assignee); setAssigneeId(""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">Empresa toda</SelectItem>
                      <SelectItem value="employee">Funcionário específico</SelectItem>
                      <SelectItem value="team">Equipe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {assignee === "employee" && (
                  <div>
                    <Label>Funcionário</Label>
                    <Select value={assigneeId} onValueChange={setAssigneeId}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {(employees ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {assignee === "team" && (
                  <div>
                    <Label>Equipe</Label>
                    <Select value={assigneeId} onValueChange={setAssigneeId}>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {(teams ?? []).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {(teams ?? []).length === 0 && <p className="text-xs text-muted-foreground mt-1">Crie equipes na página Equipes primeiro.</p>}
                  </div>
                )}
                <DialogFooter><Button type="submit">Criar meta</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {(goals ?? []).length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Target className="h-10 w-10 mx-auto mb-3 opacity-40" />
          {isAdmin ? "Nenhuma meta criada ainda." : "Nenhuma meta atribuída a você no momento."}
        </CardContent></Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {(goals ?? []).map((g) => {
          const progress = progresses?.[g.id] ?? 0;
          const pct = Math.min(100, (progress / g.target_value) * 100);
          const today = new Date(); const end = new Date(g.end_date);
          const daysLeft = Math.ceil((end.getTime() - today.getTime()) / 86400000);
          const assigneeLabel = g.assignee_type === "company"
            ? "Empresa toda"
            : g.assignee_type === "employee"
              ? (labels.data?.emp[g.assignee_id ?? ""] ?? "Funcionário")
              : (labels.data?.tm[g.assignee_id ?? ""] ?? "Equipe");
          const Icon = g.assignee_type === "company" ? Building2 : g.assignee_type === "team" ? Users : User;
          return (
            <Card key={g.id} className={pct >= 100 ? "border-emerald-500" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{g.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                      <Badge variant="secondary">{PERIOD_LABEL[g.period]}</Badge>
                      <Badge variant="outline">{METRIC_LABEL[g.metric]}</Badge>
                      <span className="flex items-center gap-1"><Icon className="h-3 w-3" />{assigneeLabel}</span>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button size="sm" variant="ghost" onClick={() => deactivate(g.id)}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-semibold">{formatValue(g.metric, progress)}</span>
                    <span className="text-xs text-muted-foreground">de {formatValue(g.metric, g.target_value)}</span>
                  </div>
                  <Progress value={pct} />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{pct.toFixed(0)}%</span>
                    <span>{fmtDate(g.start_date)} → {fmtDate(g.end_date)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  {pct >= 100 ? (
                    <Badge className="bg-emerald-600">Concluída 🎉</Badge>
                  ) : daysLeft >= 0 ? (
                    <span className="text-muted-foreground">{daysLeft === 0 ? "Termina hoje" : `${daysLeft} dia(s) restante(s)`}</span>
                  ) : (
                    <Badge variant="destructive">Vencida</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}