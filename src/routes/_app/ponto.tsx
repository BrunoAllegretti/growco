import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/mobile-db";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Clock, LogIn, LogOut } from "lucide-react";
import { fmtDateTime } from "@/lib/fmt";
import { useState } from "react";

export const Route = createFileRoute("/_app/ponto")({
  component: Ponto,
});

function Ponto() {
  const { user, isAdmin, companyId } = useAuth();
  const qc = useQueryClient();
  const [setupName, setSetupName] = useState("");
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const { data: employee } = useQuery({
    queryKey: ["my-employee", user?.id, companyId],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("employees").select("*").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Employees in this company without a linked user — owners can claim one
  const { data: unlinked } = useQuery({
    queryKey: ["unlinked-employees", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("employees")
        .select("id, full_name, role_title")
        .eq("company_id", companyId)
        .is("user_id", null)
        .order("full_name");
      return data ?? [];
    },
    enabled: !!companyId && !employee,
  });

  const linkExisting = async (employeeId: string) => {
    if (!user) return;
    setActivatingId(employeeId);
    const { error } = await (supabase as any).rpc('link_my_employee', { p_company: companyId, p_employee_id: employeeId });
    const data = error ? null : { id: employeeId };
    setActivatingId(null);
    if (error) return toast.error(error.message);
    qc.setQueryData(["my-employee", user.id], data);
    qc.invalidateQueries({ queryKey: ["my-employee"] });
    qc.invalidateQueries({ queryKey: ["unlinked-employees"] });
    qc.invalidateQueries({ queryKey: ["employees"] });
    toast.success("Cadastro vinculado! Agora você pode bater ponto.");
  };

  const createSelfEmployee = async () => {
    toast.error('O aplicativo vincula seu cadastro automaticamente ao entrar na empresa. Se ele estiver ausente, peça ao administrador para corrigir seu cadastro.');
  };

  const { data: entries } = useQuery({
    queryKey: ["time-entries", employee?.id, isAdmin, companyId],
    queryFn: async () => {
      let q = supabase.from("time_entries").select("*, employees(full_name)").order("clock_in", { ascending: false }).limit(50);
      if (!isAdmin && employee) q = q.eq("employee_id", employee.id);
      const { data } = await q;
      return data ?? [];
    },
    enabled: isAdmin || !!employee,
  });

  const openEntry = entries?.find((e: { employee_id: string; clock_out: string | null }) => e.employee_id === employee?.id && !e.clock_out);

  const clockIn = async () => {
    if (!employee) return toast.error("Ative seu cadastro de ponto primeiro.");
    if (!companyId) return;
    const { error } = await (supabase as any).rpc('clock_my_time', { p_company: companyId });
    if (error) return toast.error(error.message);
    toast.success("Entrada registrada");
    qc.invalidateQueries({ queryKey: ["time-entries"] });
  };

  const clockOut = async () => {
    if (!openEntry) return;
    const { error } = await (supabase as any).rpc('clock_my_time', { p_company: companyId });
    if (error) return toast.error(error.message);
    toast.success("Saída registrada");
    qc.invalidateQueries({ queryKey: ["time-entries"] });
  };

  const totalHours = (entries ?? [])
    .filter((e: { employee_id: string; hours: number | null }) => !isAdmin && e.employee_id === employee?.id)
    .reduce((s: number, e: { hours: number | null }) => s + Number(e.hours ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Ponto</h1>
        <p className="text-muted-foreground text-sm">Controle de entrada e saída</p>
      </div>

      {!employee && (
        <Card>
          <CardHeader><CardTitle>Ative seu ponto</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(unlinked ?? []).length > 0 && (
              <div className="space-y-2">
                <Label>Sou um destes funcionários já cadastrados:</Label>
                <div className="grid gap-2">
                  {(unlinked ?? []).map((e: { id: string; full_name: string; role_title: string }) => (
                    <div key={e.id} className="flex items-center justify-between border rounded-md p-3">
                      <div>
                        <p className="font-medium text-sm">{e.full_name}</p>
                        <p className="text-xs text-muted-foreground">{e.role_title}</p>
                      </div>
                      <Button size="sm" variant="outline" disabled={activatingId === e.id} onClick={() => linkExisting(e.id)}>
                        {activatingId === e.id ? "Vinculando..." : "Sou eu"}
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground text-center">— ou —</div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Criar meu cadastro de funcionário</Label>
              <div className="flex gap-2">
                <Input placeholder="Seu nome" value={setupName} onChange={(e) => setSetupName(e.target.value)} />
                <Button onClick={createSelfEmployee}>Criar e ativar</Button>
              </div>
              <p className="text-xs text-muted-foreground">Vincula seu usuário a um cadastro de funcionário para você bater ponto.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {employee && (
        <Card>
          <CardContent className="pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Olá, {employee.full_name}</p>
              <p className="text-2xl font-bold flex items-center gap-2"><Clock className="h-5 w-5" /> {totalHours.toFixed(2)}h totais</p>
              {openEntry ? (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">Você está trabalhando desde {fmtDateTime((openEntry as { clock_in: string }).clock_in)}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum ponto aberto</p>
              )}
            </div>
            {openEntry ? (
              <Button onClick={clockOut} variant="destructive"><LogOut className="h-4 w-4 mr-2" /> Bater saída</Button>
            ) : (
              <Button onClick={clockIn}><LogIn className="h-4 w-4 mr-2" /> Bater entrada</Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader><TableRow>{isAdmin && <TableHead>Funcionário</TableHead>}<TableHead>Entrada</TableHead><TableHead>Saída</TableHead><TableHead>Horas</TableHead></TableRow></TableHeader>
            <TableBody>
              {(entries ?? []).map((e: { id: string; clock_in: string; clock_out: string | null; hours: number | null; employees: { full_name: string } | null }) => (
                <TableRow key={e.id}>
                  {isAdmin && <TableCell>{e.employees?.full_name ?? "—"}</TableCell>}
                  <TableCell>{fmtDateTime(e.clock_in)}</TableCell>
                  <TableCell>{fmtDateTime(e.clock_out)}</TableCell>
                  <TableCell>{e.hours ? `${Number(e.hours).toFixed(2)}h` : "—"}</TableCell>
                </TableRow>
              ))}
              {(entries ?? []).length === 0 && (
                <TableRow><TableCell colSpan={isAdmin ? 4 : 3} className="text-center py-8 text-muted-foreground">Nenhum registro</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}