import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/mobile-db";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadCsv, fmtBRL, fmtDate } from "@/lib/fmt";

export const Route = createFileRoute("/_app/relatorios")({ component: Relatorios });

function Relatorios() {
  const { isAdmin } = useAuth();
  const { data: tx } = useQuery({ queryKey: ["rep-tx"], queryFn: async () => (await supabase.from("transactions").select("*, categories(name)")).data ?? [] });
  const { data: sales } = useQuery({ queryKey: ["rep-sales"], queryFn: async () => (await supabase.from("sales").select("*, sale_items(quantity, products(name))")).data ?? [] });
  const { data: emp } = useQuery({ queryKey: ["rep-emp"], queryFn: async () => (await supabase.from("employees").select("*")).data ?? [] });

  if (!isAdmin) return <p className="text-muted-foreground">Acesso restrito a administradores.</p>;

  const exportFin = () => downloadCsv("financeiro.csv", (tx ?? []).map((t: { occurred_at: string; type: string; description: string; categories: { name: string } | null; amount: number }) => ({
    Data: fmtDate(t.occurred_at), Tipo: t.type === "income" ? "Receita" : "Despesa", Descricao: t.description, Categoria: t.categories?.name ?? "", Valor: Number(t.amount).toFixed(2),
  })));

  const exportSales = () => downloadCsv("vendas.csv", (sales ?? []).map((s: { occurred_at: string; customer_name: string | null; total: number; sale_items: { quantity: number; products: { name: string } | null }[] }) => ({
    Data: fmtDate(s.occurred_at), Cliente: s.customer_name ?? "", Itens: s.sale_items.map((i) => `${i.quantity}x ${i.products?.name ?? ""}`).join(" | "), Total: Number(s.total).toFixed(2),
  })));

  const exportEmp = () => downloadCsv("funcionarios.csv", (emp ?? []).map((e: { full_name: string; role_title: string; salary: number; hire_date: string; active: boolean; email: string | null }) => ({
    Nome: e.full_name, Cargo: e.role_title, Email: e.email ?? "", Salario: Number(e.salary).toFixed(2), Admissao: fmtDate(e.hire_date), Status: e.active ? "Ativo" : "Inativo",
  })));

  const income = (tx ?? []).filter((t: { type: string }) => t.type === "income").reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);
  const expense = (tx ?? []).filter((t: { type: string }) => t.type === "expense").reduce((s: number, t: { amount: number }) => s + Number(t.amount), 0);
  const salesTotal = (sales ?? []).reduce((s: number, t: { total: number }) => s + Number(t.total), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground text-sm">Exporte dados consolidados</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Financeiro</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Receitas: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmtBRL(income)}</span></p>
            <p className="text-sm text-muted-foreground">Despesas: <span className="font-semibold text-red-600 dark:text-red-400">{fmtBRL(expense)}</span></p>
            <p className="text-sm text-muted-foreground">Lucro: <span className="font-semibold">{fmtBRL(income - expense)}</span></p>
            <Button onClick={exportFin} className="w-full mt-3"><Download className="h-4 w-4 mr-2" /> Exportar CSV</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Vendas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Total vendido: <span className="font-semibold">{fmtBRL(salesTotal)}</span></p>
            <p className="text-sm text-muted-foreground">Nº de vendas: <span className="font-semibold">{sales?.length ?? 0}</span></p>
            <Button onClick={exportSales} className="w-full mt-3"><Download className="h-4 w-4 mr-2" /> Exportar CSV</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Funcionários</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Total: <span className="font-semibold">{emp?.length ?? 0}</span></p>
            <p className="text-sm text-muted-foreground">Ativos: <span className="font-semibold">{(emp ?? []).filter((e: { active: boolean }) => e.active).length}</span></p>
            <Button onClick={exportEmp} className="w-full mt-3"><Download className="h-4 w-4 mr-2" /> Exportar CSV</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Para PDF, use a função de impressão do navegador (Ctrl/Cmd + P) em qualquer página — está formatada para impressão.
        </CardContent>
      </Card>
    </div>
  );
}