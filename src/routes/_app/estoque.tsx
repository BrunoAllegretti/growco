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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Package, AlertTriangle, ArrowDownToLine } from "lucide-react";
import { fmtBRL, fmtDateTime } from "@/lib/fmt";

export const Route = createFileRoute("/_app/estoque")({ component: Estoque });

type Product = { id: string; name: string; sku: string | null; price: number; cost: number; stock: number; min_stock: number; active: boolean };

function Estoque() {
  const { isAdmin, companyId } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [entryFor, setEntryFor] = useState<Product | null>(null);

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await supabase.from("products").select("*").order("name")).data as Product[],
  });

  const { data: moves } = useQuery({
    queryKey: ["stock-moves"],
    queryFn: async () => (await supabase.from("stock_movements").select("*, products(name)").order("created_at", { ascending: false }).limit(50)).data ?? [],
  });

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!companyId) return toast.error("Empresa não carregada — recarregue a página");
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name")),
      sku: String(fd.get("sku") || "") || null,
      price: Number(fd.get("price")),
      cost: Number(fd.get("cost")),
      stock: 0,
      min_stock: Number(fd.get("min_stock")),
    };
    const initialStock = Number(fd.get("stock") || 0);
    if (editing) {
      const res = await supabase.from("products").update({ ...payload, stock: editing.stock }).eq("id", editing.id);
      if (res.error) { console.error(res.error); return toast.error(`Erro: ${res.error.message}`); }
    } else {
      const ins = await supabase.from("products").insert({ ...payload, company_id: companyId }).select("id").single();
      if (ins.error) { console.error(ins.error); return toast.error(`Erro: ${ins.error.message}`); }
      if (initialStock > 0) {
        const mv = await supabase.from("stock_movements").insert({
          product_id: ins.data.id, type: "in", quantity: initialStock,
          reason: "Estoque inicial", company_id: companyId,
        });
        if (mv.error) toast.error(`Produto criado, mas erro ao registrar entrada: ${mv.error.message}`);
      }
    }
    toast.success(`Produto ${payload.name} salvo`);
    setOpen(false); setEditing(null);
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["stock-moves"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const addStock = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!entryFor || !companyId) return;
    const fd = new FormData(e.currentTarget);
    const qty = Number(fd.get("quantity"));
    const unitCost = fd.get("unit_cost") ? Number(fd.get("unit_cost")) : null;
    if (unitCost !== null && unitCost !== entryFor.cost) {
      await supabase.from("products").update({ cost: unitCost }).eq("id", entryFor.id);
    }
    const res = await supabase.from("stock_movements").insert({
      product_id: entryFor.id,
      type: "in",
      quantity: qty,
      reason: String(fd.get("reason") || "Compra de fornecedor"),
      company_id: companyId,
    });
    if (res.error) return toast.error(res.error.message);
    toast.success("Entrada registrada e despesa lançada");
    setEntryFor(null);
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["stock-moves"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Estoque</h1>
          <p className="text-muted-foreground text-sm">Produtos e movimentações</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Produto</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo produto"}</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <div><Label>Nome</Label><Input name="name" defaultValue={editing?.name} required /></div>
                <div><Label>SKU</Label><Input name="sku" defaultValue={editing?.sku ?? ""} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Preço</Label><Input name="price" type="number" step="0.01" defaultValue={editing?.price ?? 0} required /></div>
                  <div><Label>Custo</Label><Input name="cost" type="number" step="0.01" defaultValue={editing?.cost ?? 0} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Estoque</Label><Input name="stock" type="number" defaultValue={editing?.stock ?? 0} required /></div>
                  <div><Label>Mínimo</Label><Input name="min_stock" type="number" defaultValue={editing?.min_stock ?? 0} required /></div>
                </div>
                <DialogFooter><Button type="submit">Salvar</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Produto</TableHead><TableHead>SKU</TableHead><TableHead>Preço</TableHead><TableHead>Estoque</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {(products ?? []).map((p) => {
                const low = p.stock <= p.min_stock;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" />{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.sku ?? "—"}</TableCell>
                    <TableCell>{fmtBRL(p.price)}</TableCell>
                    <TableCell>{p.stock} <span className="text-xs text-muted-foreground">/ min {p.min_stock}</span></TableCell>
                    <TableCell>{low ? <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Baixo</Badge> : <Badge>OK</Badge>}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {isAdmin && <>
                        <Button size="sm" variant="ghost" onClick={() => setEntryFor(p)}><ArrowDownToLine className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      </>}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(products ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum produto cadastrado</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Movimentações recentes</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Produto</TableHead><TableHead>Tipo</TableHead><TableHead>Qtd</TableHead><TableHead>Motivo</TableHead></TableRow></TableHeader>
            <TableBody>
              {(moves ?? []).map((m: { id: string; created_at: string; products: { name: string } | null; type: string; quantity: number; reason: string | null }) => (
                <TableRow key={m.id}>
                  <TableCell>{fmtDateTime(m.created_at)}</TableCell>
                  <TableCell>{m.products?.name ?? "—"}</TableCell>
                  <TableCell><Badge variant={m.type === "in" ? "default" : "secondary"}>{m.type === "in" ? "Entrada" : "Saída"}</Badge></TableCell>
                  <TableCell>{m.quantity}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{m.reason ?? "—"}</TableCell>
                </TableRow>
              ))}
              {(moves ?? []).length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Sem movimentações</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!entryFor} onOpenChange={(v) => !v && setEntryFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Entrada de estoque — {entryFor?.name}</DialogTitle></DialogHeader>
          <form onSubmit={addStock} className="space-y-3">
            <div><Label>Quantidade</Label><Input name="quantity" type="number" min="1" required /></div>
            <div>
              <Label>Custo unitário (R$)</Label>
              <Input name="unit_cost" type="number" step="0.01" defaultValue={entryFor?.cost ?? 0} />
              <p className="text-xs text-muted-foreground mt-1">Será lançada como despesa automaticamente (qtd × custo).</p>
            </div>
            <div><Label>Motivo</Label><Input name="reason" placeholder="Compra de fornecedor" /></div>
            <DialogFooter><Button type="submit">Adicionar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}