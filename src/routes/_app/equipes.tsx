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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, UsersRound, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_app/equipes")({ component: Equipes });

function Equipes() {
  const { isAdmin, companyId } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [addTo, setAddTo] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState("");

  const { data: teams } = useQuery({
    queryKey: ["teams-full"],
    queryFn: async () => {
      const { data } = await supabase
        .from("teams")
        .select("id, name, created_at, team_members(id, employee_id, employees(id, full_name, role_title))")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => (await supabase.from("employees").select("id, full_name").eq("active", true).order("full_name")).data ?? [],
  });

  if (!isAdmin) return <p className="text-muted-foreground">Acesso restrito a administradores.</p>;

  const createTeam = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!companyId) return;
    const fd = new FormData(e.currentTarget);
    const res = await supabase.from("teams").insert({ name: String(fd.get("name")), company_id: companyId });
    if (res.error) return toast.error(res.error.message);
    toast.success("Equipe criada");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["teams-full"] });
    qc.invalidateQueries({ queryKey: ["teams"] });
  };

  const addMember = async () => {
    if (!addTo || !employeeId || !companyId) return;
    const res = await supabase.from("team_members").insert({ team_id: addTo, employee_id: employeeId, company_id: companyId });
    if (res.error) return toast.error(res.error.message);
    toast.success("Membro adicionado");
    setAddTo(null); setEmployeeId("");
    qc.invalidateQueries({ queryKey: ["teams-full"] });
  };

  const removeMember = async (id: string) => {
    await supabase.from("team_members").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["teams-full"] });
  };

  const removeTeam = async (id: string) => {
    if (!confirm("Excluir esta equipe?")) return;
    await supabase.from("teams").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["teams-full"] });
    qc.invalidateQueries({ queryKey: ["teams"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Equipes</h1>
          <p className="text-muted-foreground text-sm">Agrupe funcionários para metas compartilhadas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova equipe</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova equipe</DialogTitle></DialogHeader>
            <form onSubmit={createTeam} className="space-y-3">
              <div><Label>Nome</Label><Input name="name" required placeholder="Ex: Vendedores - Loja Centro" /></div>
              <DialogFooter><Button type="submit">Criar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {(teams ?? []).length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <UsersRound className="h-10 w-10 mx-auto mb-3 opacity-40" />
          Nenhuma equipe criada ainda.
        </CardContent></Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {(teams ?? []).map((t: { id: string; name: string; team_members: { id: string; employee_id: string; employees: { id: string; full_name: string; role_title: string } | null }[] }) => (
          <Card key={t.id}>
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <CardTitle className="text-base flex items-center gap-2"><UsersRound className="h-4 w-4" /> {t.name}</CardTitle>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setAddTo(t.id)}><UserPlus className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => removeTeam(t.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              {t.team_members.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum membro. Clique no ícone + para adicionar.</p>
              ) : (
                <ul className="space-y-2">
                  {t.team_members.map((tm) => (
                    <li key={tm.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                      <div>
                        <span className="font-medium">{tm.employees?.full_name ?? "—"}</span>
                        {tm.employees?.role_title && <Badge variant="outline" className="ml-2 text-xs">{tm.employees.role_title}</Badge>}
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => removeMember(tm.id)}><Trash2 className="h-4 w-4" /></Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!addTo} onOpenChange={(v) => { if (!v) { setAddTo(null); setEmployeeId(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar membro</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Funcionário</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {(employees ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter><Button onClick={addMember} disabled={!employeeId}>Adicionar</Button></DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}