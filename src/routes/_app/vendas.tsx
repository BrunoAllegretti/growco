import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/mobile-db";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { fmtBRL, fmtDateTime } from "@/lib/fmt";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/vendas")({ component: Vendas });

type Product = { id: string; name: string; price: number; stock: number };

function Vendas() {
  const { companyId, user } = useAuth();
  const qc = useQueryClient();
  const [paidFilter, setPaidFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState("");
  const [items, setItems] = useState<{ product_id: string; quantity: number; unit_price: number }[]>([]);
  const [receipt, setReceipt] = useState<null | { customer: string | null; total: number; date: string; lines: { name: string; qty: number; price: number; newStock: number }[] }>(null);

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await supabase.from("products").select("id, name, price, stock").eq("active", true).order("name")).data as Product[],
  });

  const { data: sales } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => (await supabase.from("sales").select("*, sale_items(quantity, unit_price, products(name))").order("occurred_at", { ascending: false }).limit(50)).data ?? [],
  });

  const total = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);

  const addItem = () => {
    if (!products?.length) return;
    const p = products[0];
    setItems([...items, { product_id: p.id, quantity: 1, unit_price: Number(p.price) }]);
  };

  const updateItem = (idx: number, patch: Partial<typeof items[0]>) => {
    const next = [...items];
    next[idx] = { ...next[idx], ...patch };
    if (patch.product_id) {
      const p = products?.find((x) => x.id === patch.product_id);
      if (p) next[idx].unit_price = Number(p.price);
    }
    setItems(next);
  };

  const save = async () => {
    if (!items.length) return toast.error("Adicione ao menos um item");
    if (!companyId) return toast.error("Empresa não carregada, recarregue a página");
    // O banco confere novamente o estoque durante a venda, de forma atômica.
    const requested = new Map<string, number>();
    for (const it of items) {
      const p = products?.find((x) => x.id === it.product_id);
      if (!p) return toast.error("Produto inválido");
      if (!Number.isInteger(it.quantity) || it.quantity <= 0) return toast.error(`Quantidade inválida para ${p.name}`);
      requested.set(p.id, (requested.get(p.id) || 0) + it.quantity);
      if (requested.get(p.id)! > p.stock) return toast.error(`Estoque insuficiente de ${p.name} (disp. ${p.stock})`);
    }
    const { data: sale, error } = await supabase.from("sales").insert({ customer_name: customer || null, total: 0, company_id: companyId, created_by: user?.id ?? null }).select().single();
    if (error || !sale) return toast.error(error?.message ?? "Erro");
    const res = await supabase.from("sale_items").insert(items.map((i) => ({ ...i, sale_id: sale.id, company_id: companyId })));
    if (res.error) return toast.error(res.error.message);
    // Não confiar em valores de preço do navegador: a RPC usa o preço oficial do produto.
    const { data: savedSale, error: readError } = await supabase.from("sales")
      .select("*, sale_items(quantity, unit_price, product_id, products(name))")
      .eq("id", sale.id).maybeSingle();
    if (readError || !savedSale) {
      toast.success("Venda registrada. Consulte o histórico para conferir o total.");
      setReceipt(null);
    } else {
      const confirmed = savedSale as typeof savedSale & { sale_items: { product_id: string; quantity: number; unit_price: number; products?: { name: string } | null }[] };
      const lines = (confirmed.sale_items || []).map((i) => {
        const p = products?.find((x) => x.id === i.product_id);
        return { name: i.products?.name || p?.name || "Produto", qty: Number(i.quantity),
          price: Number(i.unit_price), newStock: Number(p?.stock ?? 0) - (requested.get(i.product_id) || 0) };
      });
      toast.success(`Venda #${sale.id.slice(0, 8)} registrada — ${fmtBRL(Number(confirmed.total))}`);
      setReceipt({ customer: confirmed.customer_name || null, total: Number(confirmed.total),
        date: confirmed.occurred_at, lines });
    }
    setOpen(false); setItems([]); setCustomer("");
    qc.invalidateQueries({ queryKey: ["sales"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["stock-moves"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["rep-tx"] });
    qc.invalidateQueries({ queryKey: ["rep-sales"] });
    qc.invalidateQueries({ queryKey: ["goals"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Vendas</h1>
          <p className="text-muted-foreground text-sm">Registrar e acompanhar vendas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Nova venda</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Registrar venda</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Cliente (opcional)</Label><Input value={customer} onChange={(e) => setCustomer(e.target.value)} /></div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>Itens</Label><Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Item</Button></div>
                {items.map((it, idx) => {
                  const p = products?.find((x) => x.id === it.product_id);
                  return (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <select className="w-full border rounded-md h-10 px-3 bg-background" value={it.product_id} onChange={(e) => updateItem(idx, { product_id: e.target.value })}>
                          {(products ?? []).map((pp) => <option key={pp.id} value={pp.id}>{pp.name} (estq {pp.stock})</option>)}
                        </select>
                      </div>
                      <div className="w-20"><Input type="number" min="1" max={p?.stock} value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} /></div>
                      <div className="w-28"><Input type="number" step="0.01" value={it.unit_price} readOnly title="Preço registrado no cadastro do produto" /></div>
                      <Button type="button" size="icon" variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  );
                })}
                {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Adicione itens à venda</p>}
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t"><span>Total</span><span>{fmtBRL(total)}</span></div>
            </div>
            <DialogFooter><Button onClick={save}>Finalizar venda</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant={paidFilter === "all" ? "default" : "outline"} onClick={() => setPaidFilter("all")}>Todas</Button>
        <Button size="sm" variant={paidFilter === "paid" ? "default" : "outline"} onClick={() => setPaidFilter("paid")}>Pagas</Button>
        <Button size="sm" variant={paidFilter === "unpaid" ? "default" : "outline"} onClick={() => setPaidFilter("unpaid")}>Pendentes</Button>
      </div>

      <Dialog open={!!receipt} onOpenChange={(v) => !v && setReceipt(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Venda confirmada</DialogTitle></DialogHeader>
          {receipt && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">{fmtDateTime(receipt.date)}{receipt.customer ? ` • ${receipt.customer}` : ""}</div>
              <div className="border rounded-md divide-y">
                {receipt.lines.map((l, i) => (
                  <div key={i} className="flex justify-between p-3 text-sm">
                    <div>
                      <div className="font-medium">{l.qty}× {l.name}</div>
                      <div className="text-xs text-muted-foreground">Estoque agora: {l.newStock}</div>
                    </div>
                    <div>{fmtBRL(l.qty * l.price)}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-lg pt-1"><span>Total</span><span>{fmtBRL(receipt.total)}</span></div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">Estoque atualizado. A receita será lançada no financeiro quando a venda for marcada como paga.</p>
            </div>
          )}
          <DialogFooter><Button onClick={() => setReceipt(null)}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader><CardTitle>Histórico de vendas</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Cliente</TableHead><TableHead>Itens</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {(sales ?? []).filter((s: { paid: boolean }) => paidFilter === "all" || (paidFilter === "paid" ? s.paid : !s.paid)).map((s: { id: string; occurred_at: string; customer_name: string | null; total: number; paid: boolean; sale_items: { quantity: number; products: { name: string } | null }[] }) => (
                <TableRow key={s.id}>
                  <TableCell>{fmtDateTime(s.occurred_at)}</TableCell>
                  <TableCell>{s.customer_name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.sale_items.map((i) => `${i.quantity}× ${i.products?.name ?? "?"}`).join(", ")}</TableCell>
                  <TableCell className="font-semibold">{fmtBRL(s.total)}</TableCell>
                  <TableCell>
                    {s.paid ? (
                      <Badge className="bg-emerald-600">Pago</Badge>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Pendente</Badge>
                        <Button size="sm" variant="outline" onClick={async () => {
                          const { error } = await supabase.from("sales").update({ paid: true, paid_at: new Date().toISOString() }).eq("id", s.id);
                          if (error) toast.error(error.message); else {
                            toast.success("Marcada como paga");
                            qc.invalidateQueries({ queryKey: ["sales"] });
                            qc.invalidateQueries({ queryKey: ["transactions"] });
                            qc.invalidateQueries({ queryKey: ["dashboard"] });
                            qc.invalidateQueries({ queryKey: ["rep-tx"] });
                          }
                        }}>Marcar pago</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(sales ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma venda registrada</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}