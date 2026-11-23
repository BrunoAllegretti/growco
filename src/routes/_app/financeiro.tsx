import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/mobile-db";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, TrendingUp, TrendingDown, Wallet, AlertTriangle, Trash2 } from "lucide-react";
import { fmtBRL, fmtDate } from "@/lib/fmt";
import { useIsDark } from "@/hooks/use-theme";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";

export const Route = createFileRoute("/_app/financeiro")({
  component: Financeiro,
});

function Financeiro() {
  const { isAdmin, companyId, user } = useAuth();
  const qc = useQueryClient();
  const isDark = useIsDark();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const today = new Date();
  const [from, setFrom] = useState(new Date(today.getFullYear(), today.getMonth() - 2, 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));

  const { data: cats } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });

  const { data: txs } = useQuery({
    queryKey: ["transactions", from, to],
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("*, categories(name)").gte("occurred_at", from).lte("occurred_at", to).order("occurred_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("company_settings").select("*").limit(1).maybeSingle()).data,
  });

  if (!isAdmin) return <p className="text-muted-foreground">Acesso restrito a administradores.</p>;

  const income = (txs ?? []).filter((t: { type: string }) => t.type === "income").reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);
  const expense = (txs ?? []).filter((t: { type: string }) => t.type === "expense").reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);
  const balance = income - expense;
  const highExpense = settings && expense > Number(settings.high_expense_alert);

  // daily aggregation
  const dayMap: Record<string, { dia: string; receita: number; despesa: number }> = {};
  (txs ?? []).forEach((t: { occurred_at: string; type: string; amount: number }) => {
    const k = t.occurred_at;
    if (!dayMap[k]) dayMap[k] = { dia: fmtDate(k), receita: 0, despesa: 0 };
    if (t.type === "income") dayMap[k].receita += Number(t.amount);
    else dayMap[k].despesa += Number(t.amount);
  });
  const series = Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);

  // forecast: avg daily over period * 30
  const days = Math.max(1, (new Date(to).getTime() - new Date(from).getTime()) / 86400000);
  const forecast = balance / days * 30;

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!companyId) return;
    const fd = new FormData(e.currentTarget);
    const res = await supabase.from("transactions").insert({
      type,
      amount: Number(fd.get("amount")),
      description: String(fd.get("description")),
      category_id: String(fd.get("category_id") || "") || null,
      occurred_at: String(fd.get("occurred_at")),
      company_id: companyId,
    });
    if (res.error) return toast.error(res.error.message);
    toast.success("Registrado");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const remove = async (id: string) => {
    await supabase.from("transactions").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["transactions"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground text-sm">Receitas, despesas e fluxo de caixa</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Lançamento</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo lançamento</DialogTitle></DialogHeader>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v as "income" | "expense")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Receita</SelectItem>
                    <SelectItem value="expense">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Descrição</Label><Input name="description" required /></div>
              <div><Label>Valor</Label><Input name="amount" type="number" step="0.01" min="0.01" required /></div>
              <div>
                <Label>Categoria</Label>
                <select name="category_id" className="w-full border rounded-md h-10 px-3 bg-background">
                  <option value="">—</option>
                  {(cats ?? []).filter((c: { type: string }) => c.type === type).map((c: { id: string; name: string }) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div><Label>Data</Label><Input name="occurred_at" type="date" defaultValue={new Date().toISOString().slice(0,10)} required /></div>
              <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-col sm:flex-row gap-3 items-end">
          <div><Label className="text-xs">De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label className="text-xs">Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI title="Receitas" value={fmtBRL(income)} icon={TrendingUp} color="text-emerald-600 dark:text-emerald-400" />
        <KPI title="Despesas" value={fmtBRL(expense)} icon={TrendingDown} color="text-red-600 dark:text-red-400" />
        <KPI title="Saldo" value={fmtBRL(balance)} icon={Wallet} color={balance >= 0 ? "text-primary" : "text-red-600 dark:text-red-400"} />
        <KPI title="Previsão 30d" value={fmtBRL(forecast)} icon={TrendingUp} color="text-muted-foreground" />
      </div>

      {highExpense && (
        <Card className="border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10">
          <CardContent className="pt-6 flex items-center gap-2 text-red-800 dark:text-red-300">
            <AlertTriangle className="h-5 w-5" /> Alerta: despesas no período acima de {fmtBRL(settings?.high_expense_alert)}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Fluxo de caixa</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,.12)" : "#ccc"} />
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip
                formatter={(v: number) => fmtBRL(v)}
                contentStyle={isDark ? { background: "#0d3250", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, color: "#e8f1f8" } : undefined}
                labelStyle={isDark ? { color: "#e8f1f8" } : undefined}
              />
              <Legend />
              <Line type="monotone" dataKey="receita" stroke="hsl(160 84% 39%)" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="despesa" stroke="hsl(0 84% 60%)" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Lançamentos</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead>Tipo</TableHead><TableHead>Valor</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {(txs ?? []).map((t: { id: string; occurred_at: string; description: string; categories: { name: string } | null; type: string; amount: number }) => (
                <TableRow key={t.id}>
                  <TableCell>{fmtDate(t.occurred_at)}</TableCell>
                  <TableCell>{t.description}</TableCell>
                  <TableCell>{t.categories?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant={t.type === "income" ? "default" : "destructive"}>{t.type === "income" ? "Receita" : "Despesa"}</Badge></TableCell>
                  <TableCell className={t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>{fmtBRL(t.amount)}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
              {(txs ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sem lançamentos no período</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ title, value, icon: Icon, color }: { title: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <Card><CardContent className="pt-6 flex items-center justify-between">
      <div><p className="text-xs text-muted-foreground">{title}</p><p className="text-xl font-bold mt-1">{value}</p></div>
      <Icon className={`h-8 w-8 ${color} opacity-70`} />
    </CardContent></Card>
  );
}