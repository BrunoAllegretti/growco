import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/mobile-db";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, DollarSign, CheckCircle2, Clock, Trash2 } from "lucide-react";
import { fmtBRL, fmtDate } from "@/lib/fmt";
import { UserProfileDialog } from "@/components/UserProfileDialog";

export const Route = createFileRoute("/_app/funcionarios")({
  component: Funcionarios,
});

type Employee = {
  id: string;
  full_name: string;
  email: string | null;
  role_title: string;
  salary: number;
  hire_date: string;
  active: boolean;
  department_id: string | null;
};

function Funcionarios() {
  const { isAdmin, companyId } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Employee | null>(null);
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState<Employee | null>(null);
  const [roleSel, setRoleSel] = useState<string>("");
  const [deptSel, setDeptSel] = useState<string>("");
  const [profileEmployeeId, setProfileEmployeeId] = useState<string | null>(null);

  const { data: employees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Employee[];
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["company_roles"],
    queryFn: async () => {
      const { data } = await supabase.from("company_roles").select("*").order("title");
      return (data ?? []) as { id: string; title: string }[];
    },
  });
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("*").order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data } = await supabase
        .from("salary_payments")
        .select("*, employees(full_name)")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  if (!isAdmin) return <p className="text-muted-foreground">Acesso restrito a administradores.</p>;

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!companyId) return toast.error("Empresa não carregada — recarregue a página");
    const fd = new FormData(e.currentTarget);
    const role_title = roleSel || editing?.role_title || "";
    const department_id = deptSel === "__none__" ? null : deptSel || editing?.department_id || null;
    const payload = {
      full_name: editing ? editing.full_name : String(fd.get("full_name")),
      email: String(fd.get("email") || "") || null,
      role_title,
      department_id,
      salary: Number(fd.get("salary")),
      hire_date: String(fd.get("hire_date")),
    };
    if (!payload.full_name || !payload.role_title) return toast.error("Preencha nome e cargo");
    if ((roles ?? []).length === 0) return toast.error("Cadastre um cargo em Configurações antes");
    const res = editing
      ? await supabase.from("employees").update(payload).eq("id", editing.id)
      : await supabase.from("employees").insert({ ...payload, company_id: companyId });
    if (res.error) {
      console.error(res.error);
      return toast.error(`Erro: ${res.error.message}`);
    }
    toast.success(
      editing ? "Funcionário atualizado" : `Funcionário ${payload.full_name} cadastrado`,
    );
    setOpen(false);
    setEditing(null);
    setRoleSel("");
    setDeptSel("");
    qc.invalidateQueries({ queryKey: ["employees"] });
  };

  const toggleActive = async (e: Employee) => {
    await supabase.from("employees").update({ active: !e.active }).eq("id", e.id);
    qc.invalidateQueries({ queryKey: ["employees"] });
  };

  const handlePay = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!payOpen || !companyId) return;
    const fd = new FormData(e.currentTarget);
    const paid = fd.get("status") === "paid";
    const res = await supabase.from("salary_payments").insert({
      employee_id: payOpen.id,
      amount: Number(fd.get("amount")),
      reference_month: String(fd.get("reference_month")) + "-01",
      paid,
      paid_at: paid ? new Date().toISOString() : null,
      notes: String(fd.get("notes") || ""),
      company_id: companyId,
    });
    if (res.error) return toast.error(res.error.message);
    toast.success(paid ? "Pagamento registrado" : "Pagamento pendente criado");
    setPayOpen(null);
    qc.invalidateQueries({ queryKey: ["payments"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const togglePaid = async (p: { id: string; paid: boolean }) => {
    const res = await supabase
      .from("salary_payments")
      .update({
        paid: !p.paid,
        paid_at: !p.paid ? new Date().toISOString() : null,
      })
      .eq("id", p.id);
    if (res.error) return toast.error(res.error.message);
    toast.success(
      !p.paid ? "Marcado como pago — despesa lançada" : "Marcado como pendente — despesa removida",
    );
    qc.invalidateQueries({ queryKey: ["payments"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const removePayment = async (id: string) => {
    const res = await supabase.from("salary_payments").delete().eq("id", id);
    if (res.error) return toast.error(res.error.message);
    qc.invalidateQueries({ queryKey: ["payments"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Funcionários</h1>
          <p className="text-muted-foreground text-sm">Cadastros, cargos e pagamentos</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setEditing(null);
              setRoleSel("");
              setDeptSel("");
            } else {
              setRoleSel(editing?.role_title ?? "");
              setDeptSel(editing?.department_id ?? "");
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Novo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar" : "Novo funcionário"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <Label>Nome</Label>
                <Input name="full_name" defaultValue={editing?.full_name} readOnly={!!editing} disabled={!!editing} required={!editing} className={editing ? "bg-muted cursor-not-allowed" : undefined} />
              </div>
              <div>
                <Label>Email</Label>
                <Input name="email" type="email" defaultValue={editing?.email ?? ""} />
              </div>
              <div>
                <Label>Cargo</Label>
                <Select value={roleSel} onValueChange={setRoleSel}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        (roles ?? []).length === 0
                          ? "Nenhum cargo cadastrado"
                          : "Selecione um cargo"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(roles ?? []).map((r) => (
                      <SelectItem key={r.id} value={r.title}>
                        {r.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(roles ?? []).length === 0 && (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      Cadastre um cargo antes de salvar o funcionário.
                    </p>
                    <Button
                      asChild
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto shrink-0 p-0"
                    >
                      <Link to="/configuracoes" hash="cargos">
                        Cadastrar cargo
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label>Departamento</Label>
                <Select value={deptSel} onValueChange={setDeptSel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem departamento</SelectItem>
                    {(departments ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Salário</Label>
                <Input
                  name="salary"
                  type="number"
                  step="0.01"
                  defaultValue={editing?.salary ?? 0}
                  required
                />
              </div>
              <div>
                <Label>Data de admissão</Label>
                <Input
                  name="hire_date"
                  type="date"
                  defaultValue={editing?.hire_date ?? new Date().toISOString().slice(0, 10)}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Salário</TableHead>
                <TableHead>Admissão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(employees ?? []).map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    <button
                      type="button"
                      onClick={() => setProfileEmployeeId(e.id)}
                      className="rounded-md text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {e.full_name}
                    </button>
                  </TableCell>
                  <TableCell>{e.role_title}</TableCell>
                  <TableCell>{fmtBRL(e.salary)}</TableCell>
                  <TableCell>{fmtDate(e.hire_date)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={e.active ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => toggleActive(e)}
                    >
                      {e.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Abrir perfil de ${e.full_name}`}
                      onClick={() => setProfileEmployeeId(e.id)}
                    >
                      Ver perfil
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditing(e);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPayOpen(e)}>
                      <DollarSign className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(employees ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum funcionário cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de pagamentos</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead>Referência</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(payments ?? []).map(
                (p: {
                  id: string;
                  employees: { full_name: string } | null;
                  reference_month: string;
                  amount: number;
                  paid: boolean;
                }) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.employees?.full_name ?? "—"}</TableCell>
                    <TableCell>{fmtDate(p.reference_month)}</TableCell>
                    <TableCell>{fmtBRL(p.amount)}</TableCell>
                    <TableCell>
                      {p.paid ? (
                        <Badge className="bg-emerald-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Pago
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="sm"
                        variant={p.paid ? "ghost" : "default"}
                        onClick={() => togglePaid(p)}
                      >
                        {p.paid ? "Marcar pendente" : "Marcar pago"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removePayment(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ),
              )}
              {(payments ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    Sem pagamentos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!payOpen} onOpenChange={(v) => !v && setPayOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pagamento — {payOpen?.full_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePay} className="space-y-3">
            <div>
              <Label>Mês de referência</Label>
              <Input
                name="reference_month"
                type="month"
                defaultValue={new Date().toISOString().slice(0, 7)}
                required
              />
            </div>
            <div>
              <Label>Valor</Label>
              <Input
                name="amount"
                type="number"
                step="0.01"
                defaultValue={payOpen?.salary ?? 0}
                required
              />
            </div>
            <div>
              <Label>Status</Label>
              <select
                name="status"
                defaultValue="paid"
                className="w-full border rounded-md h-10 px-3 bg-background"
              >
                <option value="paid">Pago (lança despesa no Financeiro)</option>
                <option value="pending">Pendente (não lança despesa)</option>
              </select>
            </div>
            <div>
              <Label>Observações</Label>
              <Input name="notes" />
            </div>
            <DialogFooter>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <UserProfileDialog
        open={!!profileEmployeeId}
        onOpenChange={(nextOpen) => !nextOpen && setProfileEmployeeId(null)}
        employeeId={profileEmployeeId ?? undefined}
      />
    </div>
  );
}
